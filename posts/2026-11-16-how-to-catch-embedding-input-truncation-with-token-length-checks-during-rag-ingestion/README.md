# How to Catch Embedding Truncation with Token Checks During RAG Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, Embedding, Python, Observability

Description: Detect oversized embedding inputs before ingestion and retain token counts, payload identity, and provider truncation signals for reliable RAG retrieval.

A retrieved chunk contains the answer near its end, but searches for that fact never find it. One possible explanation is that the embedding represents only the beginning of the stored text. A tokenizer, wrapper, or provider truncated the input while the vector database retained the full chunk.

Validate the exact embedding payload before submission, then preserve evidence about what was actually embedded. A successful response and the expected vector dimension do not prove that the entire chunk was represented.

## Check the model-specific contract

Embedding limits differ from a generator's context window. OpenAI documents an 8,192-token input limit for `text-embedding-3-small` and `text-embedding-3-large`, and recommends `cl100k_base` for counting their input tokens. Count with the embedding model's tokenizer, not the answer model's tokenizer. [OpenAI vector embeddings](https://developers.openai.com/api/docs/guides/embeddings).

Provider behavior also differs. Google's documentation for the `gemini-embedding-001` prediction endpoint describes `autoTruncate`, with `false` causing an oversized input to fail, and a response statistic indicating whether truncation occurred. Do not transfer that parameter to other providers or assume all models on the same platform share a limit. [Google text embedding input and truncation controls](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings).

Check any framework wrapper as well. It may split, truncate, normalize, or batch text before the provider sees it. Your ingestion boundary should observe the final rendered payload, including titles and prefixes.

## Reject oversized payloads before indexing

The following runnable local check requires `tiktoken`. It does not make an API call. The application limit is deliberately 8,000 tokens, leaving room below the documented model maximum. It rejects rather than silently shortening content.

```python
import hashlib
import tiktoken

MODEL = "text-embedding-3-small"
APP_TOKEN_LIMIT = 8000
encoding = tiktoken.get_encoding("cl100k_base")

def prepare_embedding_input(document_id, revision, chunk_id, title, text):
    if not text.strip():
        raise ValueError("empty chunk")
    payload = f"Title: {title}\n\n{text}" if title else text
    # Treat special-looking strings as ordinary document text.
    tokens = encoding.encode(payload, disallowed_special=())
    if len(tokens) > APP_TOKEN_LIMIT:
        raise ValueError(f"embedding input exceeds application limit: {len(tokens)}")
    return {
        "payload": payload,
        "manifest": {
            "document_id": document_id,
            "revision": revision,
            "chunk_id": chunk_id,
            "embedding_model": MODEL,
            "tokenizer": "cl100k_base",
            "input_tokens": len(tokens),
            "payload_sha256": hashlib.sha256(payload.encode()).hexdigest(),
        },
    }

prepared = prepare_embedding_input(
    "policy", "v4", "section-2", "Refund policy", "Refunds take five days."
)
assert prepared["manifest"]["input_tokens"] > 0
assert prepared["payload"].endswith("Refunds take five days.")
```

The fingerprint is useful for public test data. Use a keyed fingerprint or protected artifact reference for sensitive content, and restrict access to the manifest. A digest establishes identity of the submitted payload; it does not independently prove how a remote model processed it.

Pass the returned `payload` unchanged to the embedding adapter. If another layer transforms it, record a second token count and fingerprint after that transformation. A count taken before title insertion cannot validate the final request.

## Split deliberately when an input is too large

Choose semantic boundaries such as headings, paragraphs, and sentences, then enforce a token budget on each resulting piece. Preserve source offsets, revision, chunker version, and overlap policy so an answer can be traced back to the original document.

Avoid cutting a string at an arbitrary character count as a substitute for token counting. Token density varies with language, code, identifiers, and formatting. Likewise, decoding arbitrary token slices requires care around Unicode boundaries and can produce fragments that lose meaning.

After splitting, verify that the union of chunk source ranges covers the intended source content, accounting for deliberately excluded material. Re-embed and reindex with a versioned migration rather than mixing old and new chunk identities without a clear policy.

## Inspect the embedding response

Where the provider returns a truncation flag, treat `true` as an ingestion defect unless truncation is an explicit product choice. Record reported usage and compare it with local expectations, allowing for documented tokenization differences. Aggregate usage for a batch does not prove which individual item was shortened.

Validate response item indexes and counts before associating vectors with chunks. A shifted mapping can mimic truncation because a perfectly valid vector is stored against the wrong text. Check vector dimensions as a separate schema check, and never interpret correct dimensions as full-content coverage.

## Monitor and reproduce the problem

Track input-token distributions, over-limit rejection counts, provider truncation counts, unknown truncation status, and the proportion of indexed records with a complete ingestion manifest. Slice by source type, language, chunker version, and embedding model.

Create fixtures just below and above the application limit, with multilingual text, code, long titles, and an answer-bearing sentence at the end. Verify that oversized input is rejected or deliberately split and that a short tail-only query can retrieve the reindexed evidence.

The aim is to make silent information loss visible at ingestion. Once stored text, submitted payload, and embedding provenance agree, retrieval debugging can focus on ranking and query quality instead of an unseen missing tail.
