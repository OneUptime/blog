# How to Debug Empty SelfQueryRetriever Results with Metadata Filter Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LangChain, RAG, ChromaDB, Observability, Python

Description: Debug empty SelfQueryRetriever responses by inspecting the structured query, translated metadata filter, search settings, and matching stored records.

A self-query retriever can return nothing even when a relevant document is visibly present in the vector store. The generated metadata filter may exclude the document before similarity ranking begins. Increasing `k` will not recover a record that fails the filter.

Capture the query-construction boundary and the final search arguments. Then test the filter independently against known records.

## Locate the current retriever API

The Python `SelfQueryRetriever` is in `langchain_classic.retrievers.self_query.base`. Its components include a `query_constructor`, a `structured_query_translator`, a vector store, search settings, and a `use_original_query` option. [SelfQueryRetriever reference](https://reference.langchain.com/python/langchain-classic/retrievers/self_query/base/SelfQueryRetriever).

Record the installed versions of `langchain-classic`, `langchain-core`, the vector-store integration, and the database client. Examples written for earlier LangChain package layouts can import a different path or depend on behavior that changed.

The constructor's output is an intermediate structured query. It is not necessarily the filter syntax sent to the database. For Chroma, the LangChain adapter accepts a `filter` argument, while Chroma's collection API uses `where`.

## Capture one generated plan, then execute it

Running the query constructor twice can produce two different filters. A diagnostic path should generate once and execute the captured plan. The helper below accepts an already configured `SelfQueryRetriever`; it is not a complete model or vector-store setup. It mirrors the current preparation rules using the retriever's components rather than calling a private helper.

```python
def inspect_self_query(retriever, question, config=None):
    structured = retriever.query_constructor.invoke(
        {"query": question}, config=config
    )
    rewritten, generated = (
        retriever.structured_query_translator.visit_structured_query(structured)
    )
    generated = dict(generated)
    if structured.limit is not None:
        generated["k"] = structured.limit
    effective_query = question if retriever.use_original_query else rewritten
    effective_kwargs = {**retriever.search_kwargs, **generated}
    plan = {
        "structured_query": structured.model_dump(mode="json"),
        "effective_query": effective_query,
        "search_type": retriever.search_type,
        "search_kwargs": effective_kwargs,
    }
    docs = retriever.vectorstore.search(
        effective_query, retriever.search_type, **effective_kwargs
    )
    return plan, docs
```

The precedence of generated settings, limits, and `use_original_query` follows the official implementation. Pin and test this diagnostic helper when upgrading, because it reproduces that behavior outside the normal retriever invocation. It also bypasses the usual retriever-level callback wrapper, so instrument the helper as its own diagnostic operation. [SelfQueryRetriever implementation](https://github.com/langchain-ai/langchain/blob/c2f4036e4c6ca45a8da8a42d8e07a25d2ea48b8f/libs/langchain/langchain_classic/retrievers/self_query/base.py).

Do not log the returned plan indiscriminately. Questions and filter values may contain personal or tenant information. Store an approved redacted representation, plus an opaque reference to any retained full plan.

## Test metadata separately from similarity

Suppose the user asks for “published guides after 2023,” but ingestion stored `year` as the string `"2024"` and `status` as `"Published"`. The generated filter might use a numeric comparison and lowercase `"published"`.

Inspect a known document's actual metadata, then use the database's non-similarity retrieval API with the translated filter. In Chroma, `get(where=...)` isolates metadata matching from vector ranking. The following is a partial diagnostic for an existing collection:

```python
known = collection.get(ids=["guide-42"], include=["metadatas"])
matched = collection.get(
    where={"$and": [
        {"year": {"$gt": 2023}},
        {"status": {"$eq": "published"}},
    ]},
    include=["metadatas"],
    limit=20,
)
```

Chroma documents `where` metadata predicates and the separate `get` and `query` APIs. Verify field names, value types, comparison operators, and logical grouping against those definitions. [Chroma metadata filtering](https://docs.trychroma.com/docs/querying-collections/metadata-filtering), [Chroma query and get](https://docs.trychroma.com/docs/querying-collections/query-and-get).

Remove only optional diagnostic constraints one at a time in an authorized test environment. Keep access-control and tenant predicates enforced throughout. A broad query that exposes another tenant's documents is not an acceptable debugging fallback.

## Identify which boundary lost the match

If the stored metadata is wrong, repair ingestion and reindex the affected records. If the schema description is misleading, fix the metadata field descriptions and examples supplied to the query constructor. If the intermediate query is correct but translation is wrong, investigate translator compatibility and unsupported operators.

When metadata matching works but similarity search remains empty, inspect score thresholds, result limits, collection identity, embedding dimensions, and whether the query used the expected embedding function. Preserve errors separately: an invalid filter is not an ordinary zero-result query.

Build regression fixtures with exact metadata types, missing fields, date boundaries, category spelling, compound predicates, and a known positive record. Assert both the generated plan and the returned document IDs. These checks expose whether a later model or integration change altered retrieval semantics before users discover another empty response.
