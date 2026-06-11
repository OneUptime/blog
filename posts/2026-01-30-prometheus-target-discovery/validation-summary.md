# Validation Summary: How to Build Prometheus Target Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (scrape configs, service discovery, relabeling)
- Kubernetes service discovery (pod, service, endpoints, node roles)
- Consul service discovery
- AWS EC2 service discovery
- DNS service discovery (SRV / A records)
- File-based service discovery (JSON / YAML)
- Ansible (Jinja2 templating for target file generation)
- systemd timers
- promtool
- Prometheus HTTP API

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- promtool command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Official Kubernetes example scrape config: https://github.com/prometheus/prometheus/blob/main/documentation/examples/prometheus-kubernetes.yml
- Prometheus relabeling documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config

## Issues Found

1. **Broken pod port relabel pattern (Pod Discovery section).** The original snippet used a single source label and replacement `${1}`:
   ```yaml
   - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
     action: replace
     target_label: __address__
     regex: (.+)
     replacement: ${1}
   ```
   This would overwrite `__address__` with **only the port** (e.g., `"8080"`), dropping the host. Fixed to use the canonical two-source-label form from the official Prometheus Kubernetes example (`__address__` + annotation, with `replacement: $1:$2`), which substitutes only the port portion while preserving the host.

2. **Wrong API endpoint for service discovery debugging.** The "Check Service Discovery" section pointed at `/api/v1/targets/metadata`, which actually returns metric metadata (HELP/TYPE) for metrics scraped from targets, not service-discovery state. Replaced with `/api/v1/targets` (the documented endpoint for "an overview of the current state of the Prometheus target discovery"), plus an example of inspecting `state=dropped` targets.

3. **Misleading `promtool test rules` claim.** The original said `promtool test rules` can be used to "Test relabeling" — but `promtool test rules` only unit-tests recording/alerting rules; there is no relabel-config unit-test command (tracked as prometheus/prometheus#8606). Replaced with `promtool check service-discovery prometheus.yml <job_name>`, which actually inspects SD output and the effect of relabel_configs.

## Review Notes

- The Relabel Actions table is correct but non-exhaustive — newer actions (`lowercase`, `uppercase` added in 2.16.0; `keepequal`/`dropequal` added in 2.41.0) are omitted. Not an error, but worth a future revision pass.
- `__scrape_interval__` and `__scrape_timeout__` overrides require Prometheus 2.27.0+. Worth flagging in a future revision but not strictly wrong.
- The Consul SD `tags` filter is AND-matched (a service must contain all listed tags). The post doesn't state this explicitly; future revision could clarify.
- EC2 SD example uses static `access_key`/`secret_key` first, then recommends IAM role afterwards — order and recommendation are fine, the credential format is accurate.
- The `prometheus.io/path` annotation reference snippet still has `regex: (.+)` with no explicit replacement; this is fine because the default replacement is `$1`, so the captured path becomes the target label value. No fix needed.
- The Kubernetes node cadvisor block correctly uses the in-cluster `kubernetes.default.svc:443` proxy path; verified against the official example.
