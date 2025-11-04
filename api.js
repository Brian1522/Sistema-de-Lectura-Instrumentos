const express = require("express");
const { SerialPort, ReadlineParser } = require("serialport");
const net = require("net");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3004; // Puerto unificado

// Configurar CORS para permitir solicitudes desde Oracle APEX
app.use(cors({
  origin: "*", // En producción, especifica tu dominio de APEX
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware para parsear JSON
app.use(express.json());

// ========================================
// CONFIGURACIÓN BALANZA
// ========================================

// Variable global para el puerto serial (se abrirá bajo demanda)
let serialPortInstance = null;
let serialParser = null;

// Función para abrir el puerto serial si no está abierto
function getSerialPort() {
  return new Promise((resolve, reject) => {
    if (serialPortInstance && serialPortInstance.isOpen) {
      resolve({ port: serialPortInstance, parser: serialParser });
      return;
    }

    serialPortInstance = new SerialPort({
      path: "COM4",
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });

    serialParser = serialPortInstance.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    serialPortInstance.on('open', () => {
      console.log("Puerto serial COM4 abierto para balanza");
      resolve({ port: serialPortInstance, parser: serialParser });
    });

    serialPortInstance.on('error', (err) => {
      console.error("Error abriendo puerto serial:", err.message);
      reject(err);
    });
  });
}

// Función para cerrar el puerto serial
function closeSerialPort() {
  return new Promise((resolve) => {
    if (serialPortInstance && serialPortInstance.isOpen) {
      serialPortInstance.close(() => {
        console.log("Puerto serial COM4 cerrado");
        serialPortInstance = null;
        serialParser = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Función para limpiar dato de balanza
function parseDatoBalanza(dato) {
  const limpio = dato.trim();
  const num = parseFloat(limpio.replace(/[^\d.-]/g, ""));
  const unidadMatch = limpio.match(/[a-zA-Z]+/);
  const unidad = unidadMatch ? unidadMatch[0] : null;

  if (isNaN(num)) return null;

  return {
    valor: num,
    unidad: unidad || "g"
  };
}

// Función para leer balanza
async function leerBalanza() {
  const { parser } = await getSerialPort();
  
  return new Promise((resolve, reject) => {
    let datosCapturados = [];
    const timeout = setTimeout(() => {
      parser.off("data", onData);
      closeSerialPort().then(() => {
        reject(new Error("Timeout: No se recibieron suficientes datos en el tiempo límite"));
      });
    }, 5000);

    const onData = (linea) => {
      const dato = linea.trim();
      datosCapturados.push(dato);

      if (datosCapturados.length >= 4) {
        clearTimeout(timeout);
        parser.off("data", onData);
        
        // Procesar datos
        const objetos = datosCapturados.map(parseDatoBalanza).filter((o) => o !== null);
        const enRango = objetos.filter((o) => o.valor > 0 && o.valor <= 500);
        
        if (enRango.length < 4) {
          closeSerialPort().then(() => {
            reject(new Error("Los datos no están en el rango válido (0 - 500g)"));
          });
          return;
        }

        const ref = enRango[0].valor;
        const coincidencias = enRango.filter((o) => {
          const diff = Math.abs(o.valor - ref);
          return diff <= ref * 0.01;
        });

        closeSerialPort().then(() => {
          if (coincidencias.length >= 3) {
            resolve(parseFloat(ref.toFixed(2)));
          } else {
            reject(new Error("No hay consistencia suficiente en los datos"));
          }
        });
      }
    };

    parser.on("data", onData);
  });
}

// ========================================
// CONFIGURACIÓN REFRACTÓMETRO
// ========================================

const REFRACTOMETER_IP = "192.168.102.230";
const REFRACTOMETER_PORT = 23;
const REFRACTOMETER_LOG = path.join(__dirname, "refractometro.txt");

function leerRefractometro() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const CR = "\r";
    const LF = "\n";
    const COMMAND = "R" + CR + LF;

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("Timeout: Conexión con refractómetro"));
    }, 10000);

    client.connect(REFRACTOMETER_PORT, REFRACTOMETER_IP, () => {
      console.log("Conectado al refractómetro");
      client.write(COMMAND);
    });

    client.on("data", (data) => {
      clearTimeout(timeout);
      const response = data.toString().trim();
      console.log("Lectura refractómetro recibida:", response);
      
      // Guardar en archivo
      const fechaHora = new Date().toISOString().replace("T", " ").split(".")[0];
      const linea = `[${fechaHora}] Lectura: ${response}\n`;
      fs.appendFileSync(REFRACTOMETER_LOG, linea, "utf8");

      client.destroy();
      
      if (response.includes("Cancelled")) {
        reject(new Error("Lectura cancelada por el usuario"));
      } else {
        const numero = parseFloat(response);
        if (isNaN(numero)) {
          reject(new Error(`No se pudo extraer un número válido de: ${response}`));
        } else {
          resolve(numero);
        }
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Error en conexión refractómetro:", err.message);
      reject(err);
    });

    client.on("close", () => {
      console.log("Conexión refractómetro cerrada");
    });
  });
}

// ========================================
// CONFIGURACIÓN POLARÍMETRO
// ========================================

const POLARIMETER_IP = "192.168.102.229";
const POLARIMETER_PORT = 23;
const POLARIMETER_LOG = path.join(__dirname, "polarimetro.txt");

function leerPolarimetro() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const CR = "\r";
    const LF = "\n";
    const COMMAND = "R" + CR + LF;

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("Timeout: Conexión con polarímetro"));
    }, 10000);

    client.connect(POLARIMETER_PORT, POLARIMETER_IP, () => {
      console.log("Conectado al polarímetro");
      client.write(COMMAND);
    });

    client.on("data", (data) => {
      clearTimeout(timeout);
      const response = data.toString().trim();
      console.log("Lectura polarímetro recibida:", response);
      
      // Limpiar la respuesta - tomar solo la primera línea
      const lineas = response.split(/[\r\n]+/).filter(linea => linea.trim());
      const lecturaLimpia = lineas[0] || response;
      
      // Guardar en archivo
      const fechaHora = new Date().toLocaleString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      const linea = `[${fechaHora}] ${lecturaLimpia}\n`;
      fs.appendFileSync(POLARIMETER_LOG, linea, "utf8");

      client.destroy();
      
      if (response.includes("Cancelled")) {
        reject(new Error("Lectura cancelada por el usuario"));
      } else {
        // Extraer el número de manera flexible
        let numero;
        if (lecturaLimpia.includes(',')) {
          numero = parseFloat(lecturaLimpia.split(',')[2]);
        } else {
          numero = parseFloat(lecturaLimpia);
        }
        
        if (isNaN(numero)) {
          reject(new Error(`No se pudo extraer un número válido de: ${lecturaLimpia}`));
        } else {
          resolve(numero);
        }
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.error("Error en conexión polarímetro:", err.message);
      reject(err);
    });

    client.on("close", () => {
      console.log("Conexión polarímetro cerrada");
    });
  });
}

