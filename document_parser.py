import os
from google.api_core.client_options import ClientOptions
from google.cloud import documentai

def parse_document(file_path: str, mime_type: str = "application/pdf") -> dict:
    """
    Parses a document using Google Cloud Document AI.
    Requires exactly PROJECT_ID and PROCESSOR_ID environment variables.
    LOCATION defaults to 'us'.
    """
    project_id = os.environ.get("PROJECT_ID")
    location = os.environ.get("LOCATION", "us")
    processor_id = os.environ.get("PROCESSOR_ID")
    
    if not project_id or not processor_id:
        raise ValueError(
            "Missing Environment Variables. Please set PROJECT_ID and PROCESSOR_ID before running."
        )

    # You must set the api_endpoint if you use a location other than 'us'.
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)

    # The full resource name of the processor, e.g.:
    # projects/project-id/locations/location/processors/processor-id
    name = client.processor_path(project_id, location, processor_id)
    
    # Read the file into memory
    with open(file_path, "rb") as image:
        image_content = image.read()

    # Load Binary Data into Document AI RawDocument Object
    raw_document = documentai.RawDocument(content=image_content, mime_type=mime_type)

    # Configure the process request
    request = documentai.ProcessRequest(name=name, raw_document=raw_document)

    # Recognize text entities in the document
    result = client.process_document(request=request)
    document = result.document

    # Parse the output into our frontend's expected format
    parsed_data = {
        "document_type": "Processed Document",
        "entities": [],
        "line_items": [],
        "raw_text_summary": document.text[:500] + ("..." if document.text and len(document.text) > 500 else "")
    }
    
    # Extract entities and line items
    for entity in document.entities:
        # Document AI specialized parsers (like Invoice) group line item columns as properties inside a 'line_item' entity
        if entity.type == "line_item":
            item_data = {}
            for prop in entity.properties:
                # e.g., 'line_item/description' or 'line_item/amount'
                # Strip the prefix to get the raw column name cleanly
                prop_type = prop.type.split("/")[-1] 
                item_data[prop_type] = prop.mention_text
                
            parsed_data["line_items"].append({
                "description": item_data.get("description", ""),
                "quantity": item_data.get("quantity", ""),
                "unit_price": item_data.get("unit_price", ""),
                "amount": item_data.get("amount", "")
            })
        else:
            parsed_data["entities"].append({
                "type": entity.type,
                "mention_text": entity.mention_text
            })

    return parsed_data
