# Validation Summary: How to Migrate High-Connection Workloads to Calico Network Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy API
- Calico FelixConfiguration
- Kubernetes
- kubectl
- conntrack-tools
- Mermaid diagrams

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The FelixConfiguration patch used `ipSetSize`, which is not a documented FelixConfiguration field. Removed `ipSetSize` and kept the supported `maxIpsetSize` and `prometheusMetricsEnabled` settings.

## Review Notes
- The Calico NetworkPolicy example uses the supported `projectcalico.org/v3` API, namespaced `NetworkPolicy`, ordered policy, selectors, ingress and egress rules, and `types` values.
- `maxIpsetSize` is documented as not applicable when using the nftables backend.
- The `kubectl exec ... -- conntrack -S` syntax matches the Kubernetes exec command form, assuming the selected `calico-node` container image includes the `conntrack` utility.
