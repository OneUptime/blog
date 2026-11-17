# How to Add Similarity Scores to SelfQueryRetriever Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, ChromaDB, RAG, Observability, Python

Description: Attach Chroma distance scores to the documents returned by SelfQueryRetriever while preserving its generated filters and distinguishing distances from confidence.

`SelfQueryRetriever` returns documents, so a trace may show the final chunks without the scores that ranked them. Running another similarity search afterward is tempting, but it can use a different query, omit the generated filter, or query a changed index.

Capture the score from the same search that supplies the documents. Keep the retriever's query planning and change only the final vector-search boundary.

## Establish what the score means

This example targets `langchain-classic` and `langchain-chroma`. The `Chroma.similarity_search_with_score` method returns `(Document, float)` pairs where the float is a distance. Smaller distances represent nearer neighbors for the configured metric. Do not label that number as a probability that the document answers the question. [Chroma scored similarity search](https://reference.langchain.com/python/langchain-chroma/vectorstores/Chroma/similarity_search_with_score).

Store the collection's configured distance metric, embedding version, and score direction with the run. A value from one embedding model or metric is not directly comparable with a value from another. Reranker scores and normalized relevance scores belong in separate fields.

Before adapting anything, record the package versions. `SelfQueryRetriever` now resides in `langchain_classic`, and extension hooks beginning with an underscore are implementation details that need an upgrade test.

## Adapt the final search hook

The following adapter is partial application code: supply the same configured LLM, metadata schema, and Chroma vector store you would normally use with `SelfQueryRetriever.from_llm`. It supports only similarity search. It deliberately rejects MMR and score-threshold modes because replacing those with ordinary similarity search would change retrieval behavior.

```python
from langchain_classic.retrievers.self_query.base import SelfQueryRetriever

class ScoredChromaSelfQueryRetriever(SelfQueryRetriever):
    def _attach(self, pairs):
        return [
            doc.model_copy(update={
                "metadata": {
                    **doc.metadata,
                    "app_chroma_distance": float(distance),
                    "app_score_direction": "lower_is_better",
                }
            })
            for doc, distance in pairs
        ]

    def _get_docs_with_query(self, query, search_kwargs):
        if self.search_type != "similarity":
            raise ValueError("adapter requires search_type='similarity'")
        pairs = self.vectorstore.similarity_search_with_score(
            query, **search_kwargs
        )
        return self._attach(pairs)

    async def _aget_docs_with_query(self, query, search_kwargs):
        if self.search_type != "similarity":
            raise ValueError("adapter requires search_type='similarity'")
        pairs = await self.vectorstore.asimilarity_search_with_score(
            query, **search_kwargs
        )
        return self._attach(pairs)
```

The parent implementation constructs and translates the query, applies a generated result limit, handles `use_original_query`, and merges search arguments before invoking these hooks. Keeping that path avoids an extra query-constructor call and preserves the original plan. The hooks are verified against the linked implementation, not promised as a permanent public interface. [SelfQueryRetriever implementation](https://github.com/langchain-ai/langchain/blob/c2f4036e4c6ca45a8da8a42d8e07a25d2ea48b8f/libs/langchain/langchain_classic/retrievers/self_query/base.py).

Using `model_copy` avoids adding diagnostic metadata to document instances that another component might reuse. Reserve the `app_` keys for this adapter and check that ingestion does not already use them with different meanings.

## Export scores without leaking documents

A retriever trace can record rank, chunk ID, document revision, distance, and score direction for each result. Attach the embedding and index versions once per retrieval run. Use an application wrapper around `invoke` or `ainvoke` to emit those fields to your tracing system, and keep result counts bounded.

Many tracing integrations capture entire returned documents by default. Review that configuration before relying on metadata-only instrumentation. Adding a distance field does not make document content safe to export.

Do not make each distance value or chunk ID a metric label. Histograms can track score distributions with bounded labels, while traces or a controlled result manifest preserve individual matches.

## Check that scoring did not alter retrieval

Create a small collection with fixed embeddings and metadata. Query through both the original retriever and the adapter using a deterministic query constructor. Verify that document IDs and ordering match, and that each adapter distance equals the direct Chroma result for the same translated query and filter.

Cover a generated filter, a generated limit, an empty result, `use_original_query=True`, and asynchronous invocation. Assert that the query constructor runs once per request. If you use an access-control predicate, verify it remains enforced after generated filters are combined; the scoring adapter must not become a path around authorization.

## Interpret the trace carefully

A low distance paired with a wrong answer can mean the chunk is topically similar but lacks a required fact. Good scores followed by bad prompt assembly indicate a downstream problem. A sudden distribution shift after an embedding deployment may reflect a changed scale rather than worse retrieval.

Use reviewed relevance labels to calibrate any threshold, and keep threshold versions with the trace. The score is diagnostic evidence about ranking. It becomes useful when connected to the actual query, filter, selected document, and answer outcome-not when treated as a universal confidence percentage.
