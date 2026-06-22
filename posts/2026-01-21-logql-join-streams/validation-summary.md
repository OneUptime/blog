# Validation Summary: How to Join Log Streams in LogQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana dashboards and Loki data source derived fields
- Grafana Alloy log processing
- Distributed tracing and W3C Trace Context
- Node.js / Express
- Python / FastAPI / structlog
- Go / Gin / zap

## Sources Consulted
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/query/
- Grafana Loki log queries documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki query reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki template functions documentation: https://grafana.com/docs/loki/latest/query/template_functions/
- Grafana Loki data source configuration documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Loki derived fields documentation: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana Alloy `loki.process` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Alloy `loki.write` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- Express API documentation: https://expressjs.com/en/api/
- Gin package documentation: https://pkg.go.dev/github.com/gin-gonic/gin

## Issues Found
- The introduction and description implied that LogQL can "join" log streams. LogQL supports selecting multiple streams and filtering/parsing them, but not SQL-style joins for log lines. Updated the description and introduction to describe correlation rather than true joins.
- The Grafana derived fields snippet omitted the `jsonData` nesting used for Loki data source provisioning and did not escape the Grafana macro for YAML provisioning. Added `jsonData.derivedFields` and changed the internal-link URL to `$${__value.raw}`.
- The "Following Request Flow" query used `| sort by (timestamp)`, which is not a valid LogQL log pipeline stage. Removed it and noted that chronological ordering should be handled with Grafana's Oldest first option.
- The label extraction section used Promtail configuration. Promtail reached EOL on March 2, 2026, so the examples were replaced with equivalent Grafana Alloy `loki.process` examples.
- The selective label extraction example attempted to match on `level` without first making it a label. Updated the Alloy example so `level` is promoted before the `stage.match` selector is evaluated.
- The dashboard variable example used a non-existent LogQL `dedup` pipeline stage. Replaced it with a Grafana text box variable, which is appropriate for high-cardinality request IDs.
- The `traceparent` propagation header example used invalid trace and parent ID lengths. Replaced it with a valid W3C Trace Context example.
- The JavaScript ID-generation snippet redeclared the same `const requestId` name three times in one block. Renamed the sample variables so the snippet is syntactically valid.

## Review Notes
- Most LogQL parser, filter, `line_format`, and log-derived metric examples are technically valid assuming the underlying logs contain the referenced JSON fields.
- Request IDs are intentionally high cardinality. The post correctly warns against high-cardinality labels; querying parsed JSON fields or using structured metadata is usually safer than indexing request IDs as labels.
