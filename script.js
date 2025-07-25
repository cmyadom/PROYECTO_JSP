// script.js
// Función para obtener los datos del formulario
function obtenerDatosFormulario() {
    var idProducto = $("#id_producto").val();
    var descripcion = $("#descripcion").val();
    var precio = $("#precio").val();
    var fecha = $("#fecha").val(); 

    // Validar que los campos no estén vacíos antes de devolverlos
    if (!idProducto || !descripcion || !precio || !fecha) {
        Swal.fire({
            icon: 'error',
            title: 'Campos Vacíos',
            text: 'Por favor, rellene todos los campos del formulario (Id, Descripción, Precio, Fecha).'
        });
        return null; // Devolver null para indicar que la validación falló
    }

    return {
        id_producto: idProducto,
        descripcion: descripcion,
        precio: precio,
        fecha: fecha
    };
}

// Función genérica para manejar la respuesta de los JSPs de inserción
function manejarRespuesta(resultOutput, txtElementId) {
   
    let responseText = resultOutput.trim(); // Asegurarse de limpiar espacios en blanco
    let res = responseText.split(',');

    if (res[0] === "1") {
        // Actualizar el input con el mensaje de registros insertados
        if ($("#" + txtElementId).length) { 
            $("#" + txtElementId).val(res[1] ? res[1].trim() : "Resultado desconocido");
        }
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: res[1] ? res[1].trim() : "Operación completada."
        });
    } else { 
        // Muestrar el mensaje de error del JSP
        Swal.fire({
            icon: 'error',
            title: 'Error en la inserción',
            text: 'Detalles: ' + (res[1] ? res[1].trim() : "Ver consola para más detalles.")
        });
        if ($("#" + txtElementId).length) {
            $("#" + txtElementId).val('0'); // Resetear a 0 en caso de error
        }
        console.error("Error de inserción:", responseText);
    }
}

// Funciones para insertar registros LDM (Data Manipulation Language)

function oracle_lmd() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST", 
        url: "ldm/insert-databaseLDM.jsp", 
        data: {
            method: "oracle",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_oracleLMD');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para Oracle LDM. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_oracleLMD").val('0');
            console.error("AJAX Error (Oracle LDM):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}

function postgres_lmd() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST",
        url: "ldm/insert-databaseLDM.jsp", 
        data: {
            method: "postgres",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_pgLMD');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para Postgres LDM. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_pgLMD").val('0');
            console.error("AJAX Error (Postgres LDM):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}

function sqlserver_lmd() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST",
        url: "ldm/insert-databaseLDM.jsp", 
        data: {
            method: "sqlserver",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_sqlserverLMD');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para SQL Server LDM. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_sqlserverLMD").val('0');
            console.error("AJAX Error (SQL Server LDM):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}

function mysql_lmd() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST",
        url: "ldm/insert-databaseLDM.jsp", 
        data: {
            method: "mysql",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_mysqlLMD');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para MySQL LDM. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_mysqlLMD").val('0');
            console.error("AJAX Error (MySQL LDM):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}


// Funciones para insertar registros SP (Stored Procedure)
function oracle_sp() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST",
        url: "sp/insert_dbSP.jsp", 
        data: {
            method: "oracle",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_oracleSP');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para Oracle SP. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_oracleSP").val('0');
            console.error("AJAX Error (Oracle SP):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}

function postgres_sp() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST", 
        url: "sp/insert_dbSP.jsp",
        data: {
            method: "postgres",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_postgresSP');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para Postgres SP. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_postgresSP").val('0');
            console.error("AJAX Error (Postgres SP):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}

function sqlserver_sp() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST",
        url: "sp/insert_dbSP.jsp", 
        data: {
            method: "sqlserver",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_sqlserverSP');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para SQL Server SP. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_sqlserverSP").val('0');
            console.error("AJAX Error (SQL Server SP):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}

function mysql_sp() {
    var datos = obtenerDatosFormulario();
    if (!datos) return;

    $.ajax({
        type: "POST",
        url: "sp/insert_dbSP.jsp", 
        data: {
            method: "mysql",
            id_producto: datos.id_producto,
            descripcion: datos.descripcion,
            precio: datos.precio,
            fecha: datos.fecha
        },
        success: function(response) {
            manejarRespuesta(response, 'txt_mysqlSP');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                title: 'Error de Conexión',
                text: 'No se pudo conectar con el servidor para MySQL SP. Estado: ' + textStatus + ', Error: ' + errorThrown
            });
            $("#txt_mysqlSP").val('0');
            console.error("AJAX Error (MySQL SP):", textStatus, errorThrown, jqXHR.responseText);
        }
    });
}