# Validation Summary: How to Set Up Elasticsearch Audit Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch audit logging
- Elasticsearch security settings
- Filebeat / Elastic Agent log shipping
- Elasticsearch Query DSL
- Index Lifecycle Management (ILM)
- Watcher alerting
- Log4j2 audit log rotation
- jq

## Sources Consulted
- Elastic Docs: Auditing security settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/auding-settings
- Elastic Docs: Enable audit logging - https://www.elastic.co/docs/deploy-manage/security/logging-configuration/enabling-audit-logs
- Elastic Docs: Elasticsearch audit events - https://www.elastic.co/docs/reference/elasticsearch/elasticsearch-audit-events
- Elastic Docs: Elasticsearch audit events ignore policies - https://www.elastic.co/docs/deploy-manage/security/logging-configuration/logfile-audit-events-ignore-policies
- Elastic Docs: Elasticsearch logfile audit output - https://www.elastic.co/docs/deploy-manage/security/logging-configuration/logfile-audit-output
- Elastic Docs: Filebeat Elasticsearch module - https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-elasticsearch
- Elastic Blog: Indexing Elasticsearch Audit Logs with Filebeat - https://www.elastic.co/blog/indexing-elasticsearch-audit-logs-with-filebeat

## Issues Found
- The post described `xpack.security.audit.outputs: [index]` and `.security-audit-*` indices as current Elasticsearch audit-log output options. Current Elastic documentation says the `logfile` audit output is the supported audit output. I removed the unsupported output setting and changed index-query examples to assume audit logs are shipped with Filebeat, Elastic Agent, or another shipper.
- The audit event JSON example used nested fields and treated `event.type` as the audit action. Elasticsearch logfile audit events use dotted field names, with `event.type` representing the processing layer and `event.action` representing actions such as `authentication_failed` or `access_denied`. I corrected the JSON example, field table, queries, aggregations, and jq filters.
- The Filebeat configuration snippet was incomplete as a `modules.d/elasticsearch.yml` example. I added the `- module: elasticsearch` wrapper and kept the audit fileset path pointed at `*_audit.json`.
- The ILM/template example targeted the old `.security-audit-*` pattern and lacked the rollover alias required by an index-based rollover policy. I changed it to a custom `audit-logs-*` shipped-log pattern, added `index.lifecycle.rollover_alias`, and added a bootstrap write-index example.
- The article did not mention that Elasticsearch audit logging is available only on certain Elastic subscription levels. I added that caveat near the enablement instructions.
- One claim said audit logs capture index CRUD operations. I narrowed it to authorization events for index actions when enabled, which better matches Elasticsearch audit logging behavior.

## Review Notes
The Watcher examples are structurally plausible, but they assume Watcher is licensed/enabled and that the shipped audit-log fields are mapped as searchable keyword fields. In current Elastic deployments, Elastic Agent integrations or Filebeat-managed data streams may use a deployment-specific data stream name, so readers should replace `audit-logs-*` with their actual shipped audit-log index or data stream.
