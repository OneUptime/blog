# Validation Summary: How to Implement Metadata Filtering

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Vector databases and metadata filtering
- Pinecone metadata filters
- Qdrant filters and payload indexes
- Weaviate GraphQL filters
- Milvus scalar and array filtering expressions
- Chroma metadata filters
- Python
- Pydantic
- Prometheus Python client
- RAG retrieval patterns

## Sources Consulted
- Pinecone metadata filtering documentation: https://docs.pinecone.io/guides/search/filter-by-metadata
- Pinecone indexing and metadata documentation: https://docs.pinecone.io/guides/index-data/indexing-overview
- Qdrant filtering documentation: https://qdrant.tech/documentation/search/filtering/
- Qdrant payload indexing documentation: https://qdrant.tech/documentation/manage-data/indexing/
- Qdrant similarity search / Query API documentation: https://qdrant.tech/documentation/search/search/
- Weaviate filters documentation: https://docs.weaviate.io/weaviate/search/filters
- Weaviate GraphQL conditional filters documentation: https://docs.weaviate.io/weaviate/api/graphql/filters
- Milvus scalar filtering rules: https://milvus.io/docs/boolean.md
- Milvus array operators documentation: https://milvus.io/docs/array-operators.md
- Chroma metadata filtering documentation: https://docs.trychroma.com/docs/querying-collections/metadata-filtering
- Pydantic migration guide: https://pydantic.dev/docs/validation/latest/get-started/migration/
- Pydantic models documentation: https://pydantic.dev/docs/validation/latest/concepts/models/

## Issues Found
- The pre-filtering and post-filtering explanation overstated result guarantees and implied a fixed two-phase implementation for most vector databases. Updated the wording to describe query-planner-dependent execution and more accurate tradeoffs around candidate pools, approximate recall, and post-filter shortfalls.
- The Milvus expression example used scalar `in` syntax against an array-like `tags` field. Updated it to use `ARRAY_CONTAINS_ANY`, and corrected the operator table to show Milvus array operators as `ARRAY_CONTAINS` / `ARRAY_CONTAINS_ANY`.
- The Qdrant payload index example used string literals for index `type` and tokenizer values. Updated it to the documented `qdrant_client.models` enum values, including `KeywordIndexType.KEYWORD`, `IntegerIndexType.INTEGER`, `TextIndexType.TEXT`, and `TokenizerType.WORD`.
- Several standalone Python snippets were missing imports required by their type annotations. Added the relevant `typing` and `dataclasses` imports where needed.
- The Pydantic schema validation example used deprecated Pydantic v1 `@validator` and `.dict()` APIs, and used a mutable list default. Updated it to `@field_validator`, `model_dump()`, and `Field(default_factory=list)`.
- The examples used `datetime.utcnow()`, which is deprecated in modern Python. Updated the snippets to use timezone-aware `datetime.now(timezone.utc)`.
- The geospatial filter example used MongoDB-style syntax without saying it was vendor-specific. Added a note that the syntax must be adapted to the selected vector database's geo filter API.

## Review Notes
The broader filter-builder examples remain intentionally vendor-neutral and use a Pinecone/Chroma-style dictionary syntax. In a production implementation, those filters should be translated to each selected database's native filter model before being passed to the client.
