# Validation Summary: How to Configure Harbor Project Quotas for Storage Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harbor container registry
- Harbor project quotas
- Harbor REST API v2.0
- Bash scripting with curl and jq
- Harbor garbage collection

## Sources Consulted
- Harbor 2.14.0 documentation: Configure Project Quotas: https://goharbor.io/docs/2.14.0/administration/configure-project-quotas/
- Harbor 2.14.0 documentation: Garbage Collection: https://goharbor.io/docs/2.14.0/administration/garbage-collection/
- Harbor 2.14.0 documentation: Access Metrics: https://goharbor.io/docs/2.14.0/administration/metrics/
- Harbor OpenAPI v2.0 specification: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml

## Issues Found
- The post described current Harbor project quotas as including artifact/count quotas. Current Harbor 2.14 documentation exposes project quota configuration for storage consumption only, so the count quota UI text, API payload fields, script arguments, and examples were removed.
- The post used a Harbor project ID directly with `/api/v2.0/quotas/{id}`. The Harbor OpenAPI specification defines `{id}` as the quota ID, so the examples now query `/api/v2.0/quotas?reference=project&reference_id=${PROJECT_ID}` and use the returned quota ID.
- The project creation example included `count_limit`, which is not part of `ProjectReq` in the Harbor OpenAPI specification. The example now uses only the supported `storage_limit` field.
- The UI quota units were shown as MB/GB/TB. Current Harbor documentation uses MiB/GiB/TiB, so the examples and conversion text were updated.
- The quota exceeded section claimed users see the error immediately and partial uploads are prevented. Harbor documentation notes manifests are pushed after blobs and quota rejection can occur when the manifest arrives, so the wording was corrected.
- The garbage collection UI path was stale. Current Harbor documentation places it under Administration > Clean Up > Garbage Collection, so the path was updated.
- The repository artifact delete example did not mention Harbor's double URL-encoding requirement for repository names containing slashes. A short note was added.

## Review Notes
The post is technically relevant and now matches the current Harbor 2.14 quota documentation and OpenAPI schema. Future improvements could add defensive handling for empty API results and URL-encoding variables in the shell examples, but the current snippets are structurally correct for the documented Harbor API.
