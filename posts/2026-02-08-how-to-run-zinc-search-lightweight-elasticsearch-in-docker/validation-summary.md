# Validation Summary: How to Run Zinc Search (Lightweight Elasticsearch) in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- ZincSearch
- Elasticsearch-compatible APIs
- Fluentd
- Python requests
- Prometheus metrics

## Sources Consulted
- ZincSearch quickstart and Docker installation docs: https://zincsearch-docs.zinc.dev/quickstart/
- ZincSearch index create API docs: https://zincsearch-docs.zinc.dev/api/index/create/
- ZincSearch document create API docs: https://zincsearch-docs.zinc.dev/api/document/create/
- ZincSearch bulk API docs: https://zincsearch-docs.zinc.dev/api/document/bulk/
- ZincSearch search API docs: https://zincsearch-docs.zinc.dev/api/search/search/
- ZincSearch Elasticsearch-compatible search docs: https://zincsearch-docs.zinc.dev/api-es-compatible/search/search/
- ZincSearch Fluentd ingestion docs: https://zincsearch-docs.zinc.dev/ingestion/fluentd/
- ZincSearch metrics and monitoring docs: https://zincsearch-docs.zinc.dev/api/metrics/ and https://zincsearch-docs.zinc.dev/monitoring/
- ZincSearch Python SDK endpoint list for health/version endpoints: https://github.com/zincsearch/sdk-python-zincsearch
- Docker Compose file reference for the obsolete top-level version property: https://docs.docker.com/reference/compose-file/version-and-name/
- Fluentd configuration syntax docs: https://docs.fluentd.org/configuration/config-file

## Issues Found
- The Docker examples used `public.ecr.aws/zinclabs/zinc:latest`, but the official ZincSearch Docker image is `public.ecr.aws/zinclabs/zincsearch:latest`. Updated all Docker and Compose examples to use the documented image.
- The Docker Compose examples included the obsolete top-level `version: "3.8"` property. Removed it so the snippets align with the current Compose Specification.
- The Fluentd Elasticsearch output omitted `path /es`. ZincSearch's official Fluentd example sets this path so the plugin sends Elasticsearch-compatible requests under ZincSearch's `/es` API prefix. Added `path /es`.
- The monitoring example used `http://localhost:4080/api/healthz`, but ZincSearch exposes health at `GET /healthz`. Updated the health check command.

## Review Notes
Validated the corrected ZincSearch image with Docker and smoke-tested representative commands against a live container: `/healthz`, `/api/index`, `/metrics`, index creation, single-document indexing, bulk indexing, native search, and Elasticsearch-compatible search all returned successful responses. The post remains focused on ZincSearch; for new observability-heavy deployments, ZincSearch's own README distinguishes OpenObserve as the preferred project for logs, metrics, and traces at larger scale.
