# Validation Summary: How to Log and Audit Calico Policies for High-Connection Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- FelixConfiguration
- kubectl
- conntrack

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico log rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The policy example did not include any `action: Log` rules, so it did not actually log or audit the traffic described by the post. Added `Log` rules before the matching `Allow` rules, following Calico's documented behavior that `Log` records matching traffic and policy evaluation continues to the next rule.
- The Felix tuning command used `ipSetSize`, which is not a documented FelixConfiguration field. Removed it and kept the documented `maxIpsetSize` field.
- The high-connection tuning example did not adjust the documented eBPF conntrack map size. Added `bpfMapSizeConntrack`, which Calico documents as the map that must be large enough to hold active connections when using the eBPF dataplane.

## Review Notes
Calico documentation warns that log rules can add significant overhead, so in a production high-connection workload they should be scoped narrowly and removed or disabled after audit/testing unless continuous logging is explicitly required. The `bpfMapSizeConntrack` setting is relevant to Calico's eBPF dataplane; clusters using the standard Linux dataplane still need node-level conntrack capacity monitoring and tuning outside Calico.
