# Validation Summary: How to Debug Calico Policies for High-Connection Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico network policy
- Kubernetes
- Calico FelixConfiguration
- Linux conntrack
- Prometheus metrics

## Sources Consulted
- Calico NetworkPolicy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico troubleshooting commands documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico connection tracking documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/conntrack
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The FelixConfiguration patch used `ipSetSize`, which is not a documented FelixConfiguration field. Removed it and kept the documented `maxIpsetSize` field.
- The `maxIpsetSize` value was set to `1048576`, which is the documented default and therefore did not tune anything. Changed it to `2097152` so the example represents an actual capacity increase.
- The command comment described broad high-connection tuning, but the settings shown affect IP set capacity and Felix metrics rather than Linux connection tracking limits. Updated the comment to describe the settings accurately.
- The `kubectl exec` example used `kube-system` and a literal placeholder-like pod name. Updated it to use the namespace shown in current Calico troubleshooting documentation, an angle-bracket pod placeholder, and the `calico-node` container name.

## Review Notes
The NetworkPolicy manifest uses the documented `projectcalico.org/v3` API, selector syntax, `order`, ingress and egress rules, and `types` fields. For real production high-connection workloads, operators may also need node-level conntrack sysctl tuning, but that would be an expansion beyond correcting this post.
