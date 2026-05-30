# How to Use Azure Computer Vision to Extract Text from Images with OCR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Computer Vision, OCR, Text Extraction, AI, Image Processing, Cognitive Services

Description: Extract text from images and documents using Azure Computer Vision OCR capabilities with practical Python code examples and optimization tips.

---

Extracting text from images is one of the most practical applications of AI in business. Whether you are digitizing paper documents, reading text from product labels, extracting information from screenshots, or processing handwritten notes, Optical Character Recognition (OCR) turns visual text into machine-readable data. Azure Computer Vision provides a powerful OCR service that handles printed text, handwritten text, and mixed content in many languages. In this post, I will show you how to set it up and use it effectively.

## Azure Computer Vision OCR Options

Azure offers two main OCR paths:

- **Image Analysis Read (version 4.0)**: The synchronous OCR option for general images. It handles printed text, handwritten text, and mixed content in images, and it can return lines, words, bounding polygons, and confidence scores.
- **Document Intelligence Read**: The recommended option for text-heavy documents, scanned documents, and multi-page files such as PDFs and TIFFs.

I will focus on Image Analysis Read for images and Document Intelligence Read for multi-page PDFs, since those are the current recommended paths for these scenarios.

## Step 1: Create an Azure Computer Vision Resource

Open the Azure Portal and create a new Azure AI Vision resource:

1. Search for "Computer Vision" in the marketplace.
2. Click "Create."
3. Select your subscription and resource group.
4. Choose a supported region, such as East US, West Europe, or Southeast Asia.
5. Give it a name and select the pricing tier (Free F0 for testing, Standard S1 for production).
6. Click "Review + create" and then "Create."

After deployment, go to the resource and copy the endpoint URL and one of the API keys from "Keys and Endpoint." For the PDF example below, use a Document Intelligence resource or an Azure AI services multi-service resource.

## Step 2: Install the SDK

```bash
# Install the Azure AI Vision and Document Intelligence SDKs

pip install azure-ai-vision-imageanalysis azure-ai-documentintelligence
```

## Step 3: Extract Text from a Local Image

Here is a complete example that reads text from a local image file:

```python
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.ai.vision.imageanalysis.models import VisualFeatures
from azure.core.credentials import AzureKeyCredential

# Configure the client with your endpoint and key
endpoint = "https://your-resource.cognitiveservices.azure.com/"
key = "your-api-key"

client = ImageAnalysisClient(endpoint=endpoint, credential=AzureKeyCredential(key))

def extract_text_from_file(image_path):
    """
    Extract text from a local image file using Image Analysis Read.
    Returns a list of text lines with their bounding polygons.
    """
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    result = client.analyze(
        image_data=image_data,
        visual_features=[VisualFeatures.READ]
    )

    # Extract the text from the results
    extracted_lines = []
    if result.read is not None:
        for block in result.read.blocks:
            for line in block.lines:
                extracted_lines.append({
                    "text": line.text,
                    "bounding_polygon": line.bounding_polygon
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
    Supports image formats such as JPEG, PNG, GIF, BMP, WEBP, ICO, TIFF, and MPO.
    """
    result = client.analyze_from_url(
        image_url=image_url,
        visual_features=[VisualFeatures.READ]
    )

    lines = []
    if result.read is not None:
        for block in result.read.blocks:
            for line in block.lines:
                lines.append(line.text)

    return lines


# Extract text from an image URL
url = "https://example.com/sample-document.png"
text_lines = extract_text_from_url(url)
print("\n".join(text_lines))
```

## Step 5: Process Multi-Page PDFs

Use Document Intelligence Read for multi-page PDF and TIFF files. Each page is processed separately in the results.

```python
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

document_client = DocumentIntelligenceClient(
    endpoint=endpoint,
    credential=AzureKeyCredential(key)
)

def extract_text_from_pdf(pdf_path):
    """
    Extract text from a multi-page PDF, organized by page number.
    Returns a dictionary with page numbers as keys and text lists as values.
    """
    with open(pdf_path, "rb") as pdf_stream:
        poller = document_client.begin_analyze_document(
            "prebuilt-read",
            body=pdf_stream
        )

    result = poller.result()
    pages = {}
    for page in result.pages:
        page_num = page.page_number
        page_lines = [line.content for line in page.lines]
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
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    result = client.analyze(
        image_data=image_data,
        visual_features=[VisualFeatures.READ]
    )

    words = []
    if result.read is not None:
        for block in result.read.blocks:
            for line in block.lines:
                for word in line.words:
                    words.append({
                        "text": word.text,
                        "bounding_polygon": word.bounding_polygon,
                        "confidence": word.confidence
                    })

    return words


words = extract_words_with_positions("receipt.jpg")
for w in words:
    print(f"'{w['text']}' (confidence: {w['confidence']:.2f})")
```

## Using the Image Analysis 4.0 REST API

Azure also offers a REST-based approach through the Image Analysis 4.0 API, which provides OCR alongside other image analysis capabilities.

```python
import requests

def ocr_with_analysis_api(image_path, endpoint, key):
    """
    Use the Image Analysis 4.0 API for OCR.
    This is a synchronous call - no polling needed.
    """
    url = f"{endpoint.rstrip('/')}/imageanalysis:analyze"
    params = {
        "features": "read",       # Request the OCR feature
        "overload": "stream",
        "api-version": "2024-02-01"
    }
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream"
    }

    with open(image_path, "rb") as f:
        response = requests.post(url, params=params, headers=headers, data=f)

    response.raise_for_status()
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

**Low image quality**: OCR accuracy drops significantly with blurry, low-resolution, or poorly lit images. If possible, pre-process images before sending them to the API. Increase contrast, sharpen edges, and ensure the text is at least 12 pixels tall in a 1024 x 768 image.

**Rotated or skewed text**: The Read API can handle rotated and skewed text in many images. For severely rotated images, you may need to pre-process with an image rotation correction step.

**Mixed languages**: The Read APIs support many printed and handwritten languages and can handle multiple languages in the same image. You do not need to specify the language in advance for common mixed-language scenarios.

**Handwritten text**: Handwriting recognition works best with clear, separated characters. Heavily stylized or connected cursive writing may produce lower accuracy results.

**Tables and structured layouts**: The Read API extracts text line by line. For table extraction, you will need additional logic to group lines into rows and columns based on their bounding box positions, or use Azure Document Intelligence instead (which is specifically designed for structured document extraction).

## Performance and Cost Tips

For bulk processing, submit multiple files in parallel rather than waiting for each one to complete before starting the next, while staying within your resource's service limits.

Pricing is based on the feature and number of transactions or pages processed. Check the Azure pricing page for current regional prices, and contact Microsoft about volume pricing for high-volume workloads.

Cache your OCR results. If you process the same document multiple times (common in development and testing), store the extracted text alongside the original file to avoid unnecessary API calls.

## Wrapping Up

Azure Computer Vision's OCR capabilities are robust and production-ready. Image Analysis Read handles simple printed and handwritten text in images, while Document Intelligence Read is the better fit for text-heavy and multi-page documents. Start with the SDK for a quick integration, use the Image Analysis 4.0 REST API for synchronous image workflows, and consider Azure Document Intelligence when you need to extract structured data from forms, invoices, or receipts. The key to good OCR results is image quality, so invest time in pre-processing your images before sending them to the API.
