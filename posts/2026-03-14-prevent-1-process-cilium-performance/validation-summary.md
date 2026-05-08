# Validation Summary: Preventing Single-Process Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes CPU Manager
- Kubernetes Topology Manager
- Kubernetes pod resource requests and Guaranteed QoS
- Linux IRQ affinity
- Helm
- Prometheus Operator alerting rules
- Flux HelmRelease

## Sources Consulted
- Kubernetes Resource Managers documentation: https://kubernetes.io/docs/concepts/workloads/resource-managers/
- Kubernetes Node Resource Managers documentation: https://kubernetes.io/docs/concepts/policy/node-resource-managers
- Kubernetes Topology Manager documentation: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Linux kernel SMP IRQ affinity documentation: https://www.kernel.org/doc/html/v6.5/core-api/irq/irq-affinity.html

## Issues Found
- The introduction said single-process workloads "inevitably" hit contention when Cilium eBPF packet processing competes with the workload. Changed this to "can hit" and clarified that the contention is from kernel networking work associated with Cilium's eBPF datapath, not a separate per-packet Cilium userspace process.
- The pod template comment said `topologySpreadConstraints` ensure topology alignment. Kubernetes uses Topology Manager for NUMA alignment; topology spread constraints spread matching pods across topology domains. Updated the comment accordingly.
- The Cilium Helm example used both `tunnel=disabled` and `routingMode=native`. Current Cilium Helm documentation uses `routingMode=native`; removed the older `tunnel=disabled` setting to keep the example current.
- The verification command used the cgroup v1 cpuset path only. Updated it to check the cgroup v2 `cpuset.cpus.effective` path first and fall back to the cgroup v1 path.
- The CPU Manager verification comment implied that node allocatable CPU output directly proves CPU Manager is active. Updated the comment to accurately say it verifies allocatable CPU after reservations.

## Review Notes
- The Cilium native routing example is valid only when the underlying network can route pod CIDRs directly; `autoDirectNodeRoutes=true` is appropriate for same-L2 node networks. Clusters that rely on overlays, cloud-specific routing, BGP, or different L2 domains need matching routing configuration.
- The IRQ affinity DaemonSet is a simplified example. Production environments should account for NIC naming, multi-queue devices, irqbalance behavior, CPU masks on larger systems, and node-specific CPU topology.
