# Validation Summary: How to Use Hubble for eBPF-Based Kubernetes Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Hubble CLI
- Kubernetes
- Helm
- eBPF
- Prometheus / ServiceMonitor
- Grafana
- OpenTelemetry integration
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Hubble exporter documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium monitoring and Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium v1.15.0 Helm chart values: https://github.com/cilium/cilium/blob/v1.15.0/install/kubernetes/cilium/values.yaml
- Cilium v1.15.0 Kubernetes compatibility documentation: https://github.com/cilium/cilium/blob/v1.15.0/Documentation/network/kubernetes/compatibility.rst
- Cilium v1.15.0 Hubble flow API proto: https://github.com/cilium/cilium/blob/v1.15.0/api/v1/flow/flow.proto
- Cilium Hubble OpenTelemetry adapter guide: https://github.com/cilium/hubble-otel/blob/main/USER_GUIDE_KIND.md
- Hubble CLI `observe --help` output from the current official Hubble release.

## Issues Found
- The post claimed Hubble captures all network traffic including encrypted connections. Changed this to flow metadata and encrypted flow status, because Hubble observes flow metadata and does not decrypt arbitrary application payloads.
- The Kubernetes prerequisite said version 1.21 or later while the install command pins Cilium 1.15.0. Updated it to Cilium 1.15's tested Kubernetes range, 1.26 through 1.29.
- The Hubble CLI install commands used the old `master` stable.txt path and Linux-only AMD64 URLs. Updated them to the official `main` path and architecture-aware Linux/macOS commands.
- The macOS install example used `brew install hubble`, which is not the official documented installation method. Replaced it with the official Darwin binary download flow.
- Several `hubble observe` examples used `-t http`, `-t dns`, and `-t trace:sock`. Updated HTTP/DNS filters to `--protocol` and trace socket events to `-t trace-sock`, matching the CLI help.
- The pod label example used `--pod app=frontend`, but `--pod` filters by pod-name prefix. Changed it to `--label app=frontend`.
- JSON processing examples used snake_case fields such as `pod_name`, `destination_port`, `drop_reason_desc`, and `policy_match_type`. Updated them to the proto JSON field names used by Hubble JSON output.
- The service-map JSON example referenced a non-existent `.l4.protocol` field. Replaced it with protocol detection from `.l4.TCP`, `.l4.UDP`, and `.l4.SCTP`.
- The Grafana DNS panel referenced a non-existent `hubble_dns_query_duration_seconds_bucket` metric. Changed it to `hubble_dns_queries_total` grouped by `rcode`.
- The memory tuning and retention examples used the non-existent Helm value `hubble.flowBufferSize`. Replaced it with `hubble.eventBufferCapacity` and valid power-of-two-minus-one values.
- The retention example used invalid exporter rotation keys `maxSize` and `maxFiles`. Replaced them with `hubble.export.fileMaxSizeMb` and `hubble.export.fileMaxBackups`.
- The OpenTelemetry example used unsupported Helm values under `hubble.otel`. Replaced it with a technically accurate note and a valid Hubble flow exporter configuration that can feed an external collection pipeline.

## Review Notes
The post is now technically valid for the pinned Cilium 1.15.0 examples. Some examples, especially Grafana dashboards and OpenTelemetry integration, remain starter snippets rather than complete production configurations.
