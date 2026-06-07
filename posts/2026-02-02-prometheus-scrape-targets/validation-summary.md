# Validation Summary: How to Configure Prometheus Scrape Targets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (scrape configuration, service discovery, relabeling)
- Kubernetes service discovery (`kubernetes_sd_configs` with `pod`, `service`, `endpoints`, `node` roles)
- Consul service discovery (`consul_sd_configs`)
- AWS EC2 service discovery (`ec2_sd_configs`)
- DNS service discovery (`dns_sd_configs` with SRV and A records)
- File-based service discovery (`file_sd_configs`)
- TLS / mTLS / Basic Auth / Bearer token authentication for scrape jobs
- node_exporter, postgres_exporter, redis_exporter (referenced)
- Alertmanager (referenced)
- curl, jq (used in troubleshooting examples)

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus relabeling docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Prometheus Kubernetes SD: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
- Prometheus Consul SD: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#consul_sd_config
- Prometheus EC2 SD: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#ec2_sd_config
- Prometheus DNS SD: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#dns_sd_config

## Issues Found

1. **Invalid `__port__` target label in Kubernetes Service Discovery example** — The "Service Discovery" subsection used `target_label: __port__` to apply the port annotation, but `__port__` is not a recognized Prometheus internal/meta label. Only `__address__` (host:port together) controls the scrape target address. Replaced the broken rule with the standard pattern that rewrites `__address__` by combining `__address__` and the `prometheus.io/port` annotation via regex `([^:]+)(?::\d+)?;(\d+)` and replacement `$1:$2` — matching the working pattern already used in the Pod Discovery example.

2. **Misleading comment on `allow_stale` in Consul SD example** — The comment read "Only discover healthy services" next to `allow_stale: false`, but `allow_stale` controls whether Consul allows reads from non-leader (potentially stale) nodes, not health filtering. Replaced with an accurate comment noting it affects Consul read consistency and the default is `true`.

## Review Notes
- All other configuration snippets (Basic Auth, Bearer token, mTLS, file_sd_configs, ec2_sd_configs, dns_sd_configs, metric_relabel_configs, sample_limit/label_limit/label_value_length_limit, hashmod sharding pattern, scrape_health alert rule) were verified against current Prometheus configuration documentation and are correct.
- `prometheus.io/scrape`, `prometheus.io/path`, `prometheus.io/port`, `prometheus.io/scheme` are widely-used community conventions (not built into Prometheus itself, but standard) — correctly described.
- The relabel rule `- source_labels: [__meta_kubernetes_namespace] / target_label: namespace` (and similar) under "Use Labels Strategically" omits an explicit `action:` field; this is fine because `replace` is the default.
- Default `metrics_path` is `/metrics`, default `scheme` is `http`, default global `scrape_interval`/`evaluation_interval` is `1m` — the post's examples and descriptions are consistent with these.
- The post references Prometheus 2.0+ for `sample_limit`; this is accurate — `sample_limit` was added in 2.5 originally as experimental and is now widely supported. The 2.0+ phrasing is loose but not wrong.
- No deprecation issues observed; `authorization: { type: Bearer, credentials_file: ... }` is the current recommended form (replacing the older `bearer_token_file` at the scrape-job level, which is still supported but legacy).
