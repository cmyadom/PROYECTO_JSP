// pull_conexion.js
$(document).ready(function() {

    // Objeto para almacenar los intervalos/timeouts de benchmark activos
    const insertionIntervals = {}; // { 'oracle_lmd': { timeoutId: id, updateDisplayId: id, running: boolean }, ... }
    const insertionCounters = {}; // { 'oracle_lmd': { count: 0, startTime: null, currentId: 0 }, ... }

    // Función auxiliar para mostrar el estado con SweetAlert2
    function showSweetAlertResult(responseString, dbType, operationType) {
        responseString = responseString.trim();
        const parts = responseString.split(',');
        const statusCode = parts[0];
        const message = parts.slice(1).join(',').trim(); 

        let iconType;
        let titleText;
        let confirmButtonColor;

        if (statusCode === "1") {
            iconType = 'success';
            titleText = `¡${operationType} exitosa en ${dbType}!`;
            confirmButtonColor = '#4CAF50'; 
        } else {
            iconType = 'error';
            titleText = `Error en ${operationType} de ${dbType}`;
            confirmButtonColor = '#F44336'; 
        }

        Swal.fire({
            icon: iconType,
            title: titleText,
            text: message,
            confirmButtonText: 'OK',
            confirmButtonColor: confirmButtonColor,
            allowOutsideClick: false,
            allowEscapeKey: false
        });
    }

    // Función para obtener los datos del formulario (sin costo)
    function obtenerDatosFormulario() {
        var idProducto = $("#id_producto").val();
        var descripcion = $("#descripcion").val();
        var precio = $("#precio").val();
        var fecha = $("#fecha").val(); 

        if (!idProducto || !descripcion || !precio || !fecha) {
            Swal.fire({
                icon: 'error',
                title: 'Campos Vacíos',
                text: 'Por favor, rellene todos los campos del formulario (Id, Descripción, Precio, Fecha).'
            });
            return null; 
        }

        return {
            id_producto: idProducto,
            descripcion: descripcion,
            precio: precio,
            fecha: fecha 
        };
    }

    // --- Funciones XMLHttpRequest proporcionadas por el usuario (adaptadas para SweetAlert2) ---
    function XMLHttpRequest_Status(url, name) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
            if (this.readyState == 4 && this.status == 200 && this.responseText == 1) alertStatus(name, '¡Conexión establecida con éxito!', 'success');
            else alertStatus(name, 'Error al conectar!', 'error');
        }
        xhr.onerror = function() { // Manejo de errores de red/servidor
            alertStatus(name, 'Error de red o servidor al verificar conexión!', 'error');
        };
        xhr.send();
    }

    function XMLHttpRequest_Destroy(url, dbName) { // Añadido dbName para el mensaje
        Swal.fire({
            title: '¿Estás seguro?',
            text: `¡Esto borrará todos los registros de ${dbName}!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, borrarlo!'
        }).then((result) => {
            if (result.isConfirmed) {
                var xhr = new XMLHttpRequest();
                xhr.open('DELETE', url, true);
                xhr.onload = function () {
                    if (this.readyState == 4 && this.status == 200 && this.responseText == 111) alert('success', '¡Registros eliminados!', 700);
                    else alert('error', 'Error al eliminar!', 700);
                }
                xhr.onerror = function() { // Manejo de errores de red/servidor
                    alert('error', 'Error de red o servidor al eliminar registros!', 700);
                };
                xhr.send();
            }
        });
    }

    const alertStatus = (title, sms, type) => Swal.fire(title, sms, type);
    function alert(type, message, time) { Swal.fire({ icon: type, title: message, showConfirmButton: false, timer: time }) }

    // --- NUEVA FUNCIÓN XMLHttpRequest_Insert para una sola inserción ---
    // Retorna una Promesa para poder usar .then() y .catch() o async/await
    function XMLHttpRequest_Insert(method, id_producto, descripcion, precio, fecha, jspUrl) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', jspUrl, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            
            const params = new URLSearchParams({
                method: method,
                id_producto: id_producto,
                descripcion: descripcion,
                precio: precio,
                fecha: fecha
            }).toString();

            xhr.onload = function () {
                if (this.readyState == 4 && this.status == 200) {
                    const response = this.responseText.trim();
                    const parts = response.split(',');
                    if (parts[0] === "1") {
                        resolve({ success: true, response: response });
                    } else {
                        reject({ success: false, response: response, error: `Server responded with error: ${response}` });
                    }
                } else {
                    reject({ success: false, response: this.responseText, error: `HTTP Error: ${this.status}` });
                }
            };
            xhr.onerror = function() {
                reject({ success: false, error: 'Network error or server unreachable.' });
            };
            xhr.send(params);
        });
    }

    // Lógica para los botones de estado de conexión
    $('#mysql_statu').click(function () { const url = './connections/connections.jsp?method=mysql'; XMLHttpRequest_Status(url, 'MySQL'); });
    $('#postgres_statu').click(function () { const url = './connections/connections.jsp?method=postgres'; XMLHttpRequest_Status(url, 'PostgreSQL'); });
    $('#oracle_statu').click(function () { const url = './connections/connections.jsp?method=oracle'; XMLHttpRequest_Status(url, 'Oracle 23ai'); });
    $('#sqlserver_statu').click(function () { const url = './connections/connections.jsp?method=sqlserver'; XMLHttpRequest_Status(url, 'SQL Server 2022'); });

    // Lógica para los botones de eliminar registros
    $("#oracle_delete").on('click', function() {
        XMLHttpRequest_Destroy("delete/delete.jsp?method=oracle", "Oracle 23ai");
    });
    $("#postgres_delete").on('click', function() {
        XMLHttpRequest_Destroy("delete/delete.jsp?method=postgres", "PostgreSQL");
    });
    $("#sqlserver_delete").on('click', function() {
        XMLHttpRequest_Destroy("delete/delete.jsp?method=sqlserver", "SQL Server 2022");
    });
    $("#mysql_delete").on('click', function() {
        XMLHttpRequest_Destroy("delete/delete.jsp?method=mysql", "MySQL");
    });

    // --- Lógica de BENCHMARK de 1000 inserciones (AHORA ASÍNCRONA con XMLHttpRequest) ---
    async function runFixedBenchmark(dbMethod, dbName, insertType, targetTxtId, jspUrl) {
        const numInsertions = 1000; 
        const datosBase = obtenerDatosFormulario();
        if (!datosBase) return;

        $(`button[id$='_benchmark']`).prop('disabled', true);
        $(targetTxtId).val('Calculando...');

        const startId = parseInt(datosBase.id_producto);
        if (isNaN(startId)) {
            Swal.fire({
                icon: 'error',
                title: 'ID de Producto Inválido',
                text: 'El ID de producto debe ser un número para las pruebas de rendimiento.'
            });
            $(`button[id$='_benchmark']`).prop('disabled', false);
            $(targetTxtId).val('Error');
            return;
        }

        let successfulInsertions = 0;
        const startTime = performance.now(); 
        const promises = []; // Array para almacenar todas las promesas de inserción

        for (let i = 0; i < numInsertions; i++) {
            const currentId = (startId + i).toString(); 
            const datosParaEnvio = { ...datosBase, id_producto: currentId };

            // Lanzar la petición XMLHttpRequest_Insert sin 'await' aquí
            const requestPromise = XMLHttpRequest_Insert(
                dbMethod,
                datosParaEnvio.id_producto,
                datosParaEnvio.descripcion,
                datosParaEnvio.precio,
                datosParaEnvio.fecha,
                jspUrl
            )
            .then(result => {
                if (result.success) {
                    successfulInsertions++;
                }
                return result; // Pasar el resultado para Promise.allSettled
            })
            .catch(error => {
                console.error(`Error en inserción para ID ${currentId}:`, error);
                return { status: 'rejected', reason: error }; // Asegurar que Promise.allSettled lo maneje
            });
            
            promises.push(requestPromise); 
        }

        // Esperar a que todas las promesas se resuelvan (o se rechacen)
        await Promise.allSettled(promises);

        const endTime = performance.now();
        const totalDurationMs = endTime - startTime;
        const totalDurationSeconds = totalDurationMs / 1000;
        
        let resultText = '';
        if (successfulInsertions > 0 && totalDurationSeconds > 0) {
            const insertionsPerSecond = successfulInsertions / totalDurationSeconds;
            const insertionsPerMinute = insertionsPerSecond * 60;
            resultText = `${successfulInsertions} en ${totalDurationSeconds.toFixed(2)}s (${insertionsPerMinute.toFixed(2)}/min)`;
        } else if (successfulInsertions === 0) {
            resultText = '0 inserciones exitosas.';
        } else {
            resultText = 'Error en cálculo de tiempo.';
        }
        
        $(targetTxtId).val(resultText);
        Swal.fire({
            icon: 'info',
            title: 'Benchmark Completado',
            text: `Se intentaron ${numInsertions} inserciones. Éxitos: ${successfulInsertions}. Resultado: ${resultText}`
        });

        $(`button[id$='_benchmark']`).prop('disabled', false);
    }

    // --- LÓGICA DE BENCHMARK DE 60 SEGUNDOS (CONCURRENTE Y AGRESIVA, TIEMPO EXACTO) ---
    async function startContinuousBenchmark(buttonId, dbMethod, dbName, insertType, targetTxtId, jspUrl) {
        const datosBase = obtenerDatosFormulario();
        if (!datosBase) {
            $(`#${buttonId}`).prop('disabled', false).text(`Insertar registros ${insertType}`);
            return;
        }

        const startId = parseInt(datosBase.id_producto);
        if (isNaN(startId)) {
            Swal.fire({
                icon: 'error',
                title: 'ID de Producto Inválido',
                text: 'El ID de producto debe ser un número para las pruebas de rendimiento.'
            });
            $(`#${buttonId}`).prop('disabled', false).text(`Insertar registros ${insertType}`);
            return;
        }

        const benchmarkKey = `${dbMethod}_${insertType}`;
        const DURATION_MS = 60 * 1000; // 60 segundos exactos en milisegundos

        // Si ya está corriendo, detenerlo
        if (insertionIntervals[benchmarkKey]) {
            // Limpiar el timeout principal y el intervalo de actualización del display
            clearTimeout(insertionIntervals[benchmarkKey].timeoutId);
            clearInterval(insertionIntervals[benchmarkKey].updateDisplayId); 
            insertionIntervals[benchmarkKey].running = false; // Marcar como no corriendo
            
            const endTime = performance.now();
            const totalDurationMs = endTime - insertionCounters[benchmarkKey].startTime;
            const totalDurationSeconds = totalDurationMs / 1000;
            const successfulCount = insertionCounters[benchmarkKey].count;

            let resultText = '';
            if (successfulCount > 0 && totalDurationSeconds > 0) {
                const insertionsPerSecond = successfulCount / totalDurationSeconds;
                const insertionsPerMinute = insertionsPerSecond * 60;
                resultText = `${successfulCount} en ${totalDurationSeconds.toFixed(2)}s (${insertionsPerMinute.toFixed(2)}/min)`;
            } else {
                resultText = '0 inserciones exitosas o tiempo insuficiente.';
            }
            $(targetTxtId).val(resultText);
            
            Swal.fire({
                icon: 'info',
                title: 'Benchmark Detenido',
                text: `Benchmark para ${dbName} (${insertType}) detenido manualmente. Resultado: ${resultText}`
            });

            delete insertionIntervals[benchmarkKey];
            delete insertionCounters[benchmarkKey];
            $(`#${buttonId}`).prop('disabled', false).text(`Insertar registros ${insertType}`);
            return;
        }

        // Iniciar un nuevo benchmark
        insertionCounters[benchmarkKey] = { count: 0, currentId: startId, startTime: performance.now() };
        insertionIntervals[benchmarkKey] = { running: true }; // Marcar como corriendo
        $(targetTxtId).val('0/min'); // Mostrar 0/min al inicio
        $(`#${buttonId}`).prop('disabled', true).text('Iniciando...'); 

        // Habilitar el botón para detener después de un breve retraso
        setTimeout(() => {
            $(`#${buttonId}`).prop('disabled', false).text('Detener');
        }, 500); 

        // Bucle principal para lanzar peticiones lo más rápido posible
        const runLoop = async () => {
            const benchmarkStartTime = insertionCounters[benchmarkKey].startTime;
            while (insertionIntervals[benchmarkKey] && insertionIntervals[benchmarkKey].running && (performance.now() - benchmarkStartTime) < DURATION_MS) {
                const currentId = (insertionCounters[benchmarkKey].currentId++).toString();
                const datosParaEnvio = { ...datosBase, id_producto: currentId };

                // Lanzar la petición XMLHttpRequest_Insert sin 'await' aquí en el bucle principal
                XMLHttpRequest_Insert(
                    dbMethod,
                    datosParaEnvio.id_producto,
                    datosParaEnvio.descripcion,
                    datosParaEnvio.precio,
                    datosParaEnvio.fecha,
                    jspUrl
                )
                .then(result => {
                    if (result.success) {
                        // Solo incrementar si el benchmark sigue activo para evitar race conditions
                        if (insertionCounters[benchmarkKey]) {
                            insertionCounters[benchmarkKey].count++;
                        }
                    } else {
                        console.warn(`Inserción fallida para ID ${currentId} (${dbName} ${insertType}): ${result.response || result.error}`);
                    }
                })
                .catch(error => {
                    console.error(`Error AJAX durante benchmark continuo para ID ${currentId} (${dbName} ${insertType}):`, error);
                });

                // Ceder el control al bucle de eventos del navegador por un momento
                // Esto es CRUCIAL para evitar que el navegador se congele y permitir que las peticiones AJAX se procesen.
                await new Promise(resolve => setTimeout(resolve, 0)); 
            }
            // Si el bucle termina por tiempo, el timeout final se encargará del cálculo.
            // Si se detiene manualmente, la lógica de 'if (insertionIntervals[benchmarkKey])' lo maneja.
        };

        runLoop(); // Iniciar el bucle de inserciones

        // Establecer un timeout para detener el benchmark después de 60 segundos exactos
        const timeoutId = setTimeout(() => {
            // Asegurarse de que el benchmark no fue detenido manualmente antes de este timeout
            if (insertionIntervals[benchmarkKey] && insertionIntervals[benchmarkKey].running) {
                clearInterval(insertionIntervals[benchmarkKey].updateDisplayId); // Detener la actualización del display
                insertionIntervals[benchmarkKey].running = false; // Marcar como no corriendo
                
                const endTime = performance.now();
                const totalDurationMs = endTime - insertionCounters[benchmarkKey].startTime;
                const successfulCount = insertionCounters[benchmarkKey].count;

                let resultText = '';
                // Calcular la tasa basada en el tiempo exacto de 60 segundos
                const insertionsPerSecond = successfulCount / (DURATION_MS / 1000);
                const insertionsPerMinute = insertionsPerSecond * 60;
                resultText = `${successfulCount} en ${(DURATION_MS / 1000).toFixed(2)}s (${insertionsPerMinute.toFixed(2)}/min)`;
                
                $(targetTxtId).val(resultText);
                
                Swal.fire({
                    icon: 'info',
                    title: 'Benchmark de 60 Segundos Completado',
                    text: `Benchmark para ${dbName} (${insertType}) finalizado. Resultado: ${resultText}`
                });

                delete insertionIntervals[benchmarkKey];
                delete insertionCounters[benchmarkKey];
                $(`#${buttonId}`).prop('disabled', false).text(`Insertar registros ${insertType}`); 
            }
        }, DURATION_MS); // 60 segundos exactos

        // Actualizar el contador en tiempo real en el campo de texto
        const updateDisplayInterval = setInterval(() => {
            if (insertionCounters[benchmarkKey]) {
                const currentTime = performance.now();
                const elapsedSeconds = (currentTime - insertionCounters[benchmarkKey].startTime) / 1000;
                if (elapsedSeconds > 0) {
                    const currentIps = insertionCounters[benchmarkKey].count / elapsedSeconds;
                    $(targetTxtId).val(`${insertionCounters[benchmarkKey].count} en ${elapsedSeconds.toFixed(1)}s (${(currentIps * 60).toFixed(2)}/min)`);
                }
            } else {
                clearInterval(updateDisplayInterval); 
            }
        }, 1000); // Actualizar cada segundo

        insertionIntervals[benchmarkKey].timeoutId = timeoutId;
        insertionIntervals[benchmarkKey].updateDisplayId = updateDisplayInterval;
    }


    // Asignar eventos a los botones LDM (AHORA INICIAN BENCHMARK DE 60 SEGUNDOS)
    $("#oracle_lmd").on('click', function() {
        startContinuousBenchmark("oracle_lmd", "oracle", "Oracle 23ai", "LDM", "#txt_oracleLMD", "insert/insert-databaseLDM.jsp");
    });
    $("#postgres_lmd").on('click', function() {
        startContinuousBenchmark("postgres_lmd", "postgres", "PostgreSQL", "LDM", "#txt_pgLMD", "insert/insert-databaseLDM.jsp");
    });
    $("#sqlserver_lmd").on('click', function() {
        startContinuousBenchmark("sqlserver_lmd", "sqlserver", "SQL Server 2022", "LDM", "#txt_sqlserverLMD", "insert/insert-databaseLDM.jsp");
    });
    $("#mysql_lmd").on('click', function() {
        startContinuousBenchmark("mysql_lmd", "mysql", "MySQL", "LDM", "#txt_mysqlLMD", "insert/insert-databaseLDM.jsp");
    });

    // Asignar eventos a los botones SP (AHORA INICIAN BENCHMARK DE 60 SEGUNDOS)
    $("#oracle_sp").on('click', function() {
        startContinuousBenchmark("oracle_sp", "oracle", "Oracle 23ai", "SP", "#txt_oracleSP", "insert/insert_dbSP.jsp"); 
    });
    $("#postgres_sp").on('click', function() {
        startContinuousBenchmark("postgres_sp", "postgres", "PostgreSQL", "SP", "#txt_postgresSP", "insert/insert_dbSP.jsp"); 
    });
    $("#sqlserver_sp").on('click', function() {
        startContinuousBenchmark("sqlserver_sp", "sqlserver", "SQL Server 2022", "SP", "#txt_sqlserverSP", "insert/insert_dbSP.jsp"); 
    });
    $("#mysql_sp").on('click', function() {
        startContinuousBenchmark("mysql_sp", "mysql", "MySQL", "SP", "#txt_mysqlSP", "insert/insert_dbSP.jsp"); 
    });

    // Asignar eventos a los botones de BENCHMARK de 1000 inserciones (AHORA ASÍNCRONAS con XMLHttpRequest)
    $("#oracle_lmd_benchmark").on('click', function() {
        runFixedBenchmark("oracle", "Oracle 23ai", "LDM", "#txt_oracleLMD_benchmark", "insert/insert-databaseLDM.jsp");
    });
    $("#postgres_lmd_benchmark").on('click', function() {
        runFixedBenchmark("postgres", "PostgreSQL", "LDM", "#txt_pgLMD_benchmark", "insert/insert-databaseLDM.jsp");
    });
    $("#sqlserver_lmd_benchmark").on('click', function() {
        runFixedBenchmark("sqlserver", "SQL Server 2022", "LDM", "#txt_sqlserverLMD_benchmark", "insert/insert-databaseLDM.jsp");
    });
    $("#mysql_lmd_benchmark").on('click', function() {
        runFixedBenchmark("mysql", "MySQL", "LDM", "#txt_mysqlLMD_benchmark", "insert/insert-databaseLDM.jsp");
    });

    // Asignar eventos a los NUEVOS botones de BENCHMARK SP (AHORA ASÍNCRONAS con XMLHttpRequest)
    $("#oracle_sp_benchmark").on('click', function() {
        runFixedBenchmark("oracle", "Oracle 23ai", "SP", "#txt_oracleSP_benchmark", "insert/insert_dbSP.jsp"); 
    });
    $("#postgres_sp_benchmark").on('click', function() {
        runFixedBenchmark("postgres", "PostgreSQL", "SP", "#txt_postgresSP_benchmark", "insert/insert_dbSP.jsp"); 
    });
    $("#sqlserver_sp_benchmark").on('click', function() {
        runFixedBenchmark("sqlserver", "SQL Server 2022", "SP", "#txt_sqlserverSP_benchmark", "insert/insert_dbSP.jsp"); 
    });
    $("#mysql_sp_benchmark").on('click', function() {
        runFixedBenchmark("mysql", "MySQL", "SP", "#txt_mysqlSP_benchmark", "insert/insert_dbSP.jsp"); 
    });


    // Inicializar la fecha al cargar la página
    document.addEventListener('DOMContentLoaded', function() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); 
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('fecha').value = `${year}-${month}-${day}`;
    });
});