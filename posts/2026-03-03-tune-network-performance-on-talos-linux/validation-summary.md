# Validation Summary: How to Tune Network Performance on Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux machine configuration
- Linux TCP/IP sysctls
- Kubernetes Pods, Services, and DaemonSets
- Cilium Helm values and eBPF networking
- Calico FelixConfiguration and eBPF dataplane
- iperf3 network testing

## Sources Consulted
- Talos Linux v1.12 machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux v1.12 configuration overview: https://docs.siderolabs.com/talos/v1.12/reference/configuration/overview
- Talos Linux v1.12 physical links documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/physical
- Talos Linux v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.4/networking/ip-sysctl.html
- Linux kernel networking scaling documentation: https://docs.kernel.org/networking/scaling.html
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The Cilium example used `bpf.hostRouting`, which is not a current Cilium Helm value. Changed it to `bpf.hostLegacyRouting: false`, the documented value for using direct BPF host routing when supported.
- The jumbo frames example used the legacy `.machine.network.interfaces` MTU form. Talos v1.12 documents physical interface MTU configuration with `LinkConfig`, so the snippet now uses a `LinkConfig` document for `eth0`.
- The iperf3 client connected to `iperf-server` as though the pod name were a Service DNS name. Added `--port=5201` to the server pod and a `kubectl expose pod iperf-server` command so the client resolves `iperf-server` through Kubernetes Service DNS.

## Review Notes
- The sysctl examples are syntactically valid Talos machine sysctl entries, but the exact best values remain workload, kernel, memory, NIC, and network dependent.
- Talos v1.12 still supports legacy `.machine.network.interfaces` for backward compatibility, but it is deprecated in favor of separate network configuration documents such as `LinkConfig`.
- RPS/RFS can also be managed through Talos `machine.sysfs` for known per-interface sysfs paths, but the DaemonSet approach remains a plausible cluster-level way to apply dynamic per-queue settings.
