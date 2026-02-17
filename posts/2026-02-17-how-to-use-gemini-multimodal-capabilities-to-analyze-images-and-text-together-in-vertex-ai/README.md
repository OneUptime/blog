# How to Use Gemini Multimodal Capabilities to Analyze Images and Text Together in Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Multimodal AI, Image Analysis

Description: Learn how to use Gemini's multimodal capabilities in Vertex AI to analyze images alongside text for richer AI-powered applications.

---

One of the most powerful features of Gemini models is their ability to understand both text and images in a single request. Instead of needing separate models for text analysis and image understanding, Gemini can look at an image and answer questions about it, compare multiple images, extract text from screenshots, or generate descriptions based on visual content. This multimodal capability opens up use cases that were previously much harder to build.

## Setting Up

Make sure you have the Vertex AI SDK installed and configured:

```bash
# Install the SDK
pip install google-cloud-aiplatform

# Authenticate
gcloud auth application-default login
```

## Analyzing a Single Image

Let us start with the simplest case - sending an image and asking a question about it:

```python
# analyze_image.py
# Analyze a single image with Gemini

import vertexai
from vertexai.generative_models import GenerativeModel, Image

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')

# Load an image from a local file
image = Image.load_from_file('server-rack.jpg')

# Ask a question about the image
response = model.generate_content([
    image,
    'Describe what you see in this image. If this is a server room or data center, identify any potential issues with the setup.',
])

print(response.text)
```

## Loading Images from Cloud Storage

For production applications, your images are likely in GCS:

```python
# gcs_image.py
# Load and analyze an image from Cloud Storage

import vertexai
from vertexai.generative_models import GenerativeModel, Part

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')

# Load image from GCS using Part.from_uri
image_part = Part.from_uri(
    uri='gs://your-bucket/images/dashboard-screenshot.png',
    mime_type='image/png',
)

response = model.generate_content([
    image_part,
    'This is a monitoring dashboard screenshot. What metrics are shown, and are there any concerning patterns?',
])

print(response.text)
```

## Loading Images from URLs

You can also pass images from URLs:

```python
# url_image.py
# Analyze an image from a URL

import vertexai
from vertexai.generative_models import GenerativeModel, Part

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')

# Load an image from a URL
image_part = Part.from_uri(
    uri='https://example.com/architecture-diagram.png',
    mime_type='image/png',
)

response = model.generate_content([
    image_part,
    'Analyze this architecture diagram. What GCP services are being used and how do they connect?',
])

print(response.text)
```

## Comparing Multiple Images

Gemini can look at multiple images in a single request. This is useful for comparing, finding differences, or analyzing a sequence:

```python
# compare_images.py
# Compare two architecture diagrams

import vertexai
from vertexai.generative_models import GenerativeModel, Image

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')

# Load two images to compare
image_before = Image.load_from_file('architecture-v1.png')
image_after = Image.load_from_file('architecture-v2.png')

# Ask Gemini to compare them
response = model.generate_content([
    'Compare these two architecture diagrams. The first is the current architecture and the second is the proposed change.',
    image_before,
    'Current architecture (above)',
    image_after,
    'Proposed architecture (above)',
    'What are the key differences? What are the benefits and risks of the proposed changes?',
])

print(response.text)
```

## Extracting Text from Images (OCR)

Gemini is very good at reading text from images, which makes it useful for processing screenshots, documents, and whiteboard photos:

```python
# ocr.py
# Extract and analyze text from an image

import vertexai
from vertexai.generative_models import GenerativeModel, Image

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')

# Load a screenshot containing error logs
image = Image.load_from_file('error-screenshot.png')

response = model.generate_content([
    image,
    'Extract all the error messages visible in this screenshot. For each error, explain what it means and suggest a fix.',
])

print(response.text)
```

## Analyzing Charts and Graphs

Gemini can interpret charts, making it useful for automated report analysis:

```python
# analyze_chart.py
# Analyze a monitoring chart

import vertexai
from vertexai.generative_models import GenerativeModel, Image

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')

# Load a Cloud Monitoring chart
chart_image = Image.load_from_file('cpu-usage-chart.png')

response = model.generate_content([
    chart_image,
    """Analyze this CPU usage chart and answer:
    1. What is the average CPU utilization?
    2. Are there any spikes? When do they occur?
    3. Is there a trending pattern (increasing, decreasing, stable)?
    4. Based on this data, would you recommend scaling up?""",
])

print(response.text)
```

