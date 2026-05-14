# Validation Summary: Cilium XDP Acceleration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- XDP
- eBPF
- Linux networking
- iperf3

## Sources Consulted
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium `cilium-dbg bpf lb list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list/
- Cilium `cilium-dbg bpf metrics list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_metrics_list/
- Kubernetes `kubectl debug` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Linux kernel BPF redirect documentation: https://www.kernel.org/doc/html/v6.3/bpf/redirect.html

## Issues Found
- The post overstated the scope of Cilium XDP acceleration as applying to all NodePort and LoadBalancer traffic. Cilium documents this acceleration for NodePort, LoadBalancer, and externalIP traffic when the request is forwarded to a remote-node backend. I narrowed the wording in the introduction and diagram.
- The prerequisites listed Cilium v1.10+ and a fixed Linux 5.4+ requirement. Cilium documents kube-proxy replacement XDP acceleration as introduced in Cilium 1.8, with kernel and driver support depending on the environment. I updated the prerequisite wording to avoid an inaccurate hard version claim.
- The DSR Helm example omitted `routingMode=native` and `loadBalancer.dsrDispatch=opt`, which Cilium's DSR examples require for IPv4 option / IPv6 extension-header dispatch. I added both settings.
- The fallback Helm example used `loadBalancer.acceleration=generic`, which is not a documented Cilium value. I replaced it with `best-effort` and clarified that devices without native XDP support continue without XDP acceleration.
- The verification commands used pod-name placeholders and older/non-documented Cilium commands such as `cilium bpf lb stats`. I replaced them with documented `kubectl exec ds/cilium -- cilium-dbg ...` commands and `bpftool net show`.
- The benchmark commands left the client pod without a long-running command and used an undefined `server-ip` placeholder. I updated them to run the client with `sleep infinity`, capture the server pod IP with `jsonpath`, and reuse that variable.
- The post gave a fixed 20-50% throughput improvement expectation. I changed this to note that improvement depends on hardware, packet size, and service topology.
- The conclusion said generic XDP mode works on all NICs. Cilium's documented modes are `disabled`, `native`, and `best-effort`; I corrected the conclusion accordingly.

## Review Notes
Cilium's XDP acceleration is most relevant for forwarded service traffic to remote backends; pod-local or same-node service paths may not exercise the XDP forwarding path. The example still assumes the externally facing device is `eth0`; operators should substitute the device Cilium reports under `KubeProxyReplacement Details` in real clusters.
