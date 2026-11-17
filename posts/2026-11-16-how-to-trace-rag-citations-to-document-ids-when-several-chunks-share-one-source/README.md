# How to Trace RAG Citations to Document IDs When Several Chunks Share One Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RAG, LangChain, Observability, Python

Description: Preserve document revisions and chunk identities behind RAG citation labels so several passages from one source remain independently traceable.

A RAG answer cites “Employee Handbook” three times. The citation links open the right PDF, but nobody can tell whether the answer used the benefits section, an old appendix, or a conflicting revision. A filename or URL identifies a source for a reader; it does not identify the exact evidence supplied to the model.

Build citations from a manifest of the final prompt context. Preserve chunk identity behind each display label and retain the mapping with the answer.

## Separate source identity from citation identity

Use a stable logical document ID for the source, an immutable revision for its content, and a chunk ID for a specific extracted passage. Include page, section, or source offsets where the ingestion pipeline provides them. A mutable URL should be treated as a display location, not an immutable revision.

LangChain's `Document` stores text and metadata, making metadata a suitable place to carry these application-defined identifiers through retrieval. The framework does not invent a provenance policy for your corpus. [LangChain Document reference](https://reference.langchain.com/python/langchain-core/documents/base/Document).

A citation label such as `C1` should identify a context entry within one answer attempt. It need not be globally meaningful. The stored manifest resolves it to document, revision, and chunk; the rendered answer resolves it to a safe reader-facing link.

## Build the manifest after final selection

Assign labels after filtering, reranking, deduplication, and token-budget selection. A manifest built from the original retrieval candidates may include chunks the model never received.

This standalone Python example builds a manifest for three already selected chunks. The two handbook chunks remain separate despite sharing one source. The content is public demonstration text.

```python
chunks = [
    {"document_id": "handbook", "revision": "v7", "chunk_id": "benefits",
     "page": 12, "text": "Annual leave is 25 days."},
    {"document_id": "handbook", "revision": "v7", "chunk_id": "exceptions",
     "page": 13, "text": "Part-time leave is prorated."},
    {"document_id": "regional-addendum", "revision": "v2", "chunk_id": "leave",
     "page": 3, "text": "Local public holidays are additional."},
]

def build_context(chunks):
    manifest = {}
    rendered = []
    identities = set()
    for number, chunk in enumerate(chunks, 1):
        identity = (chunk["document_id"], chunk["revision"], chunk["chunk_id"])
        if identity in identities:
            raise ValueError("duplicate context identity")
        identities.add(identity)
        label = f"C{number}"
        manifest[label] = {key: chunk[key] for key in (
            "document_id", "revision", "chunk_id", "page"
        )}
        rendered.append(f"[{label}] {chunk['text']}")
    return "\n\n".join(rendered), manifest

context, manifest = build_context(chunks)
model_citations = ["C1", "C2"]
if any(label not in manifest for label in model_citations):
    raise ValueError("citation was not in the supplied context")
resolved = [manifest[label] for label in model_citations]
assert resolved[0]["document_id"] == resolved[1]["document_id"]
assert resolved[0]["chunk_id"] != resolved[1]["chunk_id"]
```

The snippet validates citation membership, not factual support. In an application, request a structured answer containing claims and citation labels, validate that structure, and render links from the trusted manifest. Do not accept model-generated URLs as the authoritative mapping.

## Validate support separately from membership

An answer can cite `C1` correctly while claiming that leave is 30 days. The label exists, but the passage does not support the assertion. Evaluate each material claim against its cited chunks and preserve outcomes such as supported, contradicted, or insufficient evidence.

This distinction matches LangSmith's groundedness evaluation, which compares an answer against supplied documents rather than only checking whether the documents concern the question. [RAG groundedness evaluation](https://docs.langchain.com/langsmith/evaluate-rag-tutorial#groundedness-response-vs-retrieved-docs).

A claim requiring two passages should retain both labels. Avoid reducing a citation list to one label per source before support evaluation; the two passages may contain complementary conditions.

## Preserve the evidence through rendering

Store the manifest with the answer ID, generation attempt, prompt version, and exact context artifact reference. If raw text cannot be retained, use immutable content references and an integrity fingerprint under your retention policy. Fetching a mutable page later can produce a different passage with the same URL.

Citation renderers often deduplicate source cards for readability. That is fine if each inline citation still maps to its chunk-level evidence. Keep both the reader-facing source grouping and the internal support mapping.

Check links against current authorization before displaying or serving source content. A citation recorded when one user had access should not automatically expose that content to another user who views the answer later.

## Test shared-source edge cases

Create fixtures with two chunks from one document, two revisions with the same filename, a repeated citation label, an unknown label, and a citation to a retrieved chunk excluded from the prompt. Include a claim whose support is split across two pages.

Trace retrieval identity, final context identity, generated labels, validated support, and rendered links. If all five agree, the source card remains readable while the investigation can identify the precise evidence behind every claim. If they disagree, the trace exposes whether the failure came from selection, generation, validation, or display.
