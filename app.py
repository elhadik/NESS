import os
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from document_parser import parse_document
from gemini_parser import analyze_receipt_with_gemini
from google.cloud import storage
import json

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB limit

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Call our document parser
            parsed_data = parse_document(filepath, file.mimetype)
            
            # Call Gemini
            print(f"Calling Gemini for {filepath}...")
            gemini_data = analyze_receipt_with_gemini(filepath, parsed_data, file.mimetype)
            print(f"Gemini response: {gemini_data}")
            
            # Merge results
            parsed_data['gemini_analysis'] = gemini_data
            
            # GCS Routing Logic
            score = gemini_data.get('confidence_score', 0)
            
            project_id = os.environ.get("PROJECT_ID")
            processed_bucket_name = os.environ.get("NESS_PROCESSED_DOCS_BUCKET")
            review_bucket_name = os.environ.get("NESS_HUMAN_REVIEW_BUCKET")
            
            routing_status = "Skipped"
            bucket_name = None
            
            if project_id and processed_bucket_name and review_bucket_name:
                try:
                    client = storage.Client(project=project_id)
                    bucket_name = processed_bucket_name if score == 3 else review_bucket_name
                    bucket = client.bucket(bucket_name)
                    
                    blob = bucket.blob(filename)
                    # Upload the actual image file to the bucket instead of the JSON
                    blob.upload_from_filename(filepath, content_type=file.mimetype)
                    
                    routing_status = "Success"
                    print(f"Routed {filename} image to GCS bucket: {bucket_name}")
                except Exception as gcs_e:
                    print(f"GCS Routing Error: {gcs_e}")
                    routing_status = f"Error: {gcs_e}"
            else:
                print("Warning: Missing GCS Env Variables. Routing skipped.")
                routing_status = "Missing Config"
                
            parsed_data["gcs_routing"] = {
                "status": routing_status,
                "bucket": bucket_name,
                "score": score
            }
            
            return jsonify(parsed_data)
        except Exception as e:
            print(f"Error during upload/processing: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up the file after parsing
            if os.path.exists(filepath):
                os.remove(filepath)
                print(f"Deleted {filepath}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
