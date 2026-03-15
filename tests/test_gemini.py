import os
import sys
from google import genai
from dotenv import load_dotenv

load_dotenv()

def test_gemini():
    print("Python executable:", sys.executable)
    print("Environment variables:")
    print("PROJECT_ID:", os.environ.get("PROJECT_ID"))
    print("PROCESSOR_ID:", os.environ.get("PROCESSOR_ID"))
    print("LOCATION:", os.environ.get("LOCATION"))
    print("GEMINI_API_KEY:", "Present" if os.environ.get("GEMINI_API_KEY") else "Missing")

    try:
        # Try initializing with API key first
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            print("Initializing client with API key...")
            client = genai.Client(api_key=api_key)
        else:
            print("Initializing client with default credentials (likely Vertex AI)...")
            # For Vertex AI, we might need project and location
            project = os.environ.get("PROJECT_ID")
            location = "us-central1" # Explicitly use us-central1 for Vertex AI Gemini
            if project:
                print(f"Using Vertex AI with project={project}, location={location}")
                client = genai.Client(vertexai=True, project=project, location=location)
            else:
                print("No API key or Project ID found. Trying default Client initialization.")
                client = genai.Client()

        print("Sending simple prompt...")
        try:
            print("Trying gemini-2.5-flash...")
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents='Hello, you are Gemini. Confirm your identity.',
            )
            print("Response received (gemini-2.5-flash):")
            print(response.text)
            return True
        except Exception as e:
            print("Error with gemini-2.5-flash:")
            print(e)
            
            print("Trying gemini-1.5-pro...")
            try:
                response = client.models.generate_content(
                    model='gemini-1.5-pro',
                    contents='Hello, you are Gemini. Confirm your identity.',
                )
                print("Response received (gemini-1.5-pro):")
                print(response.text)
                return True
            except Exception as e2:
                print("Error with gemini-1.5-pro:")
                print(e2)
                
                print("Trying gemini-1.5-flash...")
                try:
                    response = client.models.generate_content(
                        model='gemini-1.5-flash',
                        contents='Hello, you are Gemini. Confirm your identity.',
                    )
                    print("Response received (gemini-1.5-flash):")
                    print(response.text)
                    return True
                except Exception as e3:
                    print("Error with gemini-1.5-flash:")
                    print(e3)
                    return False
        print("Response received:")
        print(response.text)
        return True
    except Exception as e:
        print("Error during Gemini call:")
        print(e)
        return False

if __name__ == '__main__':
    test_gemini()
