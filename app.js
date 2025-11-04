const express = require("express");
const net = require("net");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3002;

// Configurar CORS para permitir solicitudes desde Oracle APEX
app.use(cors({
  origin: "*", // En producción, especifica tu dominio de APEX
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware para parsear JSON
app.use(express.json());

// Configuración del polarímetro
const POLARIMETER_IP = "192.168.102.195";
const POLARIMETER_PORT = 23;
// Definir constantes según documentación
const CR = "\r";  // Carriage Return, ASCII decimal 13
const LF = "\n";  // Line Feed, ASCII decimal 10

// Comando para pedir lectura según documentación
const COMMAND = "R" + CR + LF; // Comando "R" seguido de CR+LF


// Ruta del archivo donde guardaremos las lecturas
const LOG_FILE = path.join(__dirname, "polarimetro.txt");

// Función que se conecta al polarímetro y obtiene la lectura
function getReading() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(POLARIMETER_PORT, POLARIMETER_IP, () => {
      console.log("Conectado al polarímetro");
      client.write(COMMAND); // enviamos el comando
    });

    client.on("data", (data) => {
      const response = data.toString().trim();
      console.clear();

      // Limpiar la respuesta - tomar solo la primera línea con los datos principales
      const lineas = response.split(/[\r\n]+/).filter(linea => linea.trim());
      const lecturaLimpia = lineas[0] || response; // Usar la primera línea válida

      // Verificar si la respuesta es válida según documentación
      if (response.includes("Cancelled")) {
        console.log("Lectura cancelada por el usuario");
        resolve("Lectura cancelada");
      } else {
        console.log("Lectura recibida:", lecturaLimpia);
        console.log("Datos completos recibidos:", response); // Para debug
      }

      client.destroy(); // cerramos conexión
      resolve(lecturaLimpia);
    });

    client.on("error", (err) => {
      console.error("Error en la conexión:", err.message);
      reject(err);
    });

    client.on("close", () => {
      console.log("Conexión cerrada");
    });
  });
}

// Función para guardar la lectura en el archivo TXT
function guardarEnArchivo(lectura) {
  const fechaHora = new Date().toLocaleString('es-ES', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  // Solo guardar la línea principal, sin duplicados
  const linea = `[${fechaHora}] ${lectura}\n`;

  fs.appendFileSync(LOG_FILE, linea, "utf8");
}

// Endpoint GET para obtener solo el valor numérico
app.get("/lectura", async (req, res) => {
  try {
    const lectura = await getReading();
    guardarEnArchivo(lectura);
    
    // Extraer el número de la lectura de manera más flexible
    let numero;
    if (lectura.includes(',')) {
      // Si contiene comas, usar el formato anterior
      numero = parseFloat(lectura.split(',')[2]);
    } else {
      // Si es un número simple, parsearlo directamente
      numero = parseFloat(lectura);
    }
    
    // Verificar que el número es válido
    if (isNaN(numero)) {
      throw new Error(`No se pudo extraer un número válido de: ${lectura}`);
    }
    
    res.json({ value: numero });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint POST para obtener solo el valor numérico
app.post("/lectura", async (req, res) => {
  try {
    const lectura = await getReading();
    guardarEnArchivo(lectura);
    const numero = parseFloat(lectura.split(',')[2]); // Extrae 0.07
    res.json({ value: numero }); // Devuelve { "value": 0.07 }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Servidor escuchando
app.listen(PORT, () => {
  console.log(`Servidor API escuchando en http://localhost:${PORT}`);
});
