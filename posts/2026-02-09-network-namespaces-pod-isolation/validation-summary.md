# Validation Summary: How to Use Network Namespaces for Pod Isolation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- iproute2 (`ip`, `ip netns`, `tc`)
- veth pairs and Linux bridges
- iptables NAT
- Kubernetes pod networking
- Container Network Interface (CNI)
- `kubectl`, `crictl`, `nsenter`, `lsns`, `ss`, `tcpdump`

## Sources Consulted
- Linux `network_namespaces(7)` manual: https://www.man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux `veth(4)` manual: https://www.man7.org/linux/man-pages/man4/veth.4.html
- iproute2 `ip-netns(8)` manual: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- iproute2 `ip-link(8)` local manual and `ip link help` output
- util-linux `nsenter(1)` manual: https://man7.org/linux/man-pages/man1/nsenter.1.html
- util-linux `lsns(8)` manual/help output: https://manpages.debian.org/bookworm/util-linux/lsns.8.en.html
- `tc-tbf(8)` manual and local `tc qdisc add tbf help` output: https://www.man7.org/linux/man-pages/man8/tbf.8.html
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes crictl debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/cluster-administration/network-plugins/
- CNI specification: https://www.cni.dev/docs/spec/

## Issues Found
- The orphaned namespace example searched for `containerd` daemon PIDs with `ps aux | grep containerd`, which does not identify container or pod sandbox network namespaces. Replaced it with `lsns -t net` and `lsns -t net -P`, and clarified that `ip netns list` only lists named namespaces.
- The traffic-control section described namespace resource limits broadly, but the command applies a TBF bandwidth limit to a specific interface. Updated the wording to say it limits an interface in the namespace.
- The `tc tbf` example used `burst 32kbit` even though `burst` is a byte-size parameter. Changed it to `burst 32kb`.
- The best-practices item said IP forwarding is required for routing between namespaces, which is too broad for directly connected same-subnet veth pairs. Clarified that forwarding is required when a host or namespace routes traffic between networks.

## Review Notes
The remaining commands are technically valid, but several Kubernetes debugging examples depend on runtime and node details: `crictl` must be configured for the node's CRI endpoint, the inspected container must be running, and host-network pods share the node network namespace rather than getting an isolated pod network namespace.
