<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ page import="javax.naming.*" %>

<%
// Configuración para evitar el caché del navegador y proxies
response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
response.setHeader("Pragma", "no-cache");    // HTTP 1.0.
response.setDateHeader("Expires", 0);        // Proxies.

String method = request.getParameter("method");
Connection conn = null;
// Formato: "statusCode,message"
String resultOutput = "0,Error desconocido al verificar conexión."; // Default error message

System.out.println("--- INICIO DEPURACIÓN connections/connections.jsp ---");
System.out.println("connections.jsp - Método recibido: " + method);

try {
    if (method != null) {
        String dbName = ""; // Nombre descriptivo para mostrar al usuario
        String jdbcUrl = "";
        String user = "";
        String password = "";
        String driverClass = "";

        // Usamos JDBC puro para conexiones de prueba, para que no dependa de JNDI
        switch (method.toLowerCase()) {
            case "mysql":
                driverClass = "com.mysql.cj.jdbc.Driver";
                jdbcUrl = "jdbc:mysql://localhost:3306/bdproyecto";
                user = "root";
                password = "mysql123";
                dbName = "MySQL"; // Nombre descriptivo
                break;
            case "sqlserver":
                driverClass = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
                jdbcUrl = "jdbc:sqlserver://localhost:1433;databaseName=BDPROYECTO;encrypt=true;trustServerCertificate=true;";
                user = "sa";
                password = "1234567";
                dbName = "SQL Server 2022"; // Nombre descriptivo
                break;
            case "oracle":
                driverClass = "oracle.jdbc.driver.OracleDriver";
                jdbcUrl = "jdbc:oracle:thin:@localhost:1521:free"; 
                user = "c##BDPROYECTO";
                password = "1234567";
                dbName = "Oracle 23ai"; // Nombre descriptivo
                break;
            case "postgres":
                driverClass = "org.postgresql.Driver";
                jdbcUrl = "jdbc:postgresql://localhost:5432/BDPROYECTO";
                user = "postgres";
                password = "123456";
                dbName = "PostgreSQL"; // Nombre descriptivo
                break;
            default:
                resultOutput = "0,Error: Método de base de datos no válido o no reconocido: " + method;
                System.err.println("connections.jsp - Método no reconocido: " + method);
                break;
        }

        if (!driverClass.isEmpty()) { // Solo intentar conectar si el método fue válido
            try {
                Class.forName(driverClass);
                conn = DriverManager.getConnection(jdbcUrl, user, password);

                if (conn != null && !conn.isClosed()) {
                    resultOutput = "1"; // Solo 1 para éxito
                    System.out.println("connections.jsp - Conexión exitosa a " + dbName);
                } else {
                    resultOutput = "0"; // Solo 0 para fallo
                    System.err.println("connections.jsp - Conexión a " + dbName + " es null o está cerrada.");
                }
            } catch (SQLException e) {
                resultOutput = "0"; // Solo 0 para error SQL
                System.err.println("connections.jsp - SQLException (" + dbName + "): " + e.getMessage());
                e.printStackTrace(System.err);
            } catch (ClassNotFoundException e) {
                resultOutput = "0"; // Solo 0 para driver no encontrado
                System.err.println("connections.jsp - ClassNotFoundException (" + dbName + "): " + e.getMessage());
                e.printStackTrace(System.err);
            } catch (Exception e) {
                resultOutput = "0"; // Solo 0 para error general
                System.err.println("connections.jsp - Excepción general (" + dbName + "): " + e.getMessage());
                e.printStackTrace(System.err);
            } finally {
                if (conn != null) {
                    try {
                        conn.close();
                        System.out.println("connections.jsp - Conexión a " + dbName + " cerrada.");
                    } catch (SQLException e) {
                        System.err.println("connections.jsp - Error al cerrar la conexión a " + dbName + ": " + e.getMessage());
                    }
                }
            }
        }
    } else {
        resultOutput = "0"; // Solo 0 si no hay método
        System.err.println("connections.jsp - El parámetro 'method' es null.");
    }

} catch (Exception e) {
    resultOutput = "0"; // Solo 0 para error fatal
    System.err.println("connections.jsp - Error fatal (fuera de try/catch interno): " + e.getMessage());
    e.printStackTrace(System.err);
} finally {
    System.out.println("--- FIN DEPURACIÓN connections/connections.jsp ---");
}

out.print(resultOutput); // Imprime la respuesta final
%>