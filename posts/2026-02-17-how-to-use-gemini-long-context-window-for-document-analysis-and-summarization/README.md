# How to Use Gemini Long Context Window for Document Analysis and Summarization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, Long Context, Document Analysis

Description: Learn how to leverage Gemini's million-token context window for analyzing and summarizing large documents, reports, and codebases on Vertex AI.

---

Working with long documents has always been a pain point with LLMs. You either had to chunk the content into pieces, losing context between chunks, or use expensive retrieval pipelines that sometimes missed relevant sections. Gemini changed this with its million-token context window. You can now feed entire books, lengthy reports, or large codebases directly into the model and ask questions about them.

In this post, I will show you how to use Gemini's long context capabilities for practical document analysis and summarization tasks.

## Understanding the Context Window

Gemini 2.0 Flash supports up to 1 million tokens in its context window. To put that in perspective, 1 million tokens is roughly 750,000 words - that is about 10 average novels or 1,500 pages of technical documentation. For most document analysis use cases, you can fit the entire source material into a single prompt.

This does not mean you should always dump everything in. Token usage affects cost and latency. But for documents under a few hundred pages, the simplicity of "just put it all in" is hard to beat.

## Loading and Sending Documents

The simplest approach is reading document text and including it in your prompt. Here is how to analyze a text document:

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

model = GenerativeModel("gemini-2.0-flash")

# Read a large document from a local file
with open("quarterly_report.txt", "r") as f:
    document_text = f.read()

# Ask the model to analyze the document
response = model.generate_content([
    f"Here is a quarterly financial report:\n\n{document_text}",
    "\n\nPlease provide a structured summary with these sections: "
    "1) Key financial highlights, "
    "2) Revenue trends, "
    "3) Notable risks mentioned, "
    "4) Forward-looking statements."
])

print(response.text)
```

## Working with PDF Files

Gemini can process PDF files natively through the API. You do not need to extract text first - just send the raw PDF bytes and the model handles the rest, including any images, tables, and charts in the document.

This code sends a PDF for analysis:

```python
import base64

# Load a PDF file and send it directly to Gemini
with open("annual_report.pdf", "rb") as f:
    pdf_bytes = f.read()

# Create a Part from the PDF bytes
pdf_part = Part.from_data(
    data=pdf_bytes,
    mime_type="application/pdf"
)

# Ask specific questions about the PDF content
response = model.generate_content([
    pdf_part,
    "Analyze this annual report and answer the following questions:\n"
    "1. What was the total revenue for the fiscal year?\n"
    "2. Which business segment showed the highest growth?\n"
    "3. What are the top 3 risk factors mentioned?\n"
    "4. Summarize the CEO's letter in 3 bullet points."
])

print(response.text)
```

## Processing Multiple Documents Together

One powerful use case is cross-document analysis. Load multiple documents into a single prompt and ask the model to compare, synthesize, or find contradictions across them.

Here is how to compare multiple documents:

```python
# Load multiple related documents
documents = {}
for filename in ["report_q1.txt", "report_q2.txt", "report_q3.txt", "report_q4.txt"]:
    with open(filename, "r") as f:
        documents[filename] = f.read()

# Build the prompt with all documents
parts = []
for name, content in documents.items():
    parts.append(f"=== {name} ===\n{content}\n\n")

prompt = "".join(parts) + """
Compare the four quarterly reports above and provide:
1. Revenue trend across all quarters
2. Key themes that appear consistently
3. New issues that emerged in later quarters
4. An overall assessment of the year's trajectory
"""

response = model.generate_content(prompt)
print(response.text)
```

## Structured Summarization

For repeatable analysis, you want structured output. Gemini can generate JSON summaries that you can parse and use programmatically.

This code extracts structured data from a document:

```python
from vertexai.generative_models import GenerationConfig