// ========================================
// ENDPOINTS UNIFICADOS
// ========================================

// Endpoint para Balanza
app.get("/balanza", async (req, res) => {
  try {
    console.log("Iniciando lectura de balanza...");
    const valor = await leerBalanza();
    console.log(`Balanza: ${valor}g`);
    res.json({ value: valor });
  } catch (err) {
    console.error("Error balanza:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para Refractómetro
app.get("/refractometro", async (req, res) => {
  try {
    console.log("Iniciando lectura de refractómetro...");
    const valor = await leerRefractometro();
    console.log(`Refractómetro: ${valor}`);
    res.json({ value: valor });
  } catch (err) {
    console.error("Error refractómetro:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para Polarímetro
app.get("/polarimetro", async (req, res) => {
  try {
    console.log("Iniciando lectura de polarímetro...");
    const valor = await leerPolarimetro();
    console.log(`Polarímetro: ${valor}`);
    res.json({ value: valor });
  } catch (err) {
    console.error("Error polarímetro:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para verificar estado del servicio
app.get("/status", (req, res) => {
  res.json({
    service: "API Unificada Sistema de Lecturas",
    port: PORT,
    timestamp: new Date().toISOString(),
    endpoints: {
      balanza: `http://localhost:${PORT}/balanza`,
      refractometro: `http://localhost:${PORT}/refractometro`,
      polarimetro: `http://localhost:${PORT}/polarimetro`
    },
    status: "OK"
  });
});

// Middleware para servir archivos estáticos
app.use(express.static("public"));

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error global:", err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log("\n Cerrando servidor...");
  await closeSerialPort();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("\n Cerrando servidor...");
  await closeSerialPort();
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log(" API UNIFICADA SISTEMA DE LECTURAS");
  console.log("=".repeat(60));
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  console.log("");
  console.log(" Endpoints disponibles:");
  console.log(`    Balanza:       GET http://localhost:${PORT}/balanza`);
  console.log(`    Refractómetro: GET http://localhost:${PORT}/refractometro`);
  console.log(`    Polarímetro:   GET http://localhost:${PORT}/polarimetro`);
  console.log(`    Estado:        GET http://localhost:${PORT}/status`);
  console.log("");
  console.log("    Configuración:");
  console.log("   • Balanza: COM4 (9600 baud)");
  console.log("   • Refractómetro: 192.168.102.212:23");
  console.log("   • Polarímetro: 192.168.102.220:23");
  console.log("");
  console.log("✅ Listo para recibir solicitudes...");
  console.log("=".repeat(60));
});
