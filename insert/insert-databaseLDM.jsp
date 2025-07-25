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

String resultOutput = "0,Error al insertar registros LDM."; // Default error
Connection conn = null;
PreparedStatement pstmt = null;
long startTime = System.nanoTime(); // Iniciar medición de tiempo

System.out.println("--- INICIO DEPURACIÓN insert-databaseLDM.jsp ---");
System.out.println("LDM - Método: " + method + ", ID: " + idStr + ", Desc: " + descripcion + ", Precio: " + precioStr + ", Fecha: " + fechaStr);

try {
    // Validaciones de entrada (CRUCIALES para evitar NumberFormatException y otros)
    if (idStr == null || idStr.trim().isEmpty() ||
        descripcion == null || descripcion.trim().isEmpty() ||
        precioStr == null || precioStr.trim().isEmpty() ||
        fechaStr == null || fechaStr.trim().isEmpty()) {
        resultOutput = "0,Error de validación: Todos los campos son obligatorios.";
        out.print(resultOutput);
        System.err.println("LDM - Campos obligatorios vacíos.");
        return;
    }

    int id_producto;
    try {
        id_producto = Integer.parseInt(idStr.trim());
    } catch (NumberFormatException e) {
        resultOutput = "0,Error de formato: El ID debe ser un número entero.";
        out.print(resultOutput);
        System.err.println("LDM - NumberFormatException para ID: " + idStr + " - " + e.getMessage());
        return;
    }

    BigDecimal precio;
    try {
        precio = new BigDecimal(precioStr.trim());
    } catch (NumberFormatException e) {
        resultOutput = "0,Error de formato: El precio debe ser un número válido.";
        out.print(resultOutput);
        System.err.println("LDM - NumberFormatException para Precio: " + precioStr + " - " + e.getMessage());
        return;
    }

    Date fechaSql;
    try {
        // Asumiendo formato AAAA-MM-DD
        fechaSql = Date.valueOf(fechaStr.trim()); 
    } catch (IllegalArgumentException e) { // Catches error from Date.valueOf
        resultOutput = "0,Error de formato: La fecha debe ser AAAA-MM-DD.";
        out.print(resultOutput);
        System.err.println("LDM - IllegalArgumentException para Fecha: " + fechaStr + " - " + e.getMessage());
        return;
    }


    Context initCtx = new InitialContext();
    DataSource ds = null;
    String dbName = "";
    // Asegúrate de que esta query sea compatible con TODAS tus bases de datos
    String sql = "INSERT INTO PRODUCTO (ID_PRODUCTO, DESCRIPCION, PRECIO, FECHA) VALUES (?, ?, ?, ?)"; 

    switch (method.toLowerCase()) {
        case "oracle":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/OracleDS");
            dbName = "Oracle";
            break;
        case "postgres":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/PostgresDS");
            dbName = "PostgreSQL";
            break;
        case "sqlserver":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/SQLServerDS");
            dbName = "SQL Server";
            break;
        case "mysql":
            ds = (DataSource) initCtx.lookup("java:comp/env/jdbc/MySQLDS");
            dbName = "MySQL";
            break;
        default:
            resultOutput = "0,Método de base de datos no reconocido para insertar LDM: " + method;
            out.print(resultOutput);
            System.err.println("LDM - Método no reconocido: " + method);
            return;
    }

    if (ds != null) {
        conn = ds.getConnection();
        pstmt = conn.prepareStatement(sql);
        pstmt.setInt(1, id_producto);
        pstmt.setString(2, descripcion);
        pstmt.setBigDecimal(3, precio);
        pstmt.setDate(4, fechaSql); // Usar java.sql.Date

        int rowsAffected = pstmt.executeUpdate();
        long endTime = System.nanoTime();
        long durationMs = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);

        if (rowsAffected > 0) {
            resultOutput = "1,Registro insertado en " + dbName + ". Tiempo: " + durationMs + "ms";
            System.out.println("LDM - Registro insertado en " + dbName + ". Tiempo: " + durationMs + "ms");
        } else {
            resultOutput = "0,No se pudo insertar el registro en " + dbName + ".";
            System.err.println("LDM - No se pudo insertar registro en " + dbName + ". rowsAffected: " + rowsAffected);
        }
    } else {
        resultOutput = "0,Error: DataSource no encontrado para " + dbName;
        System.err.println("LDM - DataSource no encontrado para " + dbName);
    }

} catch (SQLException e) {
    // Código de estado SQL para violación de restricción de integridad (ej. clave primaria duplicada)
    // Puede variar ligeramente entre bases de datos, pero los que empiezan con '23' son comunes.
    if (e.getSQLState() != null && e.getSQLState().startsWith("23")) { 
        resultOutput = "0,Error SQL: El ID de producto ya existe en " + method + ".";
    } else {
        resultOutput = "0,Error SQL al insertar LDM en " + method + ": " + e.getMessage();
    }
    System.err.println("Error en insert-databaseLDM.jsp (SQLException): " + e.getMessage());
    e.printStackTrace(System.err);
} catch (NamingException e) {
    resultOutput = "0,Error de configuración JNDI para insertar LDM en " + method + ": " + e.getMessage();
    System.err.println("Error en insert-databaseLDM.jsp (NamingException): " + e.getMessage());
    e.printStackTrace(System.err);
} catch (Exception e) {
    resultOutput = "0,Error inesperado al insertar LDM en " + method + ": " + e.getMessage();
    System.err.println("Error en insert-databaseLDM.jsp (General Exception): " + e.getMessage());
    e.printStackTrace(System.err);
} finally {
    if (pstmt != null) try { pstmt.close(); } catch (SQLException e) { System.err.println("LDM - Error al cerrar PreparedStatement: " + e.getMessage()); }
    if (conn != null) try { conn.close(); } catch (SQLException e) { System.err.println("LDM - Error al cerrar Connection: " + e.getMessage()); }
    System.out.println("--- FIN DEPURACIÓN insert-databaseLDM.jsp ---");
}

out.print(resultOutput);
%>