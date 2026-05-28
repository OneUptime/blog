# How to Implement Context Caching with Gemini on Vertex AI to Reduce Token Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Gemini, Context Caching, Cost Optimization

Description: Learn how to use context caching with Gemini on Vertex AI to dramatically reduce token costs when repeatedly querying against the same large context.

---

Every time you send a large document, codebase, or conversation history to Gemini, you pay for all those input tokens. If you are asking multiple questions about the same 100-page document, you are paying to send those 100 pages with every single request. Context caching fixes this by letting you store the context once and reference it in subsequent requests, paying a discounted cached-input rate, cached storage, and your new query tokens.

For applications like document Q&A, code analysis, or customer support over long conversation histories, context caching can reduce costs by 50-90% depending on the ratio of context size to query size.

## How Context Caching Works

Without caching, every request includes the full context plus the query. With caching, you upload the context once to create a cache, then each subsequent request only includes the query and a reference to the cached context.

```mermaid
sequenceDiagram
    participant App as Application
    participant Cache as Gemini Cache
    participant Model as Gemini Model

    Note over App, Model: Without Caching
    App->>Model: [100 pages + Query 1] = 50K tokens
    App->>Model: [100 pages + Query 2] = 50K tokens
    App->>Model: [100 pages + Query 3] = 50K tokens
    Note over App: Total: 150K input tokens

    Note over App, Model: With Caching
    App->>Cache: Cache 100 pages (one time)
    App->>Model: [Cache ref + Query 1] = 200 tokens
    App->>Model: [Cache ref + Query 2] = 200 tokens
    App->>Model: [Cache ref + Query 3] = 200 tokens
    Note over App: Total: cache creation + discounted cached tokens + 600 new input tokens
```

## Creating a Cached Context

Start by uploading your context to create a cache. The context can be text, code, or any content that Gemini accepts.

This code creates a cached context from a large document:

```python
from google import genai
from google.genai.types import Content, CreateCachedContentConfig, HttpOptions, Part

# Initialize the Google Gen AI SDK for Vertex AI
client = genai.Client(
    vertexai=True,
    project="your-project-id",
    location="us-central1",
    http_options=HttpOptions(api_version="v1"),
)

# Create the cached content from a large document
# The document is stored in GCS
cached_content = client.caches.create(
    model="gemini-2.5-pro",
    config=CreateCachedContentConfig(
        system_instruction="You are a technical documentation expert. Answer questions based only on the provided documentation. If the answer is not in the documentation, say so.",
        contents=[
            Content(
                role="user",
                parts=[
                    Part.from_uri(
                        file_uri="gs://your-bucket/documents/product-documentation.pdf",
                        mime_type="application/pdf"
                    )
                ],
            )
        ],
        ttl="3600s",  # Cache expires after 1 hour
        display_name="product-docs-cache",
    )
)

print(f"Cache created: {cached_content.name}")
print(f"Expires at: {cached_content.expire_time}")
print(f"Token count: {cached_content.usage_metadata.total_token_count}")
```

## Querying Against the Cached Context

Once the cache exists, send queries that reference it without resending the full context.

This code queries the cached context:

```python
from google.genai.types import GenerateContentConfig

# Query 1 - only the query tokens are billed as new input
response1 = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="What are the system requirements for installation?",
    config=GenerateContentConfig(cached_content=cached_content.name),
)
print(f"Query 1: {response1.text}")

# Query 2 - same cached context, different question
response2 = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="How do I configure SSL certificates?",
    config=GenerateContentConfig(cached_content=cached_content.name),
)
print(f"Query 2: {response2.text}")

# Query 3
response3 = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="What are the known limitations of the API?",
    config=GenerateContentConfig(cached_content=cached_content.name),
)
print(f"Query 3: {response3.text}")

# Check usage - most tokens come from cache, not new input
print(f"\nUsage for query 3:")
print(f"  Cached tokens: {response3.usage_metadata.cached_content_token_count}")
print(f"  Prompt tokens: {response3.usage_metadata.prompt_token_count}")
print(f"  New prompt tokens: {response3.usage_metadata.prompt_token_count - response3.usage_metadata.cached_content_token_count}")
print(f"  Response tokens: {response3.usage_metadata.candidates_token_count}")
```

## Caching Multiple Documents

You can cache multiple documents together, which is useful for analyzing a collection of related files.

This code caches a set of source code files:

```python
from google.genai.types import Content, CreateCachedContentConfig, GenerateContentConfig, Part

# Cache an entire codebase for analysis
cached_code = client.caches.create(
    model="gemini-2.5-pro",
    config=CreateCachedContentConfig(
        system_instruction=(
            "You are a senior software engineer reviewing this codebase. "
            "Answer questions about the code architecture, potential bugs, "
            "and improvement opportunities."
        ),
        contents=[
            Content(
                role="user",
                parts=[
                    Part.from_uri(file_uri="gs://your-bucket/code/main.py", mime_type="text/x-python"),
                    Part.from_uri(file_uri="gs://your-bucket/code/models.py", mime_type="text/x-python"),
                    Part.from_uri(file_uri="gs://your-bucket/code/api.py", mime_type="text/x-python"),
                    Part.from_uri(file_uri="gs://your-bucket/code/database.py", mime_type="text/x-python"),
                    Part.from_uri(file_uri="gs://your-bucket/code/auth.py", mime_type="text/x-python"),
                    Part.from_uri(file_uri="gs://your-bucket/code/utils.py", mime_type="text/x-python"),
                    Part.from_uri(file_uri="gs://your-bucket/code/tests/test_api.py", mime_type="text/x-python"),
                    Part.from_uri(file_uri="gs://your-bucket/code/tests/test_models.py", mime_type="text/x-python"),
                ],
            )
        ],
        ttl="7200s",  # 2 hour TTL for a longer code review session
        display_name="codebase-review-cache",
    )
)

# Now ask multiple questions about the codebase cheaply

# Architecture overview
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Describe the overall architecture of this application.",
    config=GenerateContentConfig(cached_content=cached_code.name),
)
print(response.text)

# Security review
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="Are there any security vulnerabilities in the authentication code?",
    config=GenerateContentConfig(cached_content=cached_code.name),
)
print(response.text)

# Performance review
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="What are the potential performance bottlenecks in the database layer?",
    config=GenerateContentConfig(cached_content=cached_code.name),
)
print(response.text)
```

## Managing Cache Lifecycle

Caches have a TTL (time to live) after which they are automatically deleted. You can also manage them manually.

This code manages cache lifecycle:

```python
from google.genai.types import UpdateCachedContentConfig

# List all active caches
caches = client.caches.list()
for cache in caches:
    print(f"Cache: {cache.display_name}")
    print(f"  Name: {cache.name}")
    print(f"  Expires: {cache.expire_time}")
    print(f"  Tokens: {cache.usage_metadata.total_token_count}")
    print()

# Update the TTL of an existing cache
cached_content = client.caches.update(
    name=cached_content.name,
    config=UpdateCachedContentConfig(ttl="7200s"),
)  # Extend to 2 hours
print(f"Updated expiry: {cached_content.expire_time}")

# Or set a specific expiration time
from datetime import datetime, timedelta, timezone

new_expire = datetime.now(timezone.utc) + timedelta(hours=4)
cached_content = client.caches.update(
    name=cached_content.name,
    config=UpdateCachedContentConfig(expire_time=new_expire),
)

# Delete a cache when you are done
client.caches.delete(name=cached_content.name)
print("Cache deleted")
```

## Building a Cost-Efficient Q&A Service

Here is a practical example of a document Q&A service that uses context caching to minimize costs.

This code implements a cached Q&A service:

