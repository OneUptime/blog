# Validation Summary: One Prometheus or One per Network? Monitoring Isolated Environments

## Status
validated

## Post Type
Architecture guide

## Technologies Covered
- Prometheus
- Prometheus Agent mode
- Prometheus hierarchical federation
- Prometheus remote write
- Prometheus recording and alerting rules
- Alertmanager
- TLS and mutual TLS
- Network segmentation and Kubernetes NetworkPolicy
- High-availability metric deduplication

## Sources Consulted
- Prometheus architecture overview — https://prometheus.io/docs/introduction/overview/
- Prometheus hierarchical federation — https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus Agent mode — https://prometheus.io/docs/prometheus/latest/prometheus_agent/
- Prometheus command-line flags — https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus configuration reference (`external_labels`, scrape configuration, `honor_labels`, `tls_config`, and `remote_write`) — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote-write tuning — https://prometheus.io/docs/practices/remote_write/
- Prometheus HTTP API remote-write receiver documentation — https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus security model — https://prometheus.io/docs/operating/security/
- Prometheus high-availability FAQ — https://prometheus.io/docs/introduction/faq/#can-prometheus-be-made-highly-available
- Alertmanager high availability — https://prometheus.io/docs/alerting/latest/high_availability/
- Kubernetes NetworkPolicy documentation — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus 3.13.0 release and official `promtool` binary — https://github.com/prometheus/prometheus/releases/tag/v3.13.0

## Issues Found
1. **The capacity checklist could imply that an HA pair pools ingestion capacity**: The original wording asked whether capacity fits "one server or intentional HA pair." Prometheus HA uses identical servers that independently scrape the same targets; the replicas do not divide the scrape load. Changed the checklist to require the target set and cardinality to fit each server in a single-server or HA-pair deployment.

## Review Notes
- Both YAML snippets pass `promtool check config` with Prometheus 3.13.0.
- The Agent-mode guide currently describes a two-hour temporary buffer, while the Prometheus 3.13.0 command-line reference lists defaults of `5m` for `--storage.agent.retention.min-time` and `4h` for `--storage.agent.retention.max-time`. The post correctly treats retention behavior as release-specific and tells readers to check the deployed binary.
- The federation example relies on the default HTTP scheme and omits authentication for brevity. The surrounding text correctly requires TLS, authentication, and network policy when protecting the endpoint across a boundary.
- Prometheus's built-in remote-write receiver remains documented as suitable only for specific low-volume use cases, not as a general replacement for scrape ingestion.
- All external documentation links in the post resolved to the intended official pages during review.
