# Sistema de Lectura de Instrumentos

Este proyecto contiene tres aplicaciones para leer datos de diferentes instrumentos de medición:

- **Balanza** (balanza.js) - Puerto: 3000
- **Refractómetro** (index.js) - Puerto: 3001  
- **Polarímetro** (app.js) - Puerto: 3002

## 📋 Requisitos del Sistema

### Software Necesario
- **Node.js** (versión 14 o superior)
- **npm** (incluido con Node.js)

### Hardware Requerido
- **Balanza**: Conectada al puerto serial COM4
- **Refractómetro**: IP 192.168.102.204, Puerto 23
- **Polarímetro**: IP 192.168.102.208, Puerto 23

## 🔧 Instalación

### 1. Descargar Node.js
```bash
# Descargar desde: https://nodejs.org/
# Verificar instalación:
node --version
npm --version
```

### 2. Instalar Dependencias
```bash
# Navegar al directorio del proyecto
cd c:\Users\brian\OneDrive\Escritorio\prueba

# Instalar todas las dependencias
npm install express serialport
```

### 3. Dependencias por Aplicación

#### balanza.js
```bash
npm install express serialport
```

#### index.js (Refractómetro)
```bash
npm install express
```

#### app.js (Polarímetro)
```bash
npm install express
```

## 🚀 Ejecución

### Ejecutar Cada Aplicación por Separado

#### Balanza (Puerto 3000)
```bash
node balanza.js
# Servidor en http://localhost:3000
```

#### Refractómetro (Puerto 3001)
```bash
node index.js
# Servidor en http://localhost:3001
```

#### Polarímetro (Puerto 3002)
```bash
node app.js
# Servidor en http://localhost:3002
```


## 📖 Uso de las APIs

### 1. Balanza (Puerto 3000)

#### Interfaz Web
```
http://localhost:3000
```

#### API Endpoints
```http
GET /leer
# Respuesta exitosa:
{
  "peso": {
    "valor": "125.45",
    "unidad": "g"
  },
  "capturados": [...]
}
```

#### Características
- Lee 4 datos consecutivos para validar estabilidad
- Verifica consistencia con tolerancia del ±1%
- Rango válido: 0-500g
- Timeout de 3 segundos

### 2. Refractómetro (Puerto 3001)

#### API Endpoint
```http
GET /lectura
# Respuesta:
{
  "valor": "1.3456 nD",
  "fecha": "2024-01-01T10:00:00.000Z",
  "archivo": "refractometro.txt"
}
```

#### Características
- Conexión TCP a 192.168.102.204:23
- Comando: "R\r\n"
- Guarda lecturas en refractometro.txt

### 3. Polarímetro (Puerto 3002)

#### API Endpoint
```http
GET /lectura
# Respuesta:
{
  "valor": "+12.345°",
  "fecha": "2024-01-01T10:00:00.000Z",
  "archivo": "polarimetro.txt"
}
```

#### Características
- Conexión TCP a 192.168.102.208:23
- Comando: "R\r\n"
- Guarda lecturas en polarimetro.txt

## ⚙️ Configuración

### Modificar Puerto Serial (Balanza)
```javascript
// En balanza.js, línea 8:
const port = new SerialPort({
  path: "COM4", // ← Cambiar aquí
  baudRate: 9600,
  // ...
});
```

### Modificar IPs de Red
```javascript
// En index.js (Refractómetro):
const REFRACTOMETER_IP = "192.168.102.204"; // ← Cambiar aquí

// En app.js (Polarímetro):
const POLARIMETER_IP = "192.168.102.208"; // ← Cambiar aquí
```

### Cambiar Puertos de Servidor
```javascript
// En cada archivo:
const PORT = 3000; // ← Cambiar aquí
```

## 📁 Archivos Generados

- `refractometro.txt` - Log de lecturas del refractómetro
- `polarimetro.txt` - Log de lecturas del polarímetro

## 🔍 Solución de Problemas

### Error de Puerto Serial
```
Error: Opening COM4: Access denied
```
**Solución**: Verificar que el puerto esté disponible y cerrar otras aplicaciones que lo usen.

### Error de Conexión TCP
```
Error en la conexión: ETIMEDOUT
```
**Solución**: 
- Verificar que los instrumentos estén encendidos
- Confirmar las IPs en la red

### Puerto en Uso
```
Error: listen EADDRINUSE :::3000
```
**Solución**: Cambiar el puerto o cerrar la aplicación que lo está usando.

### Dependencias Faltantes
```
Error: Cannot find module 'serialport'
```
**Solución**: Ejecutar `npm install serialport`

## 📊 Estructura del Proyecto

```
├── balanza.js          # Aplicación de balanza
├── index.js            # Aplicación de refractómetro  
├── app.js              # Aplicación de polarímetro
├── public/
│   └── index.html      # Interfaz web para balanza
├── refractometro.txt   # Log de refractómetro (generado)
├── polarimetro.txt     # Log de polarímetro (generado)
├── package.json        # Configuración npm (crear si no existe)
└── readme.md           # Este archivo
```

# Instalar todas las dependencias de una vez
npm install express serialport
```
