# How to Use Dapr Conversation API for Text Summarization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Summarization, LLM, AI, Microservice

Description: Learn how to build text summarization services using the Dapr Conversation API, processing documents and generating concise summaries with LLMs in microservices.

---

Text summarization is one of the most common LLM use cases - condensing long documents, generating meeting notes, and creating article abstracts. The Dapr Conversation API provides a clean, provider-agnostic interface for building summarization services in microservices.

## Summarization Service Design

A production summarization service needs to handle:
- Documents that exceed LLM context windows (chunking)
- Multiple summary formats (bullet points, paragraph, executive summary)
- Caching to avoid re-summarizing identical content

## Basic Summarization Endpoint

```python
from flask import Flask, request, jsonify
import requests
import hashlib

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"
CONVERSATION_COMPONENT = "openai-conversation"
STATE_STORE = "statestore"

@app.route('/api/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    text = data.get('text', '')
    style = data.get('style', 'paragraph')  # paragraph, bullets, executive

    if not text:
        return jsonify({"error": "text is required"}), 400

    # Check cache first
    cache_key = f"summary:{hashlib.md5(text.encode()).hexdigest()}:{style}"
    cached = get_from_cache(cache_key)
    if cached:
        return jsonify({"summary": cached, "cached": True})

    prompt = build_summary_prompt(text, style)

    response = requests.post(
        f"{DAPR_URL}/v1.0-alpha1/conversation/{CONVERSATION_COMPONENT}/converse",
        json={
            "inputs": [{"content": prompt, "role": "user"}],
            "temperature": 0.3,
            "parameters": {"max_tokens": "600"}
        }
    )
    response.raise_for_status()

    summary = response.json()['outputs'][0]['result']
    save_to_cache(cache_key, summary, ttl_seconds=3600)

    return jsonify({"summary": summary, "cached": False})

def build_summary_prompt(text: str, style: str) -> str:
    prompts = {
        "paragraph": f"Summarize the following text in 2-3 concise paragraphs:\n\n{text}",
        "bullets": f"Summarize the following text as 5-7 bullet points:\n\n{text}",
        "executive": (
            f"Write an executive summary of the following text. Include: "
            f"key findings, main recommendations, and critical risks (max 150 words):\n\n{text}"
        )
    }
    return prompts.get(style, prompts["paragraph"])

def get_from_cache(key: str):
    r = requests.get(f"{DAPR_URL}/v1.0/state/{STATE_STORE}/{key}")
    return r.json() if r.ok and r.content else None

def save_to_cache(key: str, value: str, ttl_seconds: int):
    requests.post(
        f"{DAPR_URL}/v1.0/state/{STATE_STORE}",
        json=[{"key": key, "value": value, "metadata": {"ttlInSeconds": str(ttl_seconds)}}]
    )

if __name__ == '__main__':
    app.run(port=6001)
```

## Handling Long Documents with Chunking

When documents exceed the context window, chunk and summarize recursively:

```python
def chunk_text(text: str, max_chars: int = 3000) -> list:
    """Split text into overlapping chunks."""
    chunks = []
    words = text.split()
    current_chunk = []
    current_len = 0

    for word in words:
        current_chunk.append(word)
        current_len += len(word) + 1

        if current_len >= max_chars:
            chunks.append(' '.join(current_chunk))
            # Overlap: keep last 10% of words for context
            overlap = len(current_chunk) // 10
            current_chunk = current_chunk[-overlap:]
            current_len = sum(len(w) + 1 for w in current_chunk)

    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks

def summarize_long_document(text: str) -> str:
    if len(text) <= 3000:
        return call_llm_summarize(text, "paragraph")

    # Summarize each chunk
    chunks = chunk_text(text)
    chunk_summaries = [call_llm_summarize(chunk, "paragraph") for chunk in chunks]

    # Combine chunk summaries into final summary
    combined = "\n\n".join(chunk_summaries)
    return call_llm_summarize(combined, "executive")

def call_llm_summarize(text: str, style: str) -> str:
    response = requests.post(
        f"{DAPR_URL}/v1.0-alpha1/conversation/{CONVERSATION_COMPONENT}/converse",
        json={
            "inputs": [{"content": build_summary_prompt(text, style), "role": "user"}],
            "temperature": 0.2,
            "parameters": {"max_tokens": "500"}
        }
    )
    return response.json()['outputs'][0]['result']
```

## Testing the Service

```bash
curl -X POST http://localhost:6001/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The microservices architecture pattern structures an application as a collection of small autonomous services, modeled around a business domain. Each service is self-contained and implements a single business capability. Services communicate via APIs, and each runs in its own process. This approach enables teams to deploy and scale services independently...",
    "style": "bullets"
  }'
```

## Summary

The Dapr Conversation API simplifies building text summarization services by abstracting LLM provider details. Combining the Conversation API for LLM calls with Dapr State for caching and a chunking strategy for long documents provides a production-ready summarization service that can switch providers without application changes.
