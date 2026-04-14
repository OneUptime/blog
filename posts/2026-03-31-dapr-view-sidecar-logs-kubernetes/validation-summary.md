# Validation Summary: How to View Dapr Sidecar Logs on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, control plane components)
- Kubernetes (kubectl, pod annotations, deployments)
- Grafana Loki (LogQL queries)
- Promtail (pipeline stages for JSON log parsing)
- jq (JSON filtering on the command line)

## Sources Consulted
- Dapr documentation: logging and troubleshooting (https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/)
- Dapr documentation: Kubernetes annotations (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr documentation: API logging (https://docs.dapr.io/operations/troubleshooting/api-logs-troubleshooting/)
- Kubernetes documentation: kubectl logs (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- Grafana Loki documentation: LogQL (https://grafana.com/docs/loki/latest/query/log_queries/)

## Issues Found
- **JSON log timestamp field name**: The JSON log output examples used `"ts"` as the timestamp field. Dapr uses the logrus logging library, which outputs the timestamp field as `"time"` in JSON format. Changed `"ts"` to `"time"` in both JSON log example lines.

## Review Notes
- The Dapr control plane section lists three of the main components (operator, sidecar-injector, sentry) but omits `dapr-placement` (actor placement) and `dapr-scheduler` (added in newer versions). This is not an error since the blog doesn't claim to be exhaustive, but readers managing actor workloads should know about the placement service.
- All kubectl commands, Dapr annotations, Promtail pipeline configuration, and LogQL syntax are correct.
- The Promtail config snippet is shown standalone; in a real deployment it would be nested under `scrape_configs[].pipeline_stages`, but the snippet is clear as an illustrative excerpt.
