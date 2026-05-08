# Validation Summary: How to Secure Performance Tuning in Cilium Hubble

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus metrics
- Hubble Exporter
- TLS and mTLS

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes configuration reference for monitor aggregation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble exporter documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Hubble TLS and metrics mTLS documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls/
- Cilium cilium-agent command reference for Hubble buffer and exporter flags: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive_dot-graph/
- Cilium performance tuning guide for Hubble event handling: https://docs.cilium.io/en/stable/operations/performance/tuning/

## Issues Found
- The monitor aggregation Helm values were shown as top-level keys (`monitorAggregation`, `monitorAggregationInterval`, and `monitorAggregationFlags`). Updated them to the current Helm values under `bpf`: `bpf.monitorAggregation`, `bpf.monitorInterval`, and `bpf.monitorFlags`.
- The drop metric verification command scraped port `9962` and searched for `cilium_drop_count_total`. Updated it to scrape the Hubble metrics port `9965` and search for the current Hubble metric `hubble_drop_total`.
- The post described `maximum` aggregation as more aggressive than `medium` and likely to hide more flow details. Updated the text and diagram because current Cilium documents `maximum` as an alias for `medium`.
- The metrics protection example used a CiliumNetworkPolicy against the Cilium agent metrics endpoint. Replaced it with the official Hubble metrics TLS and mTLS Helm configuration because Cilium documents TLS/mTLS as the supported authentication mechanism for the Hubble metrics API.
- The Hubble event buffer capacity was set to `16384`, which is invalid because Cilium requires one less than a power of two. Updated it to `16383`.
- The exporter field mask used invalid or misleading fields (`destination.port` and `drop_reason`). Updated them to `l4` and `drop_reason_desc`, which match the Hubble flow/exporter documentation.
- The export allow list used two separate filters for dropped and error verdicts. Consolidated them into a single filter matching Cilium's documented generated filter format.
- The verification curl command used the old HTTP endpoint expectation. Updated it to check the HTTPS Hubble metrics service and note that it should fail without a client certificate when mTLS is enabled.
- The troubleshooting and conclusion still referred to avoiding `maximum` aggregation and protecting endpoints with network policies. Updated those statements to match current Cilium behavior and the corrected mTLS approach.

## Review Notes
- L7 metrics such as DNS and HTTP are only emitted when the relevant traffic is visible to Hubble; for HTTP this typically requires Layer 7 visibility/policy configuration.
- Enabling Hubble metrics mTLS requires the Prometheus scrape configuration to use HTTPS and present a client certificate signed by the configured CA.
