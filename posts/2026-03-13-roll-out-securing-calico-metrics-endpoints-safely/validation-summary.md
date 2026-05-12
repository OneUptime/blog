# Validation Summary: How to Roll Out Calico Metrics Endpoint Security Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Calico GlobalNetworkPolicy
- Felix (Calico component)
- Kubernetes
- Prometheus
- calicoctl CLI
- kubectl CLI

## Sources Consulted
- Calico documentation on GlobalNetworkPolicy: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/configuration (default port 9091)
- calicoctl resource reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico selector syntax reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector-syntax

## Issues Found
- **Incorrect verification command for GlobalNetworkPolicy**: The post created a `GlobalNetworkPolicy` (a cluster-scoped Calico resource) but the verification step used `calicoctl get networkpolicies -n kube-system | grep metrics`. `networkpolicies` is a different, namespaced Calico resource, and passing `-n kube-system` would not return the GlobalNetworkPolicy. Changed the command to `calicoctl get globalnetworkpolicies | grep metrics`, which is the correct resource type and is cluster-scoped (no `-n` flag).

## Review Notes
- The Felix Prometheus metrics default port (9091) is correct.
- The deny rule lists ports `[9091, 9092, 9093]`. Port 9091 is Felix metrics, 9093 is the Typha metrics default. Port 9092 isn't a standard Calico metrics port (kube-controllers defaults to 9094), but including it as defense-in-depth in a deny rule isn't technically wrong, just unnecessary.
- The `selector: k8s-app == 'calico-node'` matches the label used by the standard `calico-node` DaemonSet manifests.
- The Calico selector syntax (`==`, single-quoted string values) is correct.
- The flow-logs path `/var/log/calico/flow-logs/*.log` is associated with Calico Enterprise (Tigera) rather than open-source Calico. Users on Calico OSS may not find logs at this path. Left as-is since the post does not explicitly claim OSS vs Enterprise; readers should adapt this to their flow-log source.
- Rule ordering note: Calico evaluates rules in array order; the first matching Allow rule terminates evaluation, so the trailing Deny acts as an explicit catch-all for the listed ports — behavior is as the author intends.
