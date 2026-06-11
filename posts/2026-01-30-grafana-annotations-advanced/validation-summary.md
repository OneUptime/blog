# Validation Summary: How to Create Grafana Annotations Advanced: A Complete Guide

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana annotations and dashboards
- Grafana HTTP API
- Grafana service account tokens
- Prometheus and PromQL
- InfluxDB annotation queries
- Elasticsearch/OpenSearch annotation queries
- Kubernetes Python client and Kubernetes events
- GitHub Actions
- PagerDuty V3 webhooks
- Python and Node.js API clients

## Sources Consulted
- Grafana Annotations HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Grafana annotate visualizations: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Grafana service accounts: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana API key migration guidance: https://grafana.com/docs/grafana-cloud/security-and-account-management/authentication-and-permissions/service-accounts/migrate-api-keys/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana InfluxDB annotations documentation: https://grafana.com/docs/grafana/latest/datasources/influxdb/annotations/
- Grafana Elasticsearch annotations documentation: https://grafana.com/docs/grafana/latest/datasources/elasticsearch/annotations/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes Python client: https://github.com/kubernetes-client/python
- GitHub Actions workflow syntax and contexts: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions and https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- PagerDuty Webhook payload documentation: https://developer.pagerduty.com/docs/ZG9jOjQ1MTg4ODQ0-overview

## Issues Found
- The post described API-created annotations as potentially being injected dynamically. Grafana's annotation API creates annotations in Grafana's database, so the architecture text was corrected.
- The examples used deprecated Grafana API key terminology. Grafana service account tokens are now the primary authentication method, so placeholders and environment variable names were updated.
- The post did not mention that `/api` routes are legacy starting in Grafana 13. A short caveat was added while keeping the working annotation endpoint examples.
- The Prometheus annotation example combined `changes(...) > 0` with `useValueForTime`, which would use `1` as the annotation timestamp. It was replaced with a millisecond timestamp gauge example.
- The Prometheus "recording rule" example derived deployment time from scrape time, not actual deployment time. It was replaced with a text exposition example for deployment timestamp metrics.
- The partial annotation update example used `PUT` with only `text` and `tags`. Grafana documents `PATCH` for partial updates, so the command was corrected.
- The dashboard latency query used `histogram_quantile` without preserving the `le` label during aggregation. It now uses `sum by (le)`.
- The dashboard error-rate query divided vectors with mismatched labels. It now aggregates numerator and denominator with `sum(rate(...))`.
- The performance tips recommended pagination for annotation queries, but the documented API exposes `limit` rather than page/offset pagination. The guidance now recommends narrower time ranges and reasonable limits.
- The PagerDuty webhook example used an older `messages` payload shape. It was updated to the current V3 single `event` payload.

## Review Notes
The corrected JSON snippets parse successfully, and all Python code blocks pass Python AST syntax checks. The Kubernetes event watcher still uses the core `v1` Event API, which remains documented but should be treated as best-effort event data because Kubernetes events have limited retention and event reasons/messages can evolve.