## Combining Images with Detailed Text Prompts

For complex analysis, combine images with detailed text context:

```python
# detailed_analysis.py
# Complex multimodal analysis with context

import vertexai
from vertexai.generative_models import GenerativeModel, Image, GenerationConfig

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel(
    'gemini-1.5-pro',
    system_instruction=[
        'You are a senior cloud architect reviewing infrastructure diagrams.',
        'Focus on security, scalability, and cost optimization.',
        'Reference GCP best practices in your analysis.',
    ],
)

# Load the architecture diagram
diagram = Image.load_from_file('infrastructure-diagram.png')

config = GenerationConfig(
    temperature=0.3,  # Lower temperature for more factual analysis
    max_output_tokens=2048,
)

response = model.generate_content(
    [
        diagram,
        """Review this infrastructure diagram for a production e-commerce platform on GCP.

        Context:
        - Expected traffic: 10,000 requests per second at peak
        - Data sensitivity: PCI DSS compliance required
        - Budget: Mid-range, need to balance cost and performance
        - Team size: 5 engineers

        Please evaluate:
        1. Security posture
        2. High availability and disaster recovery
        3. Scalability for the expected traffic
        4. Any missing components or anti-patterns
        5. Cost optimization opportunities""",
    ],
    generation_config=config,
)

print(response.text)
```

## Processing Images in a Loop

For batch processing multiple images:

```python
# batch_process.py
# Process multiple images with Gemini

import vertexai
from vertexai.generative_models import GenerativeModel, Image
import os

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-flash')

# Process all images in a directory
image_dir = './monitoring-screenshots/'
results = []

for filename in os.listdir(image_dir):
    if filename.endswith(('.png', '.jpg', '.jpeg')):
        print(f"Processing: {filename}")

        image = Image.load_from_file(os.path.join(image_dir, filename))

        response = model.generate_content([
            image,
            'Briefly describe any issues or anomalies visible in this monitoring screenshot. If everything looks normal, say so.',
        ])

        results.append({
            'filename': filename,
            'analysis': response.text,
        })

# Print all results
for result in results:
    print(f"\n--- {result['filename']} ---")
    print(result['analysis'])
```

## Multimodal Chat

You can also use images in multi-turn conversations:

```python
# multimodal_chat.py
# Chat conversation that includes images

import vertexai
from vertexai.generative_models import GenerativeModel, Image

vertexai.init(
    project='your-project-id',
    location='us-central1',
)

model = GenerativeModel('gemini-1.5-pro')
chat = model.start_chat()

# First turn - send an architecture diagram
diagram = Image.load_from_file('current-architecture.png')
response = chat.send_message([
    diagram,
    'This is our current architecture. Can you identify the main components?',
])
print(f"Gemini: {response.text}\n")

# Second turn - ask a follow-up about the image
response = chat.send_message(
    'What would you change to make this architecture more resilient to zone failures?'
)
print(f"Gemini: {response.text}\n")

# Third turn - send another image for comparison
new_diagram = Image.load_from_file('proposed-architecture.png')
response = chat.send_message([
    new_diagram,
    'Here is the proposed architecture. Does it address the resilience issues you identified?',
])
print(f"Gemini: {response.text}")
```

## Supported Image Formats

Gemini supports these image formats:
- PNG
- JPEG
- GIF (including animated GIFs)
- WebP
- BMP

The maximum image size varies by model, but generally images up to 20 MB are supported. For best results, keep images under 4 MB.

## Tips for Better Results

Be specific in your prompts. Instead of "What is in this image?", ask specific questions like "What GCP services are shown in this architecture diagram?"

Provide context. Tell the model what the image represents and what kind of analysis you need. A monitoring screenshot and a marketing infographic need very different analysis approaches.

Use system instructions to set the model's expertise area. If you are analyzing infrastructure diagrams, tell the model it is a cloud architect.

For OCR tasks, use high-resolution images when possible. Blurry or low-resolution text is harder for the model to read.

## Wrapping Up

Gemini's multimodal capabilities in Vertex AI let you build applications that understand both text and images. Whether you are automating the analysis of monitoring dashboards, extracting information from documents, comparing architecture diagrams, or building interactive tools that combine visual and textual understanding, the API makes it straightforward. Start with simple single-image analysis and work your way up to complex multi-image, multi-turn conversations.
