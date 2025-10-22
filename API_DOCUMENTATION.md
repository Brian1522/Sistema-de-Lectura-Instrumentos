# API Sistema de Lecturas - Documentación para Oracle APEX

## Resumen General

Este sistema incluye **tres instrumentos de medición** con APIs REST compatibles con Oracle APEX:

- **Balanza** (Puerto 3000) - Comunicación Serial COM4
- **Refractómetro** (Puerto 3001) - TCP 192.168.102.206:23  
- **Polarímetro** (Puerto 3002) - TCP 192.168.102.230:23

**Todas las APIs** están configuradas con **CORS habilitado** y devuelven el formato estándar `{"value": número}` para Oracle APEX.

## Endpoints Principales

### 1. Balanza (Puerto 3000)

#### Obtener Lectura para APEX
**URL:** `http://localhost:3000/lectura`
**Método:** GET
**Respuesta:**
```json
{
  "value": 125.45
}
```

#### Obtener Información Completa
**URL:** `http://localhost:3000/leer`
**Método:** GET
**Respuesta:**
```json
{
  "peso": {
    "valor": "125.45",
    "unidad": "g"
  },
  "capturados": [...]
}
```

### 2. Refractómetro (Puerto 3001)

#### Obtener Lectura para APEX
**URL:** `http://localhost:3001/lectura`
**Método:** GET
**Respuesta:**
```json
{
  "value": 1.3456
}
```

### 3. Polarímetro (Puerto 3002)

#### Obtener Lectura para APEX (GET)
**URL:** `http://localhost:3002/lectura`
**Método:** GET
**Respuesta:**
```json
{
  "value": 12.345
}
```

#### Obtener Lectura para APEX (POST)
**URL:** `http://localhost:3002/lectura`
**Método:** POST
**Respuesta:**
```json
{
  "value": 12.345
}
```

## Características Técnicas

### Balanza
- **Protocolo:** Puerto Serial COM4
- **Validación:** 4 lecturas consecutivas con ±1% tolerancia
- **Rango:** 0-500g
- **Timeout:** 3 segundos

### Refractómetro
- **Protocolo:** TCP/IP
- **IP:** 192.168.102.206
- **Puerto:** 23
- **Comando:** "R\r\n"
- **Archivo Log:** refractometro.txt

### Polarímetro
- **Protocolo:** TCP/IP
- **IP:** 192.168.102.230
- **Puerto:** 23
- **Comando:** "R\r\n"
- **Archivo Log:** polarimetro.txt
- **Métodos:** GET y POST

## Configuración en Oracle APEX

### Paso 1: Crear Web Source Modules

Crear **tres Web Source Modules separados** para cada instrumento:

#### 1. Balanza Web Source
- **Name:** `Sistema_Balanza`
- **URL Endpoint:** `http://localhost:3000/`
- **Authentication:** No Authentication

#### 2. Refractómetro Web Source
- **Name:** `Sistema_Refractometro`
- **URL Endpoint:** `http://localhost:3001/`
- **Authentication:** No Authentication

#### 3. Polarímetro Web Source
- **Name:** `Sistema_Polarimetro`
- **URL Endpoint:** `http://localhost:3002/`
- **Authentication:** No Authentication

### Paso 2: Configurar Operations

Para **cada Web Source Module**, crear la operación:

#### Operación: Obtener Lectura
- **URL Pattern:** `lectura`
- **HTTP Method:** GET (POST también disponible para Polarímetro)
- **Response Type:** JSON

### Paso 3: Implementar en APEX

#### Método 1: Proceso de Página PL/SQL

```plsql
DECLARE
    l_response CLOB;
    l_valor NUMBER;
BEGIN
    -- Ejemplo para Balanza (Puerto 3000)
    l_response := apex_web_service.make_rest_request(
        p_url => 'http://localhost:3000/lectura',
        p_http_method => 'GET',
        p_transfer_timeout => 30
    );
    
    -- Extraer valor numérico directamente
    SELECT JSON_VALUE(l_response, '$.value')
    INTO l_valor
    FROM DUAL;
    
    -- Asignar a campo de página
    :P1_PESO_BALANZA := l_valor;
    :P1_TIMESTAMP := SYSTIMESTAMP;
    
    apex_application.g_print_success_message := 
        'Lectura obtenida: ' || TO_CHAR(l_valor, '999G999D99') || ' g';
        
EXCEPTION
    WHEN OTHERS THEN
        apex_error.add_error(
            p_message => 'Error al obtener lectura de balanza: ' || SQLERRM
        );
END;
```




#### Método 3: REST Data Source (Reporte en tiempo real)

1. **Crear REST Data Source:**
   - **Type:** REST Enabled SQL Service
   - **URL:** `http://localhost:3000/lectura`
   - **Method:** GET

2. **Configurar columnas:**
   - **value** → NUMBER

3. **Crear región de reporte** usando el REST Data Source

## Configuraciones de Seguridad

### CORS Configurado
Todos los servicios tienen CORS habilitado con:
```javascript
app.use(cors({
  origin: "*", // Cambiar en producción
  methods: ["GET"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
```

### Para Producción:
```javascript
// Configuración CORS específica por dominio
app.use(cors({
  origin: "https://tu-apex-domain.com",
  credentials: true,
  methods: ["GET", "POST"]
}));
```

## Ejemplos de Respuestas

### Respuesta Exitosa (Todos los instrumentos)
```json
{
  "value": 123.45
}
```

### Respuesta de Error
```json
{
  "error": "No se pudo extraer un número válido de: texto_recibido"
}
```

### Respuesta de Error de Conexión
```json
{
  "success": false,
  "error": "Error en la conexión: ETIMEDOUT"
}
```

## Resolución de Problemas

### 1. Error de CORS
**Problema:** `Access to fetch at 'http://localhost:3000' from origin 'https://apex.domain.com' has been blocked by CORS policy`
**Solución:** Verificar configuración CORS y agregar el dominio específico

### 2. Error de Conexión
**Problema:** `Error: connect ECONNREFUSED 127.0.0.1:3000`
**Solución:** 
- Verificar que el servidor esté corriendo: `node balanza.js`
- Comprobar que el puerto esté disponible
- Para balanza: verificar conexión COM4

### 3. Timeout en APEX
**Problema:** Solicitud se queda colgada
**Solución:** Aumentar timeout en APEX:
```plsql
l_response := apex_web_service.make_rest_request(
    p_url => 'http://localhost:3000/lectura',
    p_http_method => 'GET',
    p_transfer_timeout => 60  -- Aumentar a 60 segundos
);
```

### 4. Error de Hardware
**Balanza:** Verificar cable USB y puerto COM4
**Instrumentos TCP:** Verificar IPs 192.168.102.206 y 192.168.102.230

## 📋 Lista de Verificación APEX

- [ ] Web Source Modules creados para cada instrumento
- [ ] Operations configuradas con método GET
- [ ] Timeout configurado apropiadamente (30-60 segundos)
- [ ] Manejo de errores implementado
- [ ] Campos de página configurados para recibir valores numéricos
- [ ] Servidores de instrumentos ejecutándose en puertos correctos