# How to Use Azure Computer Vision to Extract Text from Images with OCR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Computer Vision, OCR, Text Extraction, AI, Image Processing, Cognitive Services

Description: Extract text from images and documents using Azure Computer Vision OCR capabilities with practical Python code examples and optimization tips.

---

Extracting text from images is one of the most practical applications of AI in business. Whether you are digitizing paper documents, reading text from product labels, extracting information from screenshots, or processing handwritten notes, Optical Character Recognition (OCR) turns visual text into machine-readable data. Azure Computer Vision provides a powerful OCR service that handles printed text, handwritten text, and mixed content in over 100 languages. In this post, I will show you how to set it up and use it effectively.

## Azure Computer Vision OCR Options

Azure offers two OCR capabilities through the Computer Vision service:

- **Read API (OCR 4.0)**: The latest and most capable option. It handles printed text, handwritten text, mixed content, and complex layouts. It works with images and multi-page documents (PDF and TIFF). This is the recommended option for most use cases.
- **OCR API (legacy)**: An older, synchronous API that works for simple single-image OCR. It is faster for simple cases but less accurate on complex layouts.

I will focus on the Read API since it covers all scenarios and produces the best results.

## Step 1: Create an Azure Computer Vision Resource

Open the Azure Portal and create a new Computer Vision resource:

1. Search for "Computer Vision" in the marketplace.
2. Click "Create."
3. Select your subscription and resource group.
4. Choose a region (East US, West Europe, and Southeast Asia have the best availability).
5. Give it a name and select the pricing tier (Free F0 for testing, Standard S1 for production).
6. Click "Review + create" and then "Create."

After deployment, go to the resource and copy the endpoint URL and one of the API keys from "Keys and Endpoint."

## Step 2: Install the SDK

```bash
# Install the Azure Computer Vision SDK
pip install azure-cognitiveservices-vision-computervision
```

## Step 3: Extract Text from a Local Image

Here is a complete example that reads text from a local image file:

```python
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from msrest.authentication import CognitiveServicesCredentials
import time

# Configure the client with your endpoint and key
endpoint = "https://your-resource.cognitiveservices.azure.com/"
key = "your-api-key"

client = ComputerVisionClient(endpoint, CognitiveServicesCredentials(key))

def extract_text_from_file(image_path):
    """
    Extract text from a local image or PDF file using the Read API.
    Returns a list of text lines with their bounding boxes.
    """
    # Open the file and submit it for reading
    with open(image_path, "rb") as image_stream:
        read_response = client.read_in_stream(image_stream, raw=True)

    # Get the operation ID from the response headers
    operation_location = read_response.headers["Operation-Location"]
    operation_id = operation_location.split("/")[-1]

    # Poll for the result (the Read API is asynchronous)
    while True:
        result = client.get_read_result(operation_id)
        if result.status not in [OperationStatusCodes.running, OperationStatusCodes.not_started]:
            break
        time.sleep(1)  # Wait 1 second between polls

    # Extract the text from the results
    extracted_lines = []
    if result.status == OperationStatusCodes.succeeded:
        for page in result.analyze_result.read_results:
            for line in page.lines:
                extracted_lines.append({
                    "text": line.text,
                    "bounding_box": line.bounding_box,
                    "confidence": getattr(line, 'confidence', None)
                })

    return extracted_lines


# Use the function
lines = extract_text_from_file("invoice.png")
for line in lines:
    print(f"Text: {line['text']}")
```

## Step 4: Extract Text from a URL

If your image is available at a URL, you can process it directly without downloading first:

```python
def extract_text_from_url(image_url):
    """
    Extract text from an image at a URL.
    Supports JPEG, PNG, GIF, BMP, PDF, and TIFF formats.
    """
    read_response = client.read(image_url, raw=True)

    operation_location = read_response.headers["Operation-Location"]
    operation_id = operation_location.split("/")[-1]

    # Poll for completion
    while True:
        result = client.get_read_result(operation_id)
        if result.status not in [OperationStatusCodes.running, OperationStatusCodes.not_started]:
            break
        time.sleep(1)

    lines = []
    if result.status == OperationStatusCodes.succeeded:
        for page in result.analyze_result.read_results:
            for line in page.lines:
                lines.append(line.text)

    return lines


# Extract text from an image URL
url = "https://example.com/sample-document.png"
text_lines = extract_text_from_url(url)
print("\n".join(text_lines))
```

## Step 5: Process Multi-Page PDFs

The Read API natively supports multi-page PDF and TIFF files. Each page is processed separately in the results.

