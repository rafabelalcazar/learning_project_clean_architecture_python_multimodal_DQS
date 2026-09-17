# Unimodal Data Quality Analyzer

Un analizador de calidad de datos unimodales diseñado con **Clean Architecture** (Arquitectura Limpia) y principios **SOLID** en Python. Permite escanear conjuntos de datos locales, clasificar archivos por modalidad (Texto estructurado, Imagen y Audio), evaluar métricas de calidad en tiempo real y exportar los resultados consolidados a un reporte CSV.

El proyecto cuenta con dos modos de interacción:
1. **Interfaz de Línea de Comandos (CLI):** Ejecución directa en terminal con salida estructurada y barra de progreso.
2. **Dashboard Web (Web App):** Una interfaz gráfica moderna basada en Flask con actualizaciones en tiempo real y descarga interactiva del reporte.

---

## 🛠️ Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado **Python 3.10+** y un gestor de paquetes (`pip`).

Las dependencias principales se encuentran especificadas en [requirements.txt](requirements.txt) e incluyen:
*   **pandas** y **openpyxl**: Para análisis de datos estructurados e importaciones/exportaciones de CSV y Excel.
*   **Pillow**: Para la lectura y evaluación de propiedades de archivos de imagen (resolución, canales, formato).
*   **mutagen**: Para la extracción de metadatos y duraciones de pistas de audio.
*   **Flask**: Para alojar el servidor local del dashboard web.

---

## 🚀 Instalación y Configuración

Sigue estos pasos para preparar el entorno local en Windows (PowerShell/CMD) o entornos Unix:

> [!TIP]
> Si estás en Windows y el comando `python` no es reconocido por la consola, utiliza el launcher `py` en su lugar (por ejemplo: `py -m venv venv`, `py -m src.main ...`, etc.).



1.  **Clona o accede al directorio del proyecto:**
    ```bash
    cd c:\Users\USER\Documents\projects\learning\antigravity_learning_project
    ```

2.  **Crea un entorno virtual (venv) recomendado:**
    ```bash
    python -m venv venv
    ```

3.  **Activa el entorno virtual:**
    *   **En Windows (PowerShell):**
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **En Windows (CMD):**
        ```cmd
        .\venv\Scripts\activate.bat
        ```
    *   **En macOS/Linux:**
        ```bash
        source venv/bin/activate
        ```

