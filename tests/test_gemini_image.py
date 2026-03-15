import os
import sys
import json
from google import genai
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

def test_gemini_image():
    print("Python executable:", sys.executable)
    
    image_path = "/usr/local/google/home/elhadik/.gemini/jetski/brain/3948d905-f473-46e4-aadd-8180484a8c5b/sample_receipt_1773596167398.png"
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    try:
        image = Image.open(image_path)
        print(f"Loaded image: {image_path} ({image.format}, {image.size})")
    except Exception as e:
        print(f"Error loading image: {e}")
        return

    try:
        # Initialize client (using Vertex AI as verified before)
        project = os.environ.get("PROJECT_ID")
        location = "us-central1"
        print(f"Initializing client with Vertex AI: project={project}, location={location}")
        client = genai.Client(vertexai=True, project=project, location=location)

        prompt = """
        You are an expert receipt analyzer. Analyze the attached image of a receipt.
        
        1. Extract the following values if available: Merchant name, Date, Total amount, Tax amount.
        2. Issue a confidence score out of 5 based on the following criteria:
           - 5 (Excellent): The receipt is perfectly legible, including edge-to-edge text. All key fields (Merchant, Date, Time, Items, Tax, Total) are distinct and unambiguous.
           - 4 (Good): Most of the receipt is legible. Key fields are clear, but some minor text (like store policy or barcode) might be slightly blurred or cut off.
           - 3 (Fair): Key fields are mostly identifiable, but some require inference due to glare, blur, or handwriting. Some item descriptions might be incomplete.
           - 2 (Poor): Significant portions of the receipt are illegible. Key fields are missing or ambiguous. The image is blurry, poorly lit, or badly framed.
           - 1 (Unusable): The image is not a receipt, the text is completely unreadable, or the receipt is too damaged to extract meaningful data.
        
        Output your response as a valid JSON object with the following structure:
        {
          "confidence_score": integer (1-5),
          "criteria_met": "Detailed explanation of why this score was given, referencing specific parts of the image and the criteria.",
          "extracted_values": {
            "Merchant": "string or null",
            "Date": "string (MM/DD/YY or similar) or null",
            "Total": "string (number) or null",
            "Tax": "string (number) or null"
          }
        }
        
        Return ONLY the JSON object. Do not include any markdown formatting like ```json.
        """

        print("Sending prompt and image to Gemini...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, image],
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        print("Response received:")
        print(response.text)
        
        # Verify JSON
        try:
            data = json.loads(response.text)
            print("\nVerification Successful: Valid JSON returned.")
            print(json.dumps(data, indent=2))
            return True
        except json.JSONDecodeError:
            print("\nVerification Failed: Response is not valid JSON.")
            return False

    except Exception as e:
        print("Error during Gemini call:")
        print(e)
        return False

if __name__ == '__main__':
    test_gemini_image()
