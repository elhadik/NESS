# NESS Document AI Parser



NESS is a modern Flask application that utilizes Google Cloud Document AI to parse invoices, extracting key entities and line items, and displaying them in a clean, user-friendly interface.

## Prerequisites

- Python 3.8+
- Python 3.8+
- Google Cloud Credentials with Document AI access
- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed and initialized

## Local Development Setup

Follow these instructions to run the NESS application locally using the real Google Cloud Document AI API.

1. **Navigate to the application folder:**
   ```bash
   cd NESS
   ```

2. **Create a virtual environment** (named `venv`):
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment:**
   ```bash
   source venv/bin/activate
   ```

4. **Install the required dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Authenticate with Google Cloud:**
   Before running the app, you need valid local credentials.
   ```bash
   gcloud auth application-default login
   ```
   *Note: If the `gcloud` command is not found, please install the Google Cloud SDK using the link in the Prerequisites section.*

6. **Set up Google Cloud credentials and environment variables:**
   Create a `.env` file in the root of the `NESS` directory and add your GCP project and processor details:
   ```env
   PROJECT_ID=your-gcp-project-id
   PROCESSOR_ID=your-document-ai-processor-id
   LOCATION=us # or eu
   ```
   **⚠️ CRITICAL:** You MUST replace the placeholder text (`your-gcp-project-id` and `your-document-ai-processor-id`) with your actual Google Cloud Project ID and Document AI Processor ID.
   *If you do not change these placeholders, you will receive a `403 Permission denied [reason: "CONSUMER_INVALID"]` error when uploading a document.*

7. **Run the Flask application:**
   ```bash
   flask --app app.py run
   ```

Once the server is running, open your web browser and go to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

## Architecture

The NESS application uses a two-step process to parse and verify receipts:

1.  **Parsing**: Document AI extracts text and key fields from the receipt image.
2.  **Validation**: Gemini 3.5 (Flash) audits the Document AI results against the original image to ensure accuracy and issue a confidence score.

### Interaction Sequence

![Interaction Sequence](ness_sequence_diagram.png)

## Features


- **Modern GUI**: Includes a drag-and-drop file upload zone.
- **Loading Overlay**: Simulates processing time with smooth scanning animations.
- **Results Display**: Extracted entities, summary, and line items are displayed neatly in cards and a table.
- **Raw Data Viewer**: Easy toggle to view the raw JSON response from the parser.
