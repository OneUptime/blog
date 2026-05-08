# Validation Summary: Tuning Request/Response Rate (TCP_RR) in Cilium Performance

## Status
validated

## Post Type
Technical tuning guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- netperf TCP_RR
- Linux TCP and network sysctls
- eBPF socket load balancing and conntrack maps

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes Without kube-proxy / socket load balancer docs: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium eBPF Maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium local agent command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium policy audit mode documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v5.10/networking/ip-sysctl.html
- Linux kernel network core sysctl documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- Netperf manual: https://hewlettpackard.github.io/netperf/doc/netperf.html

## Issues Found
- The benchmark used the server Pod IP while the socket-LB tuning applies to service load-balancing paths. I changed the setup to expose the netperf server as a ClusterIP service and run TCP_RR against the service IP.
- The `kubectl run` examples did not force the intended command as the container command. I added `--command --` so `netserver` and `netperf` are executed directly.
- The Cilium Helm keys `bpf.ctGlobalTCPMax`, `bpf.ctGlobalAnyMax`, and `bpf.ctTCPTimeoutEstablished` are not current Helm values. I replaced them with `bpf.ctTcpMax`, `bpf.ctAnyMax`, and `bpf.preallocateMaps=true`, which are documented Helm values.
- The conntrack inspection command used the old/local Cilium agent CLI form. I changed it to execute `cilium-dbg bpf ct list` through the Cilium DaemonSet.
- The policy complexity example used `cilium policy get`, which is not the current Kubernetes-facing Cilium CLI workflow. I changed it to inspect Cilium policy CRDs with `kubectl get cnp,ccnp`.
- The kernel tuning section implied TIME_WAIT, FIN timeout, and TCP Fast Open settings improve single-connection TCP_RR transaction latency. I clarified that these affect connection churn or application-supported connection setup, not transactions on an already established TCP_RR connection.
- The netperf latency selector example used lowercase selectors and `-o`. I changed it to documented uppercase selectors with `-O`.
- The troubleshooting note said to verify pods are on different nodes for socket-LB improvement. I corrected it to verify the benchmark targets a ClusterIP service rather than the backend Pod IP.
- The socket-LB and policy sections used overly broad wording. I clarified that socket LB avoids per-packet service NAT rather than all TC processing, and replaced the unsupported "endpoint-specific policy caching" wording with policy audit mode benchmarking guidance.

## Review Notes
The guidance remains workload-dependent. Cilium map preallocation and Linux busy polling can reduce latency in some environments but increase memory or CPU/power usage, so benchmark before and after on the target hardware.
