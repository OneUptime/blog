# Validation Summary: How to Implement Elasticsearch Dense Vector Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elasticsearch dense_vector mappings
- Elasticsearch kNN search
- HNSW approximate nearest neighbor indexing
- Elasticsearch RRF retrievers and hybrid search
- Elasticsearch Python client
- Sentence Transformers
- Flask

## Sources Consulted
- Elasticsearch dense_vector field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector
- Elasticsearch kNN search documentation: https://www.elastic.co/docs/solutions/search/vector/knn
- Elasticsearch kNN query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query
- Elasticsearch RRF retriever documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers/rrf-retriever
- Elasticsearch retrievers overview: https://www.elastic.co/docs/solutions/search/retrievers-overview
- Elasticsearch Python client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python
- Sentence Transformers SentenceTransformer API documentation: https://www.sbert.net/docs/package_reference/sentence_transformer/model.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- The dense vector `similarity` list omitted `max_inner_product`, which is a valid current Elasticsearch similarity option. Added it to the parameter list and comparison table.
- The `dot_product` description implied raw scores and did not state the unit-vector requirement. Updated it to match Elasticsearch's float-vector constraint that both document and query vectors must be unit length.
- The `index` parameter description implied `true` must always be set explicitly. Current Elasticsearch defaults dense vector indexing to `true`, so the text now clarifies that explicitly setting it is optional in current versions and disabling it limits you to brute-force search.
- The RRF section said Elasticsearch 8.8+ supports the shown syntax, but the example uses the retriever API, which was added in 8.14 and became generally available in 8.16. Updated the version note.
- The complete Flask API example accepted filters but applied them only to pure vector searches. Updated the example so filters are applied consistently to vector, keyword, and hybrid searches.

## Review Notes
The examples are otherwise aligned with current Elasticsearch APIs. The HNSW tuning table remains guidance rather than a documented universal rule; production users should benchmark with their own corpus, shard layout, recall targets, and hardware.
