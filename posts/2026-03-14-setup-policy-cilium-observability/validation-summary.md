# Validation Summary: How to Set Up Observability Policies in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- CiliumNetworkPolicy
- Prometheus and Prometheus Operator ServiceMonitor
- Hubble CLI

## Sources Consulted
- Cilium 1.19.3 Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium 1.19.3 Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium 1.19.3 Hubble CLI flow inspection documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium 1.19.3 Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium 1.19.3 Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium 1.19.3 Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Current Hubble CLI `hubble observe --help` output from the official Hubble release binary.

## Issues Found
- The post used Cilium 1.15.0 and listed Kubernetes 1.21+ as the prerequisite. Updated the example to Cilium 1.19.3 and changed the prerequisite to the currently supported Kubernetes versions for that release.
- The Hubble metrics Helm example omitted `prometheus.enabled=true` and `operator.prometheus.enabled=true` from the official metrics setup and did not include the current `traffic_direction` label context. Added those values.
- The Hubble CLI installation used the old `master` branch URL and did not verify checksums. Updated it to the current official `main` branch command pattern with architecture selection and checksum verification.
- The post recommended `policy.cilium.io/proxy-visibility` for visibility without enforcement. Current Cilium documentation no longer supports annotation-based L7 visibility, so the example was replaced with a broad L7 CiliumNetworkPolicy rule.
- The Hubble metrics ConfigMap example used an invalid/non-functional ConfigMap shape for current Cilium. Replaced it with the documented dynamic metrics exporter ConfigMap and Helm values.
- The manual ServiceMonitor example used labels that are not recommended by the current chart documentation. Replaced it with the documented `hubble.metrics.serviceMonitor.enabled=true` Helm value.
- The Hubble CLI command `--http-status-code` is not a valid current flag. Changed it to `--http-status`.
- The L7 protocol filter used uppercase `HTTP`; updated it to the documented lowercase `http`.
- The troubleshooting section referenced unsupported Helm values `hubble.eventQueueSize` and `hubble.metricsServer.enabled`. Replaced this guidance with current chart-supported controls for metric cardinality and BPF event rate limiting.

## Review Notes
The guide is technically valid after correction. The term "observability policies" is conversational rather than a distinct Cilium API name; the post now clarifies that L7 visibility is configured with CiliumNetworkPolicy rules and Hubble metrics settings.
