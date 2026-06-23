# Validation Summary: How to Fix Elasticsearch Returning Every Document

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Elasticsearch Query DSL
- Elasticsearch analyzers and mappings
- Elasticsearch Search, Analyze, Explain, Profile, and Validate Query APIs
- Python Elasticsearch client usage

## Sources Consulted
- Elasticsearch Match all query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-all-query
- Elasticsearch Match query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Elasticsearch Term query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
- Elasticsearch Boolean query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
- Elasticsearch Query string query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-query-string-query
- Elasticsearch Wildcard query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query
- Elasticsearch Exists query documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-exists-query
- Elasticsearch Profile API documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-profile

## Issues Found
- The post showed `{"query": {}}` and said an empty query defaults to `match_all`. I changed this to a search request with no query body, because an omitted query is the accurate broad-search case.
- The post said analyzer mismatch was the most common cause of returning every document. I changed this to a common cause of surprising behavior, because analyzer mismatches more often produce no matches or unexpected matches.
- The post said `match` on a `keyword` field splits `"Electronics & Computers"` into tokens. I corrected this because `match` uses the field's search analyzer, and a `keyword` field usually treats the whole value as one term.
- The post said empty or whitespace `match` queries can match everything. I corrected this because the default `match` behavior for zero terms is to return no documents; broad results usually come from application fallback behavior or an omitted query.
- The post said querying a non-existent field returns all documents, then contradicted itself by saying it finds no matches. I corrected it to state that Elasticsearch returns no matches and noted how application fallback can make this look like an unfiltered search.
- The post described `index.query.default_field` as strict mapping. I removed that incorrect fix and kept mapping-based field validation.
- The post implied wildcard `*` matches every document. I clarified that it can match every document with at least one indexed term in the queried field and that wildcard queries can be expensive.
- The conclusion treated analyzer mismatches, wrong field types, and non-existent fields as usual causes of every-document results. I updated it to distinguish those from actual broad-match causes.

## Review Notes
The examples are version-neutral for current Elasticsearch documentation. The `case_insensitive` option for `term` queries is available in Elasticsearch 7.10 and later and performs ASCII case-insensitive matching.
