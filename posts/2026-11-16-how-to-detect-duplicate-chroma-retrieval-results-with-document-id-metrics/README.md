# How to Detect Duplicate Chroma Retrieval Results with Document ID Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ChromaDB, RAG, Vector Database, Observability, Python

Description: Distinguish repeated Chroma record IDs, repeated document content, and multiple chunks from one source using explicit retrieval metrics.

Five search results can look identical while referring to five different Chroma records. They can also be five legitimate chunks from one document, or the same record appended repeatedly by a multi-query merger. Each case needs a different fix.

Measure duplication at three levels: collection record ID, source document identity, and content fingerprint. Preserve those distinctions throughout retrieval and context assembly.

## Start with the collection's raw result

Chroma stores records under unique string IDs. Those IDs identify records, not unique document contents. Inserting the same text under new IDs creates distinct records that may all be retrieved. [Adding data to Chroma collections](https://docs.trychroma.com/docs/collections/add-data).

Inspect raw query results before a framework converts them to document objects or concatenates results from several searches. Chroma returns a result group for each query input. Do not flatten several groups and interpret repeated IDs across different queries as duplicates within one query. [Chroma query and get](https://docs.trychroma.com/docs/querying-collections/query-and-get).

Record a query attempt ID and rank alongside each record. If the raw database result is unique but the merged result repeats IDs, the duplication was introduced downstream.

## Reproduce content duplicates without an embedding service

This complete Python example requires `chromadb`. It uses explicit toy vectors, so it neither downloads an embedding model nor calls a provider. The vectors demonstrate identity behavior rather than realistic semantic quality.

```python
from collections import Counter
import hashlib
import chromadb

client = chromadb.EphemeralClient()
collection = client.create_collection("duplicate-diagnostics")
collection.add(
    ids=["chunk-a", "chunk-b", "chunk-c"],
    embeddings=[[1.0, 0.0], [1.0, 0.0], [0.0, 1.0]],
    documents=["Refunds take five days.", "Refunds take five days.",
               "Invoices are issued monthly."],
    metadatas=[{"document_id": "refund-policy"},
               {"document_id": "refund-policy"},
               {"document_id": "billing-guide"}],
)
result = collection.query(
    query_embeddings=[[1.0, 0.0]], n_results=3,
    include=["documents", "metadatas", "distances"],
)
ids = result["ids"][0]
documents = result["documents"][0]
metadata = result["metadatas"][0]

fingerprints = [hashlib.sha256(text.encode()).hexdigest() for text in documents]
source_ids = [m["document_id"] for m in metadata]
metrics = {
    "returned_count": len(ids),
    "unique_record_count": len(set(ids)),
    "unique_content_count": len(set(fingerprints)),
    "unique_source_count": len(set(source_ids)),
    "repeated_record_count": len(ids) - len(set(ids)),
    "repeated_content_count": len(ids) - len(set(fingerprints)),
}
assert metrics["repeated_record_count"] == 0
assert metrics["repeated_content_count"] == 1
assert Counter(source_ids)["refund-policy"] == 2
print(metrics)
```

The example's plain hash is appropriate for its public toy text. For sensitive or guessable content, use a keyed fingerprint within the trusted ingestion boundary and avoid exporting raw content. Even hashes can disclose equality patterns.

## Use metrics that describe the failure

Calculate the repeated-record ratio as `(returned - unique_records) / returned`, with an explicit empty-result state when `returned=0`. Calculate repeated-content ratio separately. A source-concentration metric, such as the fraction of results belonging to the most frequent document, can reveal poor diversity without labeling legitimate chunks as corrupt.

Use bounded labels such as collection, index version, retriever version, and query class. Keep record IDs in traces or diagnostic artifacts. Creating a metric series for every chunk ID can make monitoring more expensive than the retrieval itself.

A sudden rise in unique record count with little increase in unique content often points to ingestion replay with freshly generated IDs. A rise only after multi-query retrieval points toward merger logic. Stable IDs with changing content may indicate revisions being overwritten or inconsistent source identity.

## Fix the boundary that introduced duplication

At ingestion, derive record IDs from a documented identity rule such as source ID, immutable revision, chunker version, and chunk position. Decide explicitly whether reingestion updates an existing revision or creates a new one. Use the database's supported update or upsert behavior for the chosen workflow, and separately remove obsolete revisions when your retention policy permits it.

At result merging, deduplicate record IDs within the same collection and revision namespace while preserving the best rank or a documented fusion score. Two collections may use the same local ID, so bare string equality is insufficient across indexes.

At prompt assembly, content deduplication can save tokens, but aggressive source deduplication can discard complementary passages. A policy document may need separate eligibility and exception chunks to answer correctly. Prefer measuring coverage after deduplication instead of assuming greater diversity always improves an answer.

## Verify the improvement

Test reingesting the same file twice, overlapping chunks, two documents containing the same boilerplate, and multi-query retrieval returning the same record several times. Include a question that genuinely needs two chunks from one source.

Compare duplicate ratios with answer coverage, source diversity, context tokens, and latency. A successful repair removes accidental repetition while preserving the evidence required to answer the question. A lower duplicate count alone is not enough if the deduplicator drops the only passage containing an important exception.