```python
# qa_service.py - Document Q&A with context caching

from google import genai
from google.genai.types import (
    Content,
    CreateCachedContentConfig,
    GenerateContentConfig,
    HttpOptions,
    Part,
)
from datetime import datetime, timezone

class CachedQAService:
    """Q&A service that uses context caching for cost efficiency."""

    def __init__(self, project_id, location="us-central1"):
        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location,
            http_options=HttpOptions(api_version="v1"),
        )
        self.model_name = "gemini-2.5-flash"  # Flash is cheaper for Q&A
        self._caches = {}  # document_id -> (cache_name, expire_time)

    def _get_or_create_cache(self, document_id, document_uri, mime_type):
        """Get existing cache or create a new one for the document."""
        # Check if we have a valid cache
        if document_id in self._caches:
            cache_name, expire_time = self._caches[document_id]
            if datetime.now(timezone.utc) < expire_time:
                return cache_name  # Cache is still valid

            # Cache expired, clean up
            try:
                self.client.caches.delete(name=cache_name)
            except Exception:
                pass

        # Create a new cache
        cache = self.client.caches.create(
            model=self.model_name,
            config=CreateCachedContentConfig(
                system_instruction=(
                    "Answer questions based strictly on the provided document. "
                    "Be concise and cite relevant sections when possible. "
                    "If the information is not in the document, clearly state that."
                ),
                contents=[
                    Content(
                        role="user",
                        parts=[Part.from_uri(file_uri=document_uri, mime_type=mime_type)],
                    )
                ],
                ttl="3600s",  # 1 hour
                display_name=f"qa-cache-{document_id}",
            )
        )

        self._caches[document_id] = (cache.name, cache.expire_time)

        return cache.name

    def ask(self, document_id, document_uri, mime_type, question):
        """Ask a question about a document."""
        cache_name = self._get_or_create_cache(document_id, document_uri, mime_type)
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=question,
            config=GenerateContentConfig(cached_content=cache_name),
        )

        return {
            "answer": response.text,
            "cached_tokens": response.usage_metadata.cached_content_token_count,
            "new_input_tokens": response.usage_metadata.prompt_token_count - response.usage_metadata.cached_content_token_count,
            "output_tokens": response.usage_metadata.candidates_token_count
        }

    def cleanup(self):
        """Delete all active caches."""
        for document_id, (cache_name, _) in self._caches.items():
            try:
                self.client.caches.delete(name=cache_name)
                print(f"Deleted cache for {document_id}")
            except Exception as e:
                print(f"Error deleting cache for {document_id}: {e}")
        self._caches.clear()

# Usage
service = CachedQAService("your-project-id")

# First question creates the cache
result = service.ask(
    document_id="annual-report-2025",
    document_uri="gs://your-bucket/reports/annual-2025.pdf",
    mime_type="application/pdf",
    question="What was the total revenue for 2025?"
)
print(f"Answer: {result['answer']}")
print(f"Cached tokens: {result['cached_tokens']}")
print(f"New tokens: {result['new_input_tokens']}")

# Subsequent questions reuse the cache
result = service.ask(
    document_id="annual-report-2025",
    document_uri="gs://your-bucket/reports/annual-2025.pdf",
    mime_type="application/pdf",
    question="What were the main risk factors mentioned?"
)
print(f"Answer: {result['answer']}")
```

## Cost Comparison

Let us calculate the actual savings for a realistic scenario. Say you have a 200-page document (roughly 100,000 tokens) and you ask 20 questions about it.

Without caching:
```text
20 requests x 100,000 input tokens = 2,000,000 input tokens
At $1.25 per 1M tokens (Gemini 2.5 Pro, <=200K-token input) = $2.50
```

With caching:
```text
Cache creation input: 100,000 tokens x $1.25/1M = $0.125
20 requests x 100,000 cached input tokens x $0.13/1M = $0.26
20 requests x ~200 query tokens = 4,000 new input tokens
Cache storage: 100,000 tokens x 1 hour x $4.50/1M/hr = $0.45
New input tokens: 4,000 x $1.25/1M = $0.005
Total: ~$0.84
```

That is about a 66% cost reduction for 20 questions against the same document. The savings increase with more questions, longer sessions, and larger documents.

## When Context Caching Makes Sense

Context caching is most valuable when you have a large, static context that you query multiple times. Good use cases include document Q&A systems, code review tools, customer support with long product manuals, and multi-turn conversations with extensive system prompts.

It is less useful for one-off queries against unique contexts, or when the context changes frequently. Creating and storing a cache has its own cost, so you need at least a few queries against the same context to break even.

The minimum cache size is 2,048 tokens. If your context is smaller than that, use regular prompting or rely on implicit caching instead.

Context caching with Gemini on Vertex AI is one of the most impactful cost optimization techniques for LLM-powered applications. The implementation is straightforward, and the savings are dramatic for the right use cases.
