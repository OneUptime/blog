# Validation Summary: How to Audit Flux Network Traffic with Network Policy Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes NetworkPolicy and audit logging
- Calico GlobalNetworkPolicy and FelixConfiguration
- Cilium and Hubble
- Prometheus and PrometheusRule
- Fluent Bit

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Cilium documentation: Inspecting Network Flows with the Hubble CLI - https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium documentation: Monitoring and Metrics / Hubble metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Hubble UI setup - https://docs.cilium.io/en/stable/observability/hubble/hubble-ui.html
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes API reference: kube-apiserver Audit Configuration v1 - https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Flux CLI documentation: flux get sources all - https://fluxcd.io/flux/cmd/flux_get_sources_all/

## Issues Found
- Corrected the opening claim that network policy logging always records every connection and verdict. Calico Log rules record matching packet logs, while tools such as Hubble provide structured verdicts.
- Corrected Calico log viewing instructions. Calico iptables policy logs are written to node kernel/syslog destinations, not reliably to calico-node pod logs.
- Replaced an inaccurate FelixConfiguration example. `policySyncPathPrefix` is not a policy log file setting, and `logFilePath` controls Felix application logs rather than packet policy logs. The example now uses `logPrefix`, `logActionRateLimit`, and `logActionRateLimitBurst`.
- Updated the Calico parsing and verification examples so they filter packet logs by Flux pod IPs or `calico-packet`, instead of grepping for `flux-system` in raw packet logs.
- Corrected the Hubble JSON parsing example to read fields from `.flow.*`, which matches Hubble JSON output.
- Corrected Hubble metrics setup and Prometheus queries. Namespace-specific flow queries require namespace labels to be enabled with `labelsContext`, and the query now uses `source_namespace`.
- Corrected the Kubernetes audit policy. `group: ""` only matches the core API group, and `namespaces: ["*"]` is not the right way to match every namespace. The policy now uses `group: "*"` and omits the namespace filter.
- Replaced a non-standard `NetworkPolicyCreated` event filter with a general recent namespace events query.
- Updated Fluent Bit input and filter examples to match Calico packet logs in syslog or kern.log.

## Review Notes
The post is technically valid after corrections. Calico log locations still depend on node OS and syslog configuration, and Cilium metric labels depend on the Hubble metric configuration used at install or upgrade time.
