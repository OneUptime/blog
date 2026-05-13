# Validation Summary: How to Configure Calico Policies for High-Connection Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes
- Calico FelixConfiguration
- Kubernetes `kubectl patch` and `kubectl exec`
- Linux connection tracking (`conntrack`)

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico v3.26.0 CRD definitions: https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/crds.yaml
- Calico v3.32.0 CRD definitions: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/crds.yaml

## Issues Found
- The Felix tuning command used `ipSetSize`, which is not a documented or CRD-backed `FelixConfiguration` field in Calico v3.26 or current Calico. Replaced it with `bpfMapSizeConntrack`, which is documented in the Calico CRD as the eBPF conntrack map size and is directly relevant to active connection capacity.
- The same command also set `maxIpsetSize` as part of high-connection tuning. `maxIpsetSize` is a valid field, but it controls the maximum number of IP addresses in an IP set and does not tune active connection tracking. Removed it from this high-connection-specific example.
- Clarified the tuning comment to state that `bpfMapSizeConntrack` applies to the eBPF dataplane.

## Review Notes
The Calico NetworkPolicy YAML uses valid `projectcalico.org/v3` fields, including `order`, `selector`, `ingress`, `egress`, `types`, label selectors, and numeric UDP port matching. The Prometheus metrics setting and `kubectl patch` form are consistent with Calico documentation. The `kubectl exec` example assumes a Calico pod in `kube-system`; operator-based installations may use `calico-system` instead.
