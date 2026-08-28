# Validation Summary: Why a Qdrant Payload Filter Returns No Results When LangChain Nests Metadata

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Python
- LangChain `Document`
- `langchain-qdrant` `QdrantVectorStore` 1.1.0
- Qdrant 1.10+ Query API and `qdrant-client`
- Qdrant payload filtering, scrolling, payload indexes, and strict mode
- Retrieval-augmented generation (RAG) and vector search

## Sources Consulted

- [LangChain Qdrant integration guide](https://docs.langchain.com/oss/python/integrations/vectorstores/qdrant)
- [LangChain `QdrantVectorStore` API reference](https://reference.langchain.com/python/langchain-qdrant/qdrant/QdrantVectorStore)
- [Published `langchain-qdrant` 1.1.0 source](https://raw.githubusercontent.com/langchain-ai/langchain/langchain-qdrant==1.1.0/libs/partners/qdrant/langchain_qdrant/qdrant.py)
- [`langchain-qdrant` release history on PyPI](https://pypi.org/project/langchain-qdrant/)
- [Qdrant filtering documentation](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant exact-string filtering documentation](https://qdrant.tech/documentation/search/text-search/text-filtering/)
- [Qdrant payload indexing documentation](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant create-payload-index API reference](https://api.qdrant.tech/api-reference/indexes/create-field-index)
- [Qdrant Cloud cluster configuration and strict-mode defaults](https://qdrant.tech/documentation/cloud/configure-cluster/)
- [Qdrant scroll-points API reference](https://api.qdrant.tech/api-reference/points/scroll-points)
- [Qdrant payload management documentation](https://qdrant.tech/documentation/manage-data/payload/)

## Issues Found

- The payload diagnostic treated `payload is None` as evidence that the point was written without payload. With payload requested, a payload-less point is normally returned as an empty object (`{}`), while `None` can mean payload was not attached to the response. The text now tells readers to handle both cases and confirm that payload was requested before diagnosing ingestion.
- The mixed-schema migration indexed only the target path before suggesting a dual-path `should` filter. Under strict mode, every payload field referenced by the filter must be indexed, including a legacy branch. The migration step now requires indexes for every legacy path queried during the transition when strict mode is enabled.

No other technical issues were found.

## Review Notes

- The examples were executed with `langchain-qdrant` 1.1.0 and `qdrant-client` 1.19.0 in Qdrant local mode. The root `source` filter returned no points, while `metadata.source`, `metadata.tenant.id`, direct filtered scroll, and the custom payload keys behaved as described.
- `client.get_collection(...).payload_schema` reports indexed payload fields, not an inferred schema of every stored payload. The post correctly relies on raw scroll output to inspect the complete stored shape.
- Qdrant recommends creating payload indexes before ingestion so its filter-aware HNSW edges can benefit immediately. An index created after ingestion still supports filtering, but existing HNSW indexes may need rebuilding to gain those filter-aware edges.
