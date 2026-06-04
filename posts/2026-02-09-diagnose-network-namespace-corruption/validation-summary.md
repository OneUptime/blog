# Validation Summary: How to Diagnose Pod Network Namespace Corruption

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes Pods and node debugging
- Linux network namespaces
- Container Network Interface (CNI)
- Calico
- Cilium
- CRI runtimes and `crictl`
- Linux `iproute2`, veth, routes, iptables, sysctl

## Sources Consulted
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Services, Load Balancing, and Networking documentation: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes crictl debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- CNI specification: https://www.cni.dev/docs/spec/
- CNI `cnitool` documentation: https://www.cni.dev/docs/cnitool/
- Linux `ip-netns(8)` manual: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `network_namespaces(7)` manual: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Calico WorkloadEndpoint documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/

## Issues Found
- Clarified that non-`hostNetwork` pods have their own network namespace, shared by containers in the pod. This avoids implying that host-networked pods get a separate pod network namespace.
- Corrected the architecture explanation to say the container runtime invokes CNI and exposes pod sandbox namespace paths, instead of saying kubelet directly tracks the namespace paths.
- Fixed node-debug examples to inspect the host filesystem via `/host/var/run/netns`, because `kubectl debug node` mounts the node root at `/host`.
- Clarified that `ip netns list` only shows named namespaces under `/var/run/netns`; some pod namespaces are visible only through `/proc/<pid>/ns/net`.
- Replaced default-namespace pod counting with `kubectl get pods -A --field-selector spec.nodeName=my-node`, so the comparison includes all namespaces on the target node.
- Corrected namespace cleanup and runtime inspection examples to use pod sandboxes with `crictl pods` and `crictl inspectp`, rather than regular containers with `crictl ps` and `crictl inspect`.
- Updated the Cilium endpoint command to `cilium-dbg endpoint list`, matching current Cilium command documentation.
- Changed the gateway connectivity test to read the pod's actual default gateway from `ip route` instead of assuming the gateway is `.1`.
- Added privilege and implementation caveats for checking iptables inside a pod, because many pod images lack `iptables` or `CAP_NET_ADMIN`, and many CNI rules live on the node.
- Reframed DNS `/etc/resolv.conf` failures as container filesystem or pod DNS configuration issues rather than pure network namespace corruption.
- Replaced the direct Calico plugin invocation with a `cnitool` example, because CNI plugins consume JSON plugin configuration through the CNI execution protocol and a `.conflist` should be handled by a CNI runtime/tool.
- Fixed the monitoring example to compare named network namespaces with pod sandboxes, not individual containers.

## Review Notes
The guide remains intentionally generic across CNI implementations. Some commands still depend on node image contents, debug image contents, runtime configuration, and CNI-specific paths, so operators should adapt paths and labels to their cluster.
