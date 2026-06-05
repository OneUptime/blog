# Validation Summary: How to Configure the Receiver Creator for Dynamic Receiver Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib receiver_creator receiver
- Kubernetes observer extension
- Host observer extension
- Docker observer extension
- Prometheus receiver configuration
- Redis receiver configuration
- PostgreSQL receiver configuration
- Collector processors and OTLP exporter

## Sources Consulted
- OpenTelemetry Collector Contrib receiver_creator documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/receivercreator
- OpenTelemetry Collector Contrib Kubernetes observer documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/k8sobserver
- OpenTelemetry Collector Contrib host observer documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/hostobserver
- OpenTelemetry Collector Contrib Docker observer documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/observer/dockerobserver
- OpenTelemetry Collector Contrib Redis receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/redisreceiver
- OpenTelemetry Collector Contrib Redis receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/redisreceiver/metadata.yaml
- OpenTelemetry Collector Contrib PostgreSQL receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/postgresqlreceiver
- OpenTelemetry Collector Contrib Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md

## Issues Found
1. The post described receiver creator rules as CEL. The official receiver_creator documentation uses expr expressions. Updated the wording and summary table.
2. The configuration snippets used unsupported Go-template syntax such as `{{.Name}}`, `{{.PodIP}}`, `{{default ...}}`, and `{{if ...}}`. Replaced these with receiver_creator backtick dynamic expressions, such as `` `name` ``, `` `endpoint` ``, and expr ternary expressions.
3. Several rules referenced incorrect endpoint variables or omitted the required endpoint type. Updated rules to include `type == "pod"` where appropriate and replaced Kubernetes pod IP references with the documented `endpoint` variable.
4. The global `resource_attributes` examples used a flat map where receiver_creator expects per-endpoint-type mappings. Updated global resource attributes to use `pod:` or `port:` mappings, while leaving receiver-specific resource attributes as flat maps.
5. The complete example combined Kubernetes and host observers in one receiver creator while using `type == "port"` host rules. Because the Kubernetes observer also emits port endpoints, this could create unintended duplicate receivers. Split the complete example into `receiver_creator/k8s` and `receiver_creator/host`.
6. The Docker observer example matched containers by label but did not ensure portless containers are discoverable. Added `include_all_containers: true`.
7. The Redis metric setting `redis.connected_clients` was not a documented Redis receiver metric. Changed it to `redis.clients.connected`.
8. Removed Prometheus relabeling that relied on Kubernetes service discovery meta labels in a static receiver_creator-generated scrape config.

## Review Notes
- All YAML code blocks in the post parse as YAML after the edits.
- I did not run `otelcol --dry-run` because no OpenTelemetry Collector binary is installed in this workspace. The review was performed against official component documentation and current upstream metadata.
