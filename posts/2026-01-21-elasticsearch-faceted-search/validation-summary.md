# Validation Summary: How to Implement Faceted Search with Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch (search and aggregations framework)
- Elasticsearch Query DSL (match, multi_match, bool, term, terms, range, prefix queries)
- Elasticsearch Aggregations (terms, range, histogram, stats, percentiles, global, filter aggregations)
- `post_filter` for faceted navigation
- curl / Elasticsearch REST API

## Sources Consulted
- Elasticsearch Terms Aggregation reference — https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html (confirmed `execution_hint` valid values `map` / `global_ordinals`, `include`/`shard_size`/`size` semantics, regexp-based `include` matching)
- Elasticsearch "Filter search results" / `post_filter` reference — https://www.elastic.co/guide/en/elasticsearch/reference/current/filter-search-results.html (confirmed `post_filter` runs after aggregations are calculated and has no impact on aggregation results)

## Issues Found
No technical issues found.

## Review Notes
- The central claim — that `post_filter` is applied after aggregations are computed and therefore does not constrain aggregation results — is accurate and matches the official documentation's shirt example.
- The multi-facet pattern (each facet aggregation applies the *other* facets' filters but not its own, via nested `filter` aggregations) is the canonical correct approach for faceted counts and is implemented correctly in both the "Filter Aggregations Pattern" and "Complete Faceted Search Query" examples.
- The hierarchical-facet `include` regex `"Electronics > [^>]+"` is correct: Elasticsearch's terms `include` uses anchored (whole-term) regexp matching, so `[^>]+` (which cannot span the `>` separator) matches only immediate children like `"Electronics > Computers"` and excludes deeper paths like `"Electronics > Computers > Laptops"`.
- `execution_hint: "map"` is a valid value; Elasticsearch silently ignores the hint when it is not applicable, so the snippet is safe.
- The overlapping rating ranges (`4+ stars`, `3+ stars`, `2+ stars`, each with only a `from`) are intentional cumulative "X-and-above" buckets, not an error.
- `GET` requests carrying a JSON body via `curl -X GET ... -d` are accepted by Elasticsearch's `_search` endpoint (both GET and POST are supported); this is conventional in ES tutorials.
- Minor, non-blocking caveat (not a technical error): the examples connect to `https://localhost:9200` with basic auth but omit a TLS flag (`-k`/`--cacert`). In an Elasticsearch 8.x+ default install with self-signed certs, users may need `-k` or to point curl at the CA cert. This is an environment/connectivity detail, not a correctness issue with the Query DSL being taught.