```python
def extract_text_from_pdf(pdf_path):
    """
    Extract text from a multi-page PDF, organized by page number.
    Returns a dictionary with page numbers as keys and text lists as values.
    """
    with open(pdf_path, "rb") as pdf_stream:
        read_response = client.read_in_stream(pdf_stream, raw=True)

    operation_id = read_response.headers["Operation-Location"].split("/")[-1]

    # Wait for processing
    while True:
        result = client.get_read_result(operation_id)
        if result.status not in [OperationStatusCodes.running, OperationStatusCodes.not_started]:
            break
        time.sleep(2)  # PDFs take longer - check every 2 seconds

    pages = {}
    if result.status == OperationStatusCodes.succeeded:
        for page_result in result.analyze_result.read_results:
            page_num = page_result.page
            page_lines = [line.text for line in page_result.lines]
            pages[page_num] = page_lines
            print(f"Page {page_num}: {len(page_lines)} lines extracted")

    return pages


# Process a multi-page PDF
pdf_pages = extract_text_from_pdf("contract.pdf")
for page_num, lines in pdf_pages.items():
    print(f"\n--- Page {page_num} ---")
    for line in lines:
        print(line)
```

## Step 6: Extract Text with Word-Level Details

For more granular results, you can access individual words with their bounding boxes and confidence scores. This is useful when you need to locate specific text within an image or when you need per-word confidence.

```python
def extract_words_with_positions(image_path):
    """
    Extract individual words with their positions and confidence scores.
    Useful for structured data extraction or overlay rendering.
    """
    with open(image_path, "rb") as image_stream:
        read_response = client.read_in_stream(image_stream, raw=True)

    operation_id = read_response.headers["Operation-Location"].split("/")[-1]

    while True:
        result = client.get_read_result(operation_id)
        if result.status not in [OperationStatusCodes.running, OperationStatusCodes.not_started]:
            break
        time.sleep(1)

    words = []
    if result.status == OperationStatusCodes.succeeded:
        for page in result.analyze_result.read_results:
            for line in page.lines:
                for word in line.words:
                    words.append({
                        "text": word.text,
                        "bounding_box": word.bounding_box,
                        "confidence": word.confidence
                    })

    return words


words = extract_words_with_positions("receipt.jpg")
for w in words:
    print(f"'{w['text']}' (confidence: {w['confidence']:.2f})")
```

## Using the Newer Image Analysis 4.0 API

Azure also offers a newer REST-based approach through the Image Analysis 4.0 API, which provides OCR alongside other image analysis capabilities.

```python
import requests

def ocr_with_analysis_api(image_path, endpoint, key):
    """
    Use the Image Analysis 4.0 API for OCR.
    This is a synchronous call - no polling needed.
    """
    url = f"{endpoint}computervision/imageanalysis:analyze"
    params = {
        "features": "read",       # Request the OCR feature
        "api-version": "2024-02-01"
    }
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream"
    }

    with open(image_path, "rb") as f:
        response = requests.post(url, params=params, headers=headers, data=f)

    result = response.json()

    # Extract text blocks from the response
    if "readResult" in result:
        for block in result["readResult"]["blocks"]:
            for line in block["lines"]:
                print(f"Text: {line['text']}")
                for word in line["words"]:
                    print(f"  Word: '{word['text']}' "
                          f"(confidence: {word['confidence']:.2f})")

    return result
```

## Handling Common OCR Challenges

**Low image quality**: OCR accuracy drops significantly with blurry, low-resolution, or poorly lit images. If possible, pre-process images before sending them to the API. Increase contrast, sharpen edges, and ensure the text is at least 50 pixels tall.

**Rotated or skewed text**: The Read API handles moderate rotation (up to about 40 degrees) automatically. For severely rotated images, you may need to pre-process with an image rotation correction step.

**Mixed languages**: The Read API supports over 100 languages and can handle multiple languages in the same image. You do not need to specify the language in advance - it is detected automatically.

**Handwritten text**: Handwriting recognition works best with clear, separated characters. Heavily stylized or connected cursive writing may produce lower accuracy results.

**Tables and structured layouts**: The Read API extracts text line by line. For table extraction, you will need additional logic to group lines into rows and columns based on their bounding box positions, or use Azure Document Intelligence instead (which is specifically designed for structured document extraction).

## Performance and Cost Tips

The Read API processes about 500 pages per minute. For bulk processing, submit multiple files in parallel rather than waiting for each one to complete before starting the next.

Pricing is per page (1000 pages costs about $1.50 on the Standard tier). For high-volume workloads, contact Microsoft about volume pricing.

Cache your OCR results. If you process the same document multiple times (common in development and testing), store the extracted text alongside the original file to avoid unnecessary API calls.

## Wrapping Up

Azure Computer Vision's OCR capabilities are robust and production-ready. The Read API handles everything from simple printed text to complex multi-page documents with mixed handwritten and printed content. Start with the SDK for a quick integration, use the newer Image Analysis 4.0 API for synchronous workflows, and consider Azure Document Intelligence when you need to extract structured data from forms, invoices, or receipts. The key to good OCR results is image quality, so invest time in pre-processing your images before sending them to the API.
