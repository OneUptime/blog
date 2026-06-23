# Validation Summary: How to Match vs Term Query in Elasticsearch

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch text analysis and analyzers
- Elasticsearch mappings for `text` and `keyword` fields
- Elasticsearch Python client
- Elasticsearch JavaScript client

## Sources Consulted
- Elasticsearch term query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elasticsearch match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch standard analyzer documentation: https://www.elastic.co/docs/reference/text-analysis/analysis-standard-analyzer
- Elasticsearch match phrase query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-phrase-query
- Elasticsearch multi-match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
- Elasticsearch keyword field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch text field documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
- Elasticsearch JavaScript client search API reference: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference#_search
- Elasticsearch Python client API reference: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html

## Issues Found
- The post said `match` uses the same analyzer as the field. I changed this to say it uses the field's search analyzer, which is usually the same analyzer used at index time, because Elasticsearch supports a separate `search_analyzer`.
- The post described `match` on keyword fields as inefficient. I changed this to a narrower statement that `term` is clearer for keyword fields, because official docs recommend term-level queries for exact values but do not frame this primarily as an inefficiency issue.
- The performance table said `term` and `terms` queries are cache friendly without context. I changed this to specify filter context, because caching applies to eligible filter-context clauses rather than every term-level query in query context.
- The filter-context section said term queries are cached. I changed this to say filter context skips scoring and makes eligible filters cacheable, which better matches Elasticsearch behavior.
- The Python and JavaScript client examples used a legacy `body` wrapper. I updated them to use current top-level `query` parameters shown in the current client API references.

## Review Notes
The Elasticsearch REST examples are written in a Kibana Console-style format with `GET`/`PUT` request lines and comments. They are appropriate as console snippets, but they are not strict standalone JSON despite the `json` fence.
