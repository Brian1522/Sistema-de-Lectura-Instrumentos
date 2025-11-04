const express = require("express");
const net = require("net");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Configurar CORS para permitir solicitudes desde Oracle APEX
app.use(cors({
  origin: "*", // En producción, especifica tu dominio de APEX
  methods: ["GET"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware para parsear JSON
app.use(express.json());

// Configuración del refractómetro
const REFRACTOMETER_IP = "192.168.102.203";
const REFRACTOMETER_PORT = 23;
// Definir constantes según documentación RFM700-M
const CR = "\r";  // Carriage Return, ASCII decimal 13
const LF = "\n";  // Line Feed, ASCII decimal 10

// Comando para pedir lectura según documentación RFM700-M
const COMMAND = "R" + CR + LF; // Comando "R" seguido de CR+LF


// Ruta del archivo donde guardaremos las lecturas
const LOG_FILE = path.join(__dirname, "refractometro.txt");

// Función que se conecta al refractómetro y obtiene la lectura
function getReading() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.connect(REFRACTOMETER_PORT, REFRACTOMETER_IP, () => {
      console.log("Conectado al refractómetro");
      client.write(COMMAND); // enviamos el comando
    });

    client.on("data", (data) => {
      const response = data.toString().trim();
      //console.log("Lectura recibida:", response);
      console.clear();
      
      // Verificar si la respuesta es válida según documentación RFM700-M
      if (response.includes("Cancelled")) {
        console.log("Lectura cancelada por el usuario");
      } else {
        console.log("Lectura recibida:", response);
        // El formato debería ser [reading]<CR><LF> según la documentación
      }

      client.destroy(); // cerramos conexión
      resolve(response);
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
  const fechaHora = new Date().toISOString().replace("T", " ").split(".")[0];
  const linea = `[${fechaHora}] Lectura: ${lectura}\n`;

  fs.appendFileSync(LOG_FILE, linea, "utf8");
}

// Endpoint para obtener una nueva lectura
app.get("/lectura", async (req, res) => {
  try {
    const lectura = await getReading();
    guardarEnArchivo(lectura);

    // Extraer el valor numérico de la lectura
    let numero = parseFloat(lectura);
    
    // Verificar que el número es válido
    if (isNaN(numero)) {
      throw new Error(`No se pudo extraer un número válido de: ${lectura}`);
    }

    res.json({
      value: numero,
      // valor: lectura,
      // fecha: new Date().toISOString(),
      // archivo: LOG_FILE,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servidor escuchando
app.listen(PORT, () => {
  console.log(`Servidor API escuchando en http://localhost:${PORT}`);
});
