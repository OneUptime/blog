# Validation Summary: How to Build a Log Aggregation Service in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- TypeScript
- Express
- TCP sockets with Node.js `net`
- Syslog / RFC 5424-style log messages
- Elasticsearch
- Elasticsearch Index Lifecycle Management
- Prometheus-style metrics

## Sources Consulted
- Node.js `net` module documentation: https://nodejs.org/api/net.html
- Express API reference: https://expressjs.com/en/api.html
- Elasticsearch JavaScript client API reference: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Elasticsearch Bulk API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk
- Elasticsearch ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch `enabled` mapping documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/enabled
- Elasticsearch CAT indices API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices
- RFC 5424, The Syslog Protocol: https://datatracker.ietf.org/doc/html/rfc5424

## Issues Found
- The collector section said it received logs over HTTP and TCP, but the code only implemented HTTP and imported `net` without using it. Changed the wording to HTTP and removed the unused import.
- The syslog example did not include the RFC 5424 structured-data field and parsed the message body incorrectly. Updated the example and parser to include structured data before the message.
- The syslog receiver listened on port 514, which commonly requires elevated privileges on Unix-like systems. Changed the example port to 5514.
- The JSON field parser used `Object.assign(entry.metadata || {}, parsed)`, which drops parsed fields when `metadata` is undefined. Changed it to assign the merged object back to `entry.metadata`.
- The Elasticsearch storage code configured an ILM rollover alias but wrote directly to date-based indices, so rollover would not work as shown. Added an initial write index with the `logs` alias and changed bulk indexing to write through the alias.
- The search query included `metadata.*`, but the mapping disables parsing and indexing for `metadata`, so those fields are not searchable. Removed `metadata.*` from the query fields.
- The ILM policy used `max_size`, which Elasticsearch documents as deprecated for rollover. Changed it to `max_primary_shard_size`.
- The archival code used the CAT indices API for application logic and assumed date-based index names. Changed it to use the indices get API and compare index creation dates.

## Review Notes
The examples are still presented as tutorial snippets rather than a complete copy-paste application; shared symbols such as `LogEntry`, `bufferLog`, `app`, `esClient`, and `logQueue` would need normal module exports/imports in a production codebase.
