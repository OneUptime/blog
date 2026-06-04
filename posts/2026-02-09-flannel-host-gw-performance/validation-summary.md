# Validation Summary: How to Implement Flannel with host-gw Backend for Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Flannel
- CNI plugins
- Linux routing
- VXLAN
- host-gw networking
- iperf3

## Sources Consulted
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Flannel configuration documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- Current Flannel kube-flannel.yml release manifest: https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
- Flannel CNI plugin documentation: https://github.com/flannel-io/cni-plugin
- CNI bridge plugin documentation: https://www.cni.dev/plugins/current/main/bridge/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The install flow attempted to read the `kube-flannel-cfg` ConfigMap before applying the manifest. Changed the command to edit the downloaded manifest before applying it, which matches how the release manifest is commonly customized.
- The introduction mentioned "additional BGP configuration" as the way around host-gw multi-subnet limits. Flannel host-gw itself requires direct Layer 2 reachability to remote node IPs, so this was changed to refer more generally to using an overlay or another routing solution.
- The hybrid VXLAN configuration used `Directrouting`, but Flannel documents the backend option as `DirectRouting`. Fixed the key and the explanatory text.
- The host-gw troubleshooting examples showed `FLANNEL_MTU=1450` and `cni0` MTU 1450. For host-gw without encapsulation, the MTU should match the physical network, commonly 1500. Updated those examples to 1500.
- The one-shot iperf3 client examples used `kubectl run -it --rm` without `--restart=Never`. Added `--restart=Never` so the commands behave as transient test pods.

## Review Notes
The specific performance numbers remain illustrative because throughput, CPU usage, and latency depend heavily on NICs, kernel version, MTU, offload settings, and workload. The post now presents technically valid commands and configuration examples for current Flannel behavior.
