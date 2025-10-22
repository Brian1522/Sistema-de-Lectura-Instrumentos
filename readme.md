# Sistema de Lectura de Instrumentos

Este proyecto contiene tres aplicaciones para leer datos de diferentes instrumentos de medición:

- **Balanza** (balanza.js) - Puerto: 3000
- **Refractómetro** (index.js) - Puerto: 3001  
- **Polarímetro** (app.js) - Puerto: 3002

## Requisitos del Sistema

### Software Necesario
- **Node.js** (versión 14 o superior)
- **npm** (incluido con Node.js)

### Hardware Requerido
- **Balanza**: Conectada al puerto serial COM4
- **Refractómetro**: IP 192.168.102.206, Puerto 23
- **Polarímetro**: IP 192.168.102.230, Puerto 23

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
cd c:\Users\brian\OneDrive\Escritorio\Sistema_Lecturas

# Instalar todas las dependencias
npm install express serialport cors axios @serialport/parser-readline
```

### 3. Dependencias del Proyecto

#### Dependencias Principales
- **express**: Framework web para Node.js
- **serialport**: Comunicación con puerto serial (balanza)
- **cors**: Habilita Cross-Origin Resource Sharing (para Oracle APEX)
- **axios**: Cliente HTTP para solicitudes
- **@serialport/parser-readline**: Parser para datos del puerto serial

#### Por Aplicación

**balanza.js**
```bash
npm install express serialport cors @serialport/parser-readline
```

**index.js (Refractómetro)**
```bash
npm install express cors
```

**app.js (Polarímetro)**
```bash
npm install express cors
```

## Ejecución

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


## Uso de las APIs

### 1. Balanza (Puerto 3000)

#### Interfaz Web
```
http://localhost:3000
```

#### API Endpoints

**Para Oracle APEX:**
```http
GET /lectura
# Respuesta:
{
  "value": 125.45
}
```

**Información completa:**
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
- **CORS habilitado** para Oracle APEX

### 2. Refractómetro (Puerto 3001)

#### API Endpoint

**Para Oracle APEX:**
```http
GET /lectura
# Respuesta:
{
  "value": 1.3456
}
```

#### Características
- Conexión TCP a 192.168.102.206:23
- Comando: "R\r\n"
- Guarda lecturas en refractometro.txt
- **CORS habilitado** para Oracle APEX

### 3. Polarímetro (Puerto 3002)

#### API Endpoints

**Para Oracle APEX:**
```http
GET /lectura
POST /lectura
# Respuesta:
{
  "value": 12.345
}
```

#### Características
- Conexión TCP a 192.168.102.230:23
- Comando: "R\r\n"
- Guarda lecturas en polarimetro.txt
- **CORS habilitado** para Oracle APEX
- Soporta métodos GET y POST

## Configuración

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
const REFRACTOMETER_IP = "192.168.102.206";
// En app.js (Polarímetro):
const POLARIMETER_IP = "192.168.102.230";
```

### Cambiar Puertos de Servidor
```javascript
// En cada archivo:
const PORT = 3000; 
```

##  Integración con Oracle APEX

### Configuración CORS
Todas las aplicaciones tienen **CORS habilitado** para permitir solicitudes desde Oracle APEX.

### URLs para APEX
```javascript
// Balanza
http://localhost:3000/lectura

// Refractómetro  
http://localhost:3001/lectura

// Polarímetro
http://localhost:3002/lectura
```

### Respuesta Estándar para APEX
Todos los endpoints `/lectura` devuelven el mismo formato:
```json
{
  "value": número
}
```

### Ejemplo de Accion Dinamica en APEX, esta accion va dentro del boton
```
---- PLSQL
DECLARE
    l_response CLOB;
    l_numero NUMBER;
BEGIN
    -- Llamar al endpoint del Rest Data Source
    BEGIN
        l_response := APEX_WEB_SERVICE.MAKE_REST_REQUEST(
            p_url => 'http://192.168.102.150:3001/lectura',
            p_http_method => 'GET'
        );
        APEX_DEBUG.INFO('Respuesta API: ' || SUBSTR(l_response, 1, 4000)); -- Depuración
    EXCEPTION
        WHEN OTHERS THEN
            APEX_DEBUG.ERROR('Error en MAKE_REST_REQUEST: ' || SQLERRM);
            :P3_BRIX := 'Error API: ' || SQLERRM; -- Mostrar error en el campo
            RETURN; -- Salir si falla la API
    END;
    
    -- Parsear el JSON y extraer el valor numérico
    BEGIN
        APEX_JSON.PARSE(l_response);
        l_numero := APEX_JSON.GET_NUMBER(p_path => 'value');
        APEX_DEBUG.INFO('Valor extraído: ' || l_numero); -- Depuración
    EXCEPTION
        WHEN OTHERS THEN
            APEX_DEBUG.ERROR('Error en parsing JSON: ' || SQLERRM);
            :P3_BRIX := 'Error JSON: ' || SQLERRM; -- Mostrar error en el campo
            RETURN; -- Salir si falla el parsing
    END;
    
    -- Asignar al campo numérico
    :P3_BRIX := l_numero;
    APEX_DEBUG.INFO('Valor asignado a P3_POL: ' || :P3_BRIX);
    
EXCEPTION
    WHEN OTHERS THEN
        :P3_BRIX := 'Error general: ' || SQLERRM;
        APEX_DEBUG.ERROR('Error general: ' || SQLERRM);
END;
```

## Archivos Generados

- `refractometro.txt` - Log de lecturas del refractómetro
- `polarimetro.txt` - Log de lecturas del polarímetro

## Solución de Problemas

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

## Estructura del Proyecto

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
npm install express serialport cors axios @serialport/parser-readline
```
