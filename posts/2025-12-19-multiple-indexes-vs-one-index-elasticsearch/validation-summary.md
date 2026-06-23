# Validation Summary: How to Use Multiple Indexes vs One Index with Types in Elasticsearch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch index mappings and aliases
- Elasticsearch mapping types and migration patterns
- Elasticsearch Index Lifecycle Management (ILM)
- Elasticsearch query routing
- Python Elasticsearch client
- JavaScript Elasticsearch client

## Sources Consulted
- Elastic Docs: Removal of mapping types - https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types
- Elastic Docs 7.17: Removal of mapping types - https://www.elastic.co/guide/en/elasticsearch/reference/7.17/removal-of-types.html
- Elastic API Docs: Create an index - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create
- Elastic Docs: Aliases - https://www.elastic.co/docs/manage-data/data-store/aliases
- Elastic API Docs: Create or update an alias - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-update-aliases
- Elastic Docs: ILM rollover - https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elastic Docs: Manage time series data without data streams - https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/tutorial-time-series-without-data-streams
- Elastic API Docs: Reindex API - https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docs-reindex.html
- Elastic Docs: JavaScript client API reference - https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Elastic Docs: Python client notes for 8.x body parameter behavior - https://www.elastic.co/guide/en/elasticsearch/client/python-api/8.19/_8_18_0_2025_04_15.html
- Elastic Docs: Controlling access at the document and field level - https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level

## Issues Found
- Corrected the mapping type timeline. The post said types were removed in Elasticsearch 7.x and `_doc` was the only type; Elastic documents 7.x as deprecating type names in APIs, with `_doc` becoming an endpoint name, while 8.x removes type support.
- Updated Elasticsearch REST snippets from `json` fences to `console` or `jsonc` where examples include Dev Tools request lines or comments, so the snippets are not presented as strict JSON.
- Fixed ILM rollover examples to use a rollover-compatible index name (`logs-000001`) and configure the rollover alias as the write index. Alias-based ILM rollover requires a numeric-suffixed index, `index.lifecycle.rollover_alias`, and a write index alias.
- Changed the rollover size condition from `max_size` to `max_primary_shard_size`, matching current Elastic ILM examples and guidance.
- Updated Python and JavaScript client examples to use current top-level request parameters (`query`, `mappings`) instead of wrapping requests in `body`.
- Updated the migration example to describe a 6.x typed-index migration before upgrade and use the reindex source `type` parameter instead of querying `_type`, which Elastic warns should not be used in 7.x search APIs and is removed in 8.x.
- Corrected the security comparison table to note that a single index can use document-level and field-level security, not field-level security only.

## Review Notes
The post is technically relevant and useful. For future improvement, the time-series section could mention data streams as Elastic's preferred default for append-only time-series workloads, but the alias-based rollover example is still valid for use cases that need direct index updates or deletes.