4.  **Instala las dependencias necesarias:**
    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```

---

## 📁 Generación del Dataset de Prueba

Para probar el analizador de inmediato, el proyecto incluye un script generador de mock data que crea un directorio `sample_dataset` con archivos de diferentes modalidades (incluyendo subcarpetas recursivas y archivos no soportados como PDF).

Ejecuta el script para construirlo:
```bash
python create_mock_dataset.py
```

Esto generará la estructura `sample_dataset/` en la raíz del proyecto.

---

## 💻 Instrucciones de Ejecución

El proyecto ofrece dos puntos de entrada principales en la carpeta `src/`.

### 1. Interfaz de Línea de Comandos (CLI)

Ejecuta el escáner de calidad de datos usando la línea de comandos. Debes especificar la ruta de la carpeta a analizar.

**Sintaxis básica:**
```bash
python -m src.main --path <RUTA_AL_DATASET> [--output <RUTA_SALIDA_CSV>]
```

*   `--path` *(requerido)*: Ruta absoluta o relativa al directorio que deseas escanear.
*   `--output` *(opcional)*: Nombre o ruta completa para el reporte de métricas en CSV (por defecto: `metrics_report.csv`).

**Ejemplo de ejecución con el dataset de prueba:**
```bash
python -m src.main --path sample_dataset --output scan_results.csv
```

La consola mostrará una animación/barra de progreso del escaneo de archivos y guardará el archivo `scan_results.csv` al terminar.

---

### 2. Dashboard Web (Interfaz Web Interactiva)

Ejecuta la interfaz web interactiva para visualizar las métricas y el progreso de los archivos en tiempo real mediante *Server-Sent Events (SSE)*.

1.  **Inicia el servidor local de Flask:**
    ```bash
    python -m src.main_web
    ```

    ```
    C:\Users\USER\Documents\projects\maestria\POC\multimodal_DQ_analysis\data
    ```
2.  **Accede al dashboard en tu navegador:**
    Abre tu navegador de preferencia y ve a:
    [http://localhost:5000](http://localhost:5000)

3.  **Uso de la interfaz:**
    *   Introduce la ruta del directorio en el cuadro de texto (ej. `sample_dataset`).
    *   Presiona **Start Scan** para iniciar el análisis en tiempo real.
    *   Observa en el panel el progreso, las estadísticas en tiempo real por modalidad y el log de consola del servidor.
    *   Una vez completado el análisis, haz clic en **Download CSV Report** para exportar los resultados directamente a tu máquina.

---

## 📊 Métricas de Calidad Evaluadas

El reporte generado (CSV) incluye, para cada archivo, un conjunto de métricas específico según su modalidad. Todas las modalidades comparten además `file_size_bytes` (tamaño del archivo en bytes), agregado de forma transversal por [`BaseUnimodalProcessor`](src/infrastructure/processors/base.py).

Esta sección se organiza por modalidad y se irá ampliando a medida que se agreguen nuevas métricas a Texto Estructurado y Audio.

### 🖼️ Imagen

Calculadas en [`ImageQualityStrategy`](src/infrastructure/processors/image.py) usando `Pillow`, `OpenCV` (`cv2`) y `scikit-image`.

**Metadatos del archivo**

| Métrica | Descripción |
|---|---|
| `width_pixels` | Ancho de la imagen en píxeles. |
| `height_pixels` | Alto de la imagen en píxeles. |
| `aspect_ratio` | Relación de aspecto (`width / height`). |
| `image_format` | Formato detectado por Pillow (ej. `PNG`, `JPEG`). |
| `color_mode` | Modo de color de la imagen (ej. `RGB`, `RGBA`, `L`). |
| `is_corrupted` | `True` si el archivo está truncado o corrupto (verificado con `Image.verify()`); `False` si se puede leer correctamente. |

**Métricas de calidad visual**

| Métrica | Descripción |
|---|---|
| `blur_score` | Varianza del Laplaciano sobre la imagen en escala de grises. Valores bajos indican imágenes borrosas o con poco detalle. |
| `brightness` | Media de intensidad en escala de grises (0-255). |
| `contrast` | Desviación estándar de intensidad en escala de grises; a mayor valor, mayor contraste global. |
| `entropy` | Entropía de Shannon de la imagen en escala de grises; mide la complejidad/información visual. |
| `r_mean`, `g_mean`, `b_mean` | Media de intensidad de cada canal de color (Rojo, Verde, Azul). |
| `noise_sigma` | Estimación del nivel de ruido de la imagen (`skimage.restoration.estimate_sigma`) sobre la escala de grises. |
| `colorfulness` | Métrica de "colorido" de Hasler–Süsstrunk; valores altos indican imágenes más vívidas/saturadas. |
| `saturation_mean` | Media del canal de saturación (S) en el espacio de color HSV. |
| `overexposed_ratio` | Proporción de píxeles casi blancos (`>= 250` en escala de grises); detecta sobreexposición/clipping. |
| `underexposed_ratio` | Proporción de píxeles casi negros (`<= 5` en escala de grises); detecta subexposición. |
| `dynamic_range` | Diferencia entre el valor máximo y mínimo de intensidad en escala de grises. |
| `edge_density` | Proporción de píxeles de borde (detectados con el algoritmo de Canny) sobre el total de píxeles; mide el nivel de detalle. |

> Si la extracción de estas métricas falla (archivo ilegible, formato no soportado por OpenCV, etc.), se reportan en `0`/`0.0` y se agrega la clave `quality_metrics_error` con el detalle del error.

### 📄 Texto Estructurado

Calculadas en [`StructuredTextQualityStrategy`](src/infrastructure/processors/structured_text.py) usando `pandas`.

| Métrica | Aplica a | Descripción |
|---|---|---|
| `row_count` | CSV, XLSX | Número de filas del archivo (o de la primera hoja, en Excel). |
| `column_count` | CSV, XLSX | Número de columnas. |
| `null_count` | CSV, XLSX | Total de celdas nulas/vacías en el archivo. |
| `columns` | CSV, XLSX | Lista con los nombres de las columnas. |
| `sheet_count` | XLSX | Número de hojas en el libro de Excel. |
| `sheet_names` | XLSX | Lista con los nombres de las hojas. |
| `line_count` | TXT | Número de líneas del archivo. |
| `word_count` | TXT | Número total de palabras. |
| `char_count` | TXT | Número total de caracteres. |

### 🎵 Audio

Calculadas en [`AudioQualityStrategy`](src/infrastructure/processors/audio.py) usando el módulo estándar `wave` (WAV) y `mutagen` (MP3 y otros formatos).

| Métrica | Aplica a | Descripción |
|---|---|---|
| `channels` | WAV, MP3, otros | Número de canales de audio (1 = mono, 2 = estéreo). |
| `sample_rate_hz` | WAV, MP3, otros | Frecuencia de muestreo en Hz. |
| `duration_seconds` | WAV, MP3, otros | Duración total del audio en segundos. |
| `bit_depth` | WAV | Profundidad de bits por muestra. |
| `bitrate_kbps` | MP3 | Tasa de bits del archivo en kbps. |
| `audio_format` | WAV, MP3, otros | Formato de audio detectado (ej. `WAV`, `MP3`). |

---

## 🧪 Ejecución de Pruebas Unitarias

El proyecto cuenta con cobertura de pruebas automatizadas mediante el framework estándar `unittest`.

Para ejecutar todos los tests, corre el siguiente comando en la raíz del proyecto:
```bash
python -m unittest discover -s tests
```

---

## 📐 Estructura del Código (Clean Architecture)

El proyecto está diseñado bajo la filosofía de separación de intereses y flujo unidireccional de dependencias:

*   **src/domain/ (`domain`):** Entidades puras y contratos. Libre de dependencias externas. Contiene [entities.py](src/domain/entities.py) e [interfaces.py](src/domain/interfaces.py).
*   **src/use_cases/ (`use_cases`):** Orquestación del negocio del sistema ([scan_dataset.py](src/use_cases/scan_dataset.py)).
*   **src/adapters/ (`adapters`):** Convertidores entre interfaces del dominio e infraestructura ([controllers.py](src/adapters/controllers.py), [exporters.py](src/adapters/exporters.py)).
*   **src/infrastructure/ (`infrastructure`):** Implementaciones tecnológicas, librerías externas y llamadas al OS ([scanner.py](src/infrastructure/scanner.py), y estrategias de calidad en [processors/](src/infrastructure/processors/)).
*   **src/web/ (`web`):** Plantillas HTML y archivos estáticos (CSS/JS) para el Dashboard Web.
