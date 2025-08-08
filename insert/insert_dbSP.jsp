<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ page import="javax.naming.*" %>
<%@ page import="java.math.BigDecimal" %>
<%@ page import="java.util.concurrent.TimeUnit" %>

<%
// Configuración para evitar el caché del navegador y proxies
response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
response.setHeader("Pragma", "no-cache");    // HTTP 1.0.
response.setDateHeader("Expires", 0);        // Proxies.

String method = request.getParameter("method");
String idStr = request.getParameter("id_producto");
String descripcion = request.getParameter("descripcion");
String precioStr = request.getParameter("precio");
String fechaStr = request.getParameter("fecha");

String resultOutput = "0,Error al insertar registros por SP."; // Default error
Connection conn = null;
CallableStatement cstmt = null; // Usar CallableStatement para SP
long startTime = System.nanoTime(); // Iniciar medición de tiempo

System.out.println("--- INICIO DEPURACIÓN insert-databaseSP.jsp ---");
System.out.println("SP - Método: " + method + ", ID: " + idStr + ", Desc: " + descripcion + ", Precio: " + precioStr + ", Fecha: " + fechaStr);

try {
    // Validaciones de entrada
    if (idStr == null || idStr.trim().isEmpty() ||
        descripcion == null || descripcion.trim().isEmpty() ||
        precioStr == null || precioStr.trim().isEmpty() ||
        fechaStr == null || fechaStr.trim().isEmpty()) {
        resultOutput = "0,Error de validación: Todos los campos son obligatorios.";
        out.print(resultOutput);
        System.err.println("SP - Campos obligatorios vacíos.");
        return;
    }

    String id_producto = idStr.trim(); 

    BigDecimal precio;
    try {
        precio = new BigDecimal(precioStr.trim());
    } catch (NumberFormatException e) {
        resultOutput = "0,Error de formato: El precio debe ser un número válido.";
        out.print(resultOutput);
        System.err.println("SP - NumberFormatException para Precio: " + precioStr + " - " + e.getMessage());
        return;
    }

    Date fechaSql;
    try {
        fechaSql = Date.valueOf(fechaStr.trim());
    } catch (IllegalArgumentException e) {
        resultOutput = "0,Error de formato: La fecha debe ser AAAA-MM-DD.";
        out.print(resultOutput);
        System.err.println("SP - IllegalArgumentException para Fecha: " + fechaStr + " - " + e.getMessage());
        return;
    }

    Context initCtx = new InitialContext();
    DataSource ds = null;
    String dbName = "";
    String spCall = ""; 

    switch (method.toLowerCase()) {
        case "oracle":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/OracleDS");
            dbName = "Oracle 23ai";
            
            spCall = "{call PA_INSERTARPRODUCTO(?, ?, ?, ?)}"; 
            break;
        case "postgres":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/PostgresDS");
            dbName = "PostgreSQL";
        
            spCall = "CALL PA_INSERTARPRODUCTO(?::VARCHAR, ?::VARCHAR, ?::NUMERIC, ?::DATE)"; 
            break;
        case "sqlserver":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/SQLServerDS");
            dbName = "SQL Server 2022";
            
            spCall = "{call PA_INSERTARPRODUCTO (?, ?, ?, ?)}"; 
            break;
        case "mysql":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/MySQLDS");
            dbName = "MySQL";
            
            spCall = "{call PA_INSERTARPRODUCTO(?, ?, ?, ?)}"; 
            break;
        default:
            resultOutput = "0,Método de base de datos no reconocido para insertar por SP: " + method;
            out.print(resultOutput);
            System.err.println("SP - Método no reconocido: " + method);
            return;
    }

    if (ds != null) {
        conn = ds.getConnection();
        cstmt = conn.prepareCall(spCall);
        cstmt.setString(1, id_producto); 
        cstmt.setString(2, descripcion);
        cstmt.setBigDecimal(3, precio);
        cstmt.setDate(4, fechaSql);

        cstmt.execute(); // Ejecutar el procedimiento almacenado
        long endTime = System.nanoTime();
        long durationMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);

        resultOutput = "1,Registro insertado por SP en " + dbName + ". Tiempo: " + durationMs + "ms";
        System.out.println("SP - Registro insertado en " + dbName + ". Tiempo: " + durationMs + "ms");
        
    } else {
        resultOutput = "0,Error: DataSource no encontrado para " + dbName;
        System.err.println("SP - DataSource no encontrado para " + dbName);
    }

} catch (SQLException e) {
    if (e.getSQLState() != null && e.getSQLState().startsWith("23")) { // Violación de PK
        resultOutput = "0,Error SQL: El ID de producto ya existe en " + method + ". (SP)";
    } else {
        resultOutput = "0,Error SQL al insertar por SP en " + method + ": " + e.getMessage();
    }
    System.err.println("Error en insert-databaseSP.jsp (SQLException): " + e.getMessage());
    e.printStackTrace(System.err);
} catch (NamingException e) {
    resultOutput = "0,Error de configuración JNDI para insertar por SP en " + method + ": " + e.getMessage();
    System.err.println("Error en insert-databaseSP.jsp (NamingException): " + e.getMessage());
    e.printStackTrace(System.err);
} catch (Exception e) {
    resultOutput = "0,Error inesperado al insertar por SP en " + method + ": " + e.getMessage();
    System.err.println("Error en insert-databaseSP.jsp (General Exception): " + e.getMessage());
    e.printStackTrace(System.err);
} finally {
    if (cstmt != null) try { cstmt.close(); } catch (SQLException e) { System.err.println("SP - Error al cerrar CallableStatement: " + e.getMessage()); }
    if (conn != null) try { conn.close(); } catch (SQLException e) { System.err.println("SP - Error al cerrar Connection: " + e.getMessage()); }
    System.out.println("--- FIN DEPURACIÓN insert-databaseSP.jsp ---");
}

out.print(resultOutput); // Imprime la respuesta final
%>
