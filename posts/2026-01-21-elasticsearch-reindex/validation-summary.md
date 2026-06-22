# Validation Summary: How to Reindex Data in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Reindex API
- Elasticsearch Tasks API
- Elasticsearch aliases
- Elasticsearch remote reindex
- Elasticsearch index settings
- Painless scripting
- Ingest pipelines
- Bash and curl

## Sources Consulted
- Elasticsearch Reindex API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex
- Elasticsearch Reindex API guide: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docs-reindex.html
- Elasticsearch Reindex rethrottle API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-reindex-rethrottle
- Elasticsearch aliases documentation: https://www.elastic.co/docs/manage-data/data-store/aliases
- Elasticsearch update aliases API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-update-aliases
- Elasticsearch update index settings API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings
- Elasticsearch refresh API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-refresh
- Elasticsearch reindex settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/index-management-settings#reindex-settings
- Painless reindex context: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-reindex-context
- Painless datetime now guidance: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-datetime-now

## Issues Found
- The "Add Field" Painless script used `new Date().toISOString()`, which is JavaScript-style syntax and is not the recommended Painless approach. Changed it to set the field from a script parameter, matching Elasticsearch guidance to pass `now` values through `params`.
- The complex transformation curl example used triple-quoted script text. Triple quotes are accepted by Kibana Console examples, but they are not valid JSON in a raw `curl -d` request. Replaced the script with a JSON-valid string.
- The active-index reindex workflow implied that one catch-up reindex fully handles writes during the migration. This still leaves a race before alias switching unless writes are paused, dual-written, or otherwise coordinated. Added comments requiring write coordination before the alias switch.
- The remote SSL section showed timeout fields but did not show where SSL trust is configured. Added the required `reindex.ssl.certificate_authorities` configuration note and clarified that SSL settings cannot be placed in the `_reindex` request body.

## Review Notes
The examples are generally accurate for Elasticsearch 8.x/current API behavior. The complete Bash script is illustrative and still assumes `jq` is installed and writes are coordinated during the final alias switch. For production use, callers should also inspect task responses for failures, not only completion status and document counts.
