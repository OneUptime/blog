# Validation Summary: Monitoring Interface and Subnet Cache in Cilium IPAM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium IPAM
- Prometheus
- Grafana
- Prometheus Operator
- Bash
- jq

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/azure/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/

## Issues Found
- The Prometheus examples used `cilium_operator_api_call_duration_seconds_count` with a `status="error"` label. Cilium documents the external IPAM API metric as `ipam_api_duration_seconds` under the `cilium_operator_` namespace, with `operation` and `response_code` labels. Updated the PromQL examples and alert rule to use `cilium_operator_ipam_api_duration_seconds_count` and `response_code!~"2.."`.
- The resync example showed `cilium_operator_ipam_resync_total` as a raw value under "Resync interval". Cilium documents it as a counter for synchronization operations with the external IPAM API. Updated the query to use `increase(cilium_operator_ipam_resync_total[5m])` and renamed the comment to "Resync activity".
- The custom monitor checked `.spec.azure.interfaces` and `.spec.eni.enis`. Cilium publishes available IPs in `spec.ipam` and interface/cache details in status fields such as `status.azure.interfaces` and `status.eni.enis`. Updated the jq expression to read `.status.azure.interfaces // .status.eni.enis`.
- The post described monitoring cache freshness and the age of cached entries. The reviewed Cilium IPAM metrics expose resyncs, external API latency, available/used/needed IPs, and related counters, but not a direct cache-entry age metric. Adjusted the wording to focus on allocation state, resync activity, and current IP availability.

## Review Notes
- The operator Prometheus Helm values and default operator metrics port `9963` match current Cilium documentation.
- The IPAM metrics are documented as enabled only for AWS, Alibaba Cloud, or Azure IPAM plugins, so the Prometheus queries are relevant for those cloud IPAM modes rather than every Cilium IPAM mode.
