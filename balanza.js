const express = require("express");
const { SerialPort, ReadlineParser } = require("serialport");

const app = express();
const PORT = 3000;

const port = new SerialPort({
  path: "COM4",
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

// Función  para limpiar dato → { valor, unidad }
function parseDato(dato) {
  const limpio = dato.trim();

  // Extraer número
  const num = parseFloat(limpio.replace(/[^\d.-]/g, ""));
  
  // Extraer unidad (lo que sean letras)
  const unidadMatch = limpio.match(/[a-zA-Z]+/);
  const unidad = unidadMatch ? unidadMatch[0] : null;

  if (isNaN(num)) return null;

  return {
    valor: num,
    unidad: unidad || "g" // si no encuentra, por defecto "g"
  };
}

// Endpoint: leer dato estable bajo demanda
app.get("/leer", async (req, res) => {
  let datosCapturados = [];

  // Handler para recolectar 4 datos nuevos
  const onData = (linea) => {
    const dato = linea.trim();
    datosCapturados.push(dato);

    if (datosCapturados.length >= 4) {
      parser.off("data", onData); // detener listener
      evaluarDatos(datosCapturados, res);
    }
  };

  // Escuchar desde este momento
  parser.on("data", onData);

  // Seguridad: timeout de 3 segundos
  setTimeout(() => {
    if (datosCapturados.length < 4) {
      parser.off("data", onData);
      res.status(408).json({ error: "No se recibieron suficientes datos en el tiempo límite." });
    }
  }, 3000);
});

// Función para evaluar datos
function evaluarDatos(datos, res) {
  const objetos = datos.map(parseDato).filter((o) => o !== null);

  // Validar rango (0 - 500g)
  const enRango = objetos.filter((o) => o.valor > 0 && o.valor <= 500);
  if (enRango.length < 4) {
    return res.status(400).json({ error: "Los datos no están en el rango válido (0 - 500g)." });
  }

  // Verificar consistencia (±1%)
  const ref = enRango[0].valor;
  const coincidencias = enRango.filter((o) => {
    const diff = Math.abs(o.valor - ref);
    return diff <= ref * 0.01; // dentro del 1%
  });

  if (coincidencias.length >= 3) {
    return res.json({
      peso: {
        valor: ref.toFixed(2),
        unidad: enRango[0].unidad
      },
      capturados: enRango // 👈 también devuelve los 4 datos para debug
    });
  } else {
    return res.status(400).json({ error: "No hay consistencia suficiente en los últimos datos.", capturados: enRango });
  }
}

app.use(express.static("public")); // servir frontend

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
