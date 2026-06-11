# Validation Summary: How to Implement Keyword Search

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- BM25 ranking algorithm
- Elasticsearch (Python client `elasticsearch`)
- NLTK PorterStemmer
- Reciprocal Rank Fusion (RRF)
- Python `re`, `dataclasses`, `Counter`
- Inverted index data structures
- Hybrid (keyword + vector) retrieval for RAG

## Sources Consulted
- Okapi BM25 reference: https://en.wikipedia.org/wiki/Okapi_BM25
- Elasticsearch BM25 similarity defaults: https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-similarity.html
- Elasticsearch boost-on-mapping removal (issue): https://github.com/elastic/elasticsearch/issues/51703
- Elasticsearch boost-on-mapping deprecation (PR): https://github.com/elastic/elasticsearch/pull/62623
- elasticsearch-py 8.x API reference: https://elasticsearch-py.readthedocs.io/en/v8.17.0/api/elasticsearch.html
- Elasticsearch `multi_match` query reference: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html
- Elasticsearch `match_phrase` query reference: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase.html
- Cormack, Clarke & Buttcher (2009), Reciprocal Rank Fusion outperforms Condorcet (SIGIR)

## Issues Found

1. **Contradictory IDF comment (BM25 class)** — The `_compute_idf` docstring claimed the formula "can produce negative values for very common terms (a feature, not a bug)", but the code uses the Lucene/BM25+ variant `log((N - df + 0.5)/(df + 0.5) + 1)`, where the trailing `+ 1` guarantees the result is always >= 0. Rewrote the docstring and inline comment to correctly describe the Lucene variant and explain that the `+ 1` prevents negative IDF.

2. **Deprecated `boost` parameter in Elasticsearch field mapping** — The `create_index` method set `"boost": 2.0` on the `title` field mapping. Index-time field-level boosting was deprecated in ES 7.x and **removed in 8.0** (elastic/elasticsearch#51703), so this would fail on any modern cluster. Removed the mapping-level boost; the `search` method already applies query-time boosting via `"fields": ["title^2", "content"]`, which is the supported approach.

3. **Elasticsearch Python client `hosts` format incompatible with 8.x** — The constructor passed `hosts=[{"host": host, "port": port}]` and the auth comment used the legacy `http_auth` kwarg. In elasticsearch-py 8.x, dict host entries require an explicit `scheme`, and basic-auth credentials are passed via `basic_auth` (not `http_auth`). Added `"scheme": "http"` to the hosts entry and updated the auth comment to `basic_auth=("user", "password")`.

4. **`_preserve_identifiers` was a no-op in `AdvancedTokenizer.tokenize`** — The method lowercased text in Step 1 and then called `_preserve_identifiers` in Step 2, but `_preserve_identifiers` only matches uppercase patterns (`r'\b([A-Z]+_[A-Z_]+)\b'`). After lowercasing, that regex never matches anything, so the documented "preserve technical identifiers like ERR_CONNECTION_REFUSED" behavior never fired. Reordered the steps so identifier preservation runs before lowercasing, and added a comment explaining the ordering requirement.

## Review Notes

- The post states k1 is "typically 1.2 to 2.0" and uses 1.5 as its default. This is correct as a tuning range, but worth noting that **Lucene/Elasticsearch ship with k1 = 1.2** as the default — a future revision could clarify this for readers tuning ES-side similarity.
- The custom analyzer applies `english_stemmer` and `english_stop` to fields used for exact-identifier matching. The post acknowledges this trade-off implicitly via the `content.raw` keyword sub-field and the `search_exact_phrase` method, but readers indexing high-precision identifiers (SKUs, error codes) should query the `.raw` sub-field, not the analyzed `content` field — a subtlety not spelled out.
- The `MockVectorStore` in the final RAG example returns `(0, 0.8), (1, 0.7)` regardless of query, which is fine for illustration but readers should not infer that semantic-mode queries actually returned those documents.
- Diagrams (Mermaid) and the BM25 formula are mathematically correct and match the standard Okapi BM25 / Robertson formulation.
- The RRF formula and k=60 default match Cormack et al. (2009) exactly.
- `multi_match` with `type: best_fields` plus `fuzziness: AUTO`, and `match_phrase` with `slop: 0`, are all valid in current Elasticsearch 8.x.
