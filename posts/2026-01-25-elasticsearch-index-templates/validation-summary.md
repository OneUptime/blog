# Validation Summary: How to Use Index Templates in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch composable index templates
- Elasticsearch component templates
- Elasticsearch data streams
- Elasticsearch dynamic templates
- Elasticsearch index aliases
- Python Elasticsearch client
- curl

## Sources Consulted
- Elastic Docs: Templates - https://www.elastic.co/docs/manage-data/data-store/templates
- Elastic API Docs: Create or update index template / simulate index template - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-template
- Elastic API Docs: Create or update a document in an index - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-index
- Elastic Docs: Dynamic templates - https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-templates
- Elastic Docs: Migrate index allocation filters to ILM node roles - https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/migrate-index-allocation-filters-to-node-roles
- Python Elasticsearch client API docs: Indices client - https://elasticsearch-py.readthedocs.io/en/stable/api/indices.html
- Python Elasticsearch client API docs: Cluster client / component templates - https://elasticsearch-py.readthedocs.io/en/v8.15.0/api/cluster.html

## Issues Found
- Replaced `index.routing.allocation.require.data` hot/warm examples with modern `_tier_preference` settings (`data_hot` and `data_warm`) because Elasticsearch 8 data tiers use tier roles/preferences unless a custom node attribute is explicitly configured.
- Raised the `logs-*` and `metrics-*` template priorities to `501` because Elasticsearch ships built-in templates at priority `100` for overlapping logs and metrics patterns.
- Changed the priority-resolution example patterns from `logs-*` to `app-logs-*` so the low-priority example is not preempted by Elasticsearch built-in `logs-*-*` templates.
- Reordered the dynamic templates so `message_fields` appears before the catch-all string template; Elasticsearch processes dynamic templates in order and the first matching template wins.
- Corrected the multi-tenant section comment that claimed a dynamic tenant alias was being created; the alias is created explicitly in the following index creation request.
- Fixed the Python template manager's component-template listing logic. The Elasticsearch response contains a list of component template entries, not a dictionary keyed by template name.
- Preserved `version` fields during Python template import for both component templates and index templates.
- Updated the Python logging template priority to `501` to match the built-in-template collision guidance for `logs-*`.
- Updated the best-practices priority guidance to mention `501+` when intentionally overriding built-in templates.

## Review Notes
The examples assume local Elasticsearch accepts unauthenticated HTTP requests on `localhost:9200`. Secured Elasticsearch 8.x deployments usually require TLS and authentication, so readers may need to add credentials and CA settings to the `curl` and Python examples.
