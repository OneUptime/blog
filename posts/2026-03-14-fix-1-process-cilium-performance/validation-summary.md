# Validation Summary: Fixing Single-Process Performance Bottlenecks in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium eBPF datapath and Helm configuration
- Kubernetes CPU Manager and Guaranteed QoS pods
- Linux IRQ affinity and Receive Packet Steering
- Linux cgroups v1/v2 CPU and cpuset files
- Helm, kubectl, systemd, sysctl, chrt, and numactl

## Sources Consulted
- Kubernetes Resource Managers documentation: https://kubernetes.io/docs/concepts/workloads/resource-managers/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm Values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Masquerading documentation: https://docs.cilium.io/en/stable/concepts/networking/masquerading/
- Linux kernel networking scaling documentation: https://docs.kernel.org/networking/scaling.html
- Linux kernel SMP IRQ affinity documentation: https://www.kernel.org/doc/html/v6.9/core-api/irq/irq-affinity.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html

## Issues Found
- The CPU Manager section implied that exclusive CPUs prevent all contention. Kubernetes documents that CPU Manager exclusivity applies to other pods, while system services such as kubelet and the container runtime can still run on those CPUs. Updated the wording to clarify that node-level isolation is still needed.
- The RPS example steered receive packet processing to CPUs 2-3, which the same article used as the application's isolated CPUs. Updated the comment to explain that the mask must target non-application CPUs when the goal is isolating the workload from packet processing.
- The Cilium Helm upgrade example did not include `--reuse-values`, which can unintentionally reset existing chart configuration during tuning. Added `--reuse-values` to keep the command consistent with a safe incremental upgrade.

## Review Notes
The IRQ and RPS CPU masks are examples only; production values must be calculated from the node's actual CPU topology, NIC queue layout, and CPU Manager assignments. The Cilium tuning options are valid Helm values, but their benefits depend on kernel support and deployment mode, especially for kube-proxy replacement and eBPF host routing.
