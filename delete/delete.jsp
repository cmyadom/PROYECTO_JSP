<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.sql.*" %>
<%@ page import="javax.sql.*" %>
<%@ page import="javax.naming.*" %>

<%
String method = request.getParameter("method");
String resultOutput = "0,Error al eliminar registros."; // Default error

Connection conn = null;
PreparedStatement pstmt = null;

System.out.println("--- INICIO DEPURACIÓN delete/delete.jsp ---");
System.out.println("delete.jsp - Método recibido: " + method);

try {
    Context initCtx = new InitialContext();
    DataSource ds = null;
    String dbName = "";
    String sql = "DELETE FROM PRODUCTO";

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
            resultOutput = "0,Método de base de datos no reconocido para eliminar: " + method;
            System.err.println("delete.jsp - Método no reconocido: " + method);
            out.print(resultOutput);
            return;
    }

    if (ds != null) {
        conn = ds.getConnection();
        pstmt = conn.prepareStatement(sql);
        int rowsAffected = pstmt.executeUpdate();
        resultOutput = "1,Registros eliminados de " + dbName + ": " + rowsAffected;
        System.out.println("delete.jsp - Registros eliminados de " + dbName + ": " + rowsAffected);
    } else {
        resultOutput = "0,Error: DataSource no encontrado para " + dbName;
        System.err.println("delete.jsp - DataSource no encontrado para " + dbName);
    }

} catch (SQLException e) {
    resultOutput = "0,Error SQL al eliminar: " + e.getMessage();
    System.err.println("Error en delete.jsp (SQLException): " + e.getMessage());
    e.printStackTrace(System.err);
} catch (NamingException e) {
    resultOutput = "0,Error de configuración JNDI para eliminar: " + e.getMessage();
    System.err.println("Error en delete.jsp (NamingException): " + e.getMessage());
    e.printStackTrace(System.err);
} catch (Exception e) {
    resultOutput = "0,Error inesperado al eliminar: " + e.getMessage();
    System.err.println("Error en delete.jsp (General Exception): " + e.getMessage());
    e.printStackTrace(System.err);
} finally {
    if (pstmt != null) try { pstmt.close(); } catch (SQLException e) { System.err.println("Error al cerrar PreparedStatement: " + e.getMessage()); }
    if (conn != null) try { conn.close(); } catch (SQLException e) { System.err.println("Error al cerrar Connection: " + e.getMessage()); }
    System.out.println("--- FIN DEPURACIÓN delete/delete.jsp ---");
}

out.print(resultOutput);
%>
