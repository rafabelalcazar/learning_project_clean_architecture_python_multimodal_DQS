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
