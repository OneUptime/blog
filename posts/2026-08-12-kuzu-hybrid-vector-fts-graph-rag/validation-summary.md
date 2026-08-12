# Validation Summary: Combine Kuzu Vector, Full-Text, and Graph Search for RAG

## Status
validated

## Post Type
Technical guide / implementation guide

## Technologies Covered
- Kuzu 0.11.3
- Cypher and the Kuzu Python API
- HNSW vector indexing and filtered vector search
- Full-text search and BM25 ranking
- Projected graphs
- Reciprocal rank fusion
- Bounded graph traversal
- Graph RAG evidence assembly and evaluation
- LadybugDB migration considerations

## Sources Consulted
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3) - verified the final version, archive context, and statically bundled `algo`, `fts`, `json`, and `vector` extensions.
- [Kuzu vector search extension documentation](https://kuzudb.github.io/docs/extensions/vector/) - checked supported array types, index creation options, query arguments, result columns, distance ordering, and filtered search through projected graphs.
- [Kuzu v0.11.3 vector query implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/src/function/query_hnsw_index.cpp) and [HNSW query configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/vector/src/index/hnsw_config.cpp) - checked parameter handling, including the requirement that `efs` be a literal to take effect.
- [Kuzu full-text search extension documentation](https://kuzudb.github.io/docs/extensions/full-text-search/) - checked `CREATE_FTS_INDEX`, `QUERY_FTS_INDEX`, BM25 scoring, `conjunctive`, `k`, `b`, `top`, stemmer, and stopword behavior.
- [Kuzu v0.11.3 FTS configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/fts/src/include/function/fts_config.h) and [FTS normalization implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/fts/src/utils/fts_utils.cpp) - verified the default English stemmer, built-in stopwords, and digit/punctuation handling by `ignore_pattern`.
- [Kuzu projected graph documentation](https://kuzudb.github.io/docs/extensions/algo/) - checked filtered projections and their connection-scoped lifecycle.
- [Kuzu recursive `MATCH` documentation](https://kuzudb.github.io/docs/cypher/query-clauses/match/) and [Cypher tutorial](https://kuzudb.github.io/docs/tutorials/cypher/) - checked `WALK`/`TRAIL` semantics, recursive predicates, intermediate node/relationship projection, and `OPTIONAL MATCH` null-row behavior.
- [Kuzu prepared statement documentation](https://kuzudb.github.io/docs/get-started/prepared-statements/) and [Python API documentation](https://kuzudb.github.io/docs/client-apis/python/) - checked Python parameter dictionaries and query-result behavior.
- [Kuzu table DDL documentation](https://kuzudb.github.io/docs/cypher/data-definition/create-table/) - checked node and relationship table declarations and property types.
- [LadybugDB v0.12.0 release](https://blog.ladybugdb.com/post/ladybug-release/), [LadybugDB migration update](https://blog.ladybugdb.com/post/ladybug-spreading-its-wings/), and [LadybugDB vector documentation](https://docs.ladybugdb.com/extensions/vector/) - verified the fork/successor description, active development, package rename, and need to evaluate migration compatibility.

## Issues Found
1. **FTS normalization mechanisms were conflated.** The post said that the stemmer, stopwords, and `ignore_pattern` all normalize punctuation and digits. The English stemmer handles word morphology, stopwords omit configured terms, and `ignore_pattern` replaces digits and many punctuation characters with spaces. The explanation was separated accordingly.
2. **BM25 rank and score terminology was mixed up.** The post said that a BM25 score has “higher ranks.” It now correctly says that higher BM25 scores are better.
3. **The entity expansion query could return null graph rows.** Using `OPTIONAL MATCH` preserved each seed even when no authorized, allowlisted path existed, producing a row with null neighbor fields that could consume `$graph_row_limit`. The expansion was changed to `MATCH` so the query returns only actual graph paths. The earlier optional chunk-to-entity match remains optional intentionally so chunks without authorized entity mentions are preserved.

## Review Notes
- The schema, index creation calls, vector query, FTS query, chunk evidence query, and recursive entity query were smoke-tested against the published `kuzu==0.11.3` Python package. They executed successfully after the documented correction to the entity expansion query.
- Kuzu v0.11.3 statically links and auto-loads the vector and FTS extensions, so the post is correct to omit `INSTALL` and `LOAD` for that pinned release. The archived general extension pages still show those statements because they also describe other releases.
- In `QUERY_VECTOR_INDEX`, the query vector and `k` can be parameters. In v0.11.3, an optional value such as `efs := $efs` is silently ignored and the default remains in effect; the post correctly uses a literal.
- `conn.execute(...)` returns an iterable Kuzu `QueryResult`, not a materialized Python list. The snippets are valid because they do not claim otherwise, but application code that needs dictionaries or a reusable list must materialize the result.
- Kuzu is archived and receives no upstream fixes. The post appropriately treats LadybugDB as a migration to evaluate rather than assuming package or database compatibility with later LadybugDB releases.