# Configure the model to output valid JSON
generation_config = GenerationConfig(
    response_mime_type="application/json",
    response_schema={
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "executive_summary": {"type": "string"},
            "key_metrics": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "metric_name": {"type": "string"},
                        "value": {"type": "string"},
                        "trend": {"type": "string", "enum": ["up", "down", "flat"]}
                    }
                }
            },
            "risks": {
                "type": "array",
                "items": {"type": "string"}
            },
            "action_items": {
                "type": "array",
                "items": {"type": "string"}
            }
        }
    }
)

response = model.generate_content(
    [document_text, "\n\nExtract a structured summary from this document."],
    generation_config=generation_config
)

import json
summary = json.loads(response.text)
print(f"Title: {summary['title']}")
print(f"Key metrics: {len(summary['key_metrics'])} found")
```

## Chunked Summarization for Very Large Documents

Even with a million-token context, you might encounter documents that exceed the limit, or you might want to reduce costs. In those cases, a map-reduce approach works well: summarize sections individually, then combine the summaries.

```python
def chunk_text(text, chunk_size=100000):
    """Split text into chunks at paragraph boundaries."""
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) > chunk_size and current_chunk:
            chunks.append(current_chunk)
            current_chunk = para
        else:
            current_chunk += "\n\n" + para if current_chunk else para

    if current_chunk:
        chunks.append(current_chunk)
    return chunks

def map_reduce_summarize(text, model):
    """Summarize a very large document using map-reduce."""
    chunks = chunk_text(text)

    # Map phase - summarize each chunk
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        response = model.generate_content(
            f"Summarize this section (part {i+1} of {len(chunks)}):\n\n{chunk}"
        )
        chunk_summaries.append(response.text)

    # Reduce phase - combine summaries into a final summary
    combined = "\n\n---\n\n".join(chunk_summaries)
    final_response = model.generate_content(
        f"Here are summaries of different sections of a document:\n\n{combined}"
        "\n\nCombine these into a single coherent summary that captures all key points."
    )
    return final_response.text
```

## Building a Document QA Pipeline

A common pattern is loading a document once and then asking multiple questions about it in a conversation.

```python
# Load the document into a chat session for interactive QA
chat = model.start_chat()

# First message includes the full document
with open("technical_spec.txt", "r") as f:
    spec_text = f.read()

response = chat.send_message(
    f"I am going to share a technical specification document with you. "
    f"Please read it carefully and be ready to answer questions.\n\n{spec_text}"
)

# Now ask multiple questions in the same session
questions = [
    "What are the system requirements listed in the spec?",
    "Are there any backwards compatibility concerns mentioned?",
    "Summarize the API changes in this version.",
    "What testing approach does the spec recommend?",
]

for q in questions:
    response = chat.send_message(q)
    print(f"Q: {q}")
    print(f"A: {response.text}\n")
```

## Token Counting and Cost Management

Before sending large documents, check token counts to estimate costs and ensure you stay within limits.

```python
# Count tokens before sending to estimate costs
content_to_send = [document_text, "\n\nSummarize this document."]

token_count = model.count_tokens(content_to_send)
print(f"Input tokens: {token_count.total_tokens}")
print(f"Estimated cost: ${token_count.total_tokens * 0.000000075:.4f}")

# Only proceed if within budget
MAX_TOKENS = 500000
if token_count.total_tokens <= MAX_TOKENS:
    response = model.generate_content(content_to_send)
    print(response.text)
else:
    print(f"Document too large ({token_count.total_tokens} tokens). Using chunked approach.")
    result = map_reduce_summarize(document_text, model)
    print(result)
```

## Performance Considerations

Long context requests take longer to process. Here are some tips to manage latency:

- Use streaming for long outputs so users see results faster
- Set a reasonable max_output_tokens to avoid unnecessarily long responses
- Cache document analysis results when the same document is queried repeatedly
- Use Gemini Flash for most document tasks - it is faster and cheaper than Pro while handling the same context length

## Wrapping Up

Gemini's long context window eliminates much of the complexity around document analysis. For most practical use cases, you can skip the chunking and retrieval pipelines and just feed the entire document into the model. Start with simple text-in, analysis-out patterns, then add structured output and multi-document comparison as your needs grow. Monitor your token usage and latency with tools like OneUptime to keep costs and performance in check.
