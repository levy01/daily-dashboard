# Panel diario: configuración en español (unos 10 minutos)

Tendrás **tu propia hoja de Google privada**: nadie más ve tus tareas. El panel se abre desde una página web
y se conecta a tu hoja con un enlace personal.

## 1. Haz tu copia
1. Abre el enlace de copia que te enviaron y pulsa **Hacer una copia**.
2. Se abre tu hoja nueva, con el script incluido.

## 2. Autoriza el script (una sola vez)
1. En tu hoja: **Extensiones > Apps Script**.
2. En la barra superior elige la función **`setup`** y pulsa **Ejecutar**.
3. Google pedirá permisos: **Revisar permisos** > tu cuenta > **Configuración avanzada** >
   **Ir a ... (no seguro)** > **Permitir**. (Aparece "no verificado" porque es tu propio script, no una app publicada.)

## 3. Publícalo como aplicación web
1. En Apps Script: **Implementar > Nueva implementación > Aplicación web**.
2. **Ejecutar como:** Yo. **Quién tiene acceso:** Cualquier persona. Pulsa **Implementar**.
3. Copia la **URL de la aplicación web** (termina en `/exec`).

## 4. Activa el español y conecta tus dispositivos
1. Vuelve a la hoja y **recarga la página**. Aparece el menú **Dashboard**.
2. **Dashboard > Usar español**. Esto pone el panel, las noticias y el menú en español.
3. **Dashboard > Show connection info** (o "Mostrar datos de conexión" tras recargar). Pega la URL del paso 3.
4. Verás un **código QR**. En el iPad o el teléfono, abre la **cámara**, apúntala al código y toca el aviso que
   aparece: el panel se abre ya conectado. (Si no ves el código, usa el enlace que aparece debajo.)
   Mantén el código y el enlace en privado, porque dan acceso a tus tareas.
5. **Dashboard > Probar noticias** y acepta el permiso adicional para ver las noticias.

## Uso diario
- **Tocar una tarea** la marca como hecha. Las pendientes pasan al día siguiente con una etiqueta de color.
- **Lápiz:** agregar y editar tareas. Toca el nombre de una columna para cambiarlo. **+ Sección** agrega otra (máximo 5, por ejemplo de lunes a viernes).
- **Pantalla encendida:** mientras el cronómetro o el temporizador están corriendo, la pantalla no se apaga (en iPhone/iPad con iOS 16.4 o más reciente).
- **Reloj / Cronómetro / Temporizador:** el temporizador trae Pomodoro 25 min, Descanso corto 5 min y Descanso largo 15 min.
- **Tocar el clima:** pronóstico de 5 días. **Tocar la fecha:** noticias principales de tus temas.
- **Pestaña Settings de la hoja:** color del reloj, formato de 24 horas (`clock24h` = yes), ubicación del clima
  (`lat`, `lon`), unidades (`unit`: celsius o fahrenheit), temas de noticias (`news_topics`) y duración del temporizador.

## Si algo falla
- **"clave incorrecta":** abre de nuevo el enlace de conexión (Dashboard > Mostrar datos de conexión).
- **"respuesta inválida" o no sincroniza:** revisa el paso 3 (acceso "Cualquier persona") y que hayas publicado
  una **versión nueva** si cambiaste el script (Implementar > Administrar implementaciones > editar > Nueva versión).
- **Las noticias dicen que falta un permiso:** ejecuta `testNews` desde Apps Script. Si Google nunca pide permiso,
  entra a myaccount.google.com/permissions, quita el acceso de tu script y vuelve a ejecutar.
- **Perdiste o compartiste la clave:** Dashboard > Cambiar la clave secreta, y vuelve a conectar los dispositivos.
