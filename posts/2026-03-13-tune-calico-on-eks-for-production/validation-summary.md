# Validation Summary: How to Tune Calico on EKS for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Amazon EKS
- Kubernetes NetworkPolicy
- Calico FelixConfiguration
- Calico eBPF data plane
- Tigera Operator Installation API
- Typha
- Prometheus / CloudWatch metrics scraping

## Sources Consulted
- Calico documentation: Installing on EKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Configure resource requests and limits - https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Schedule Typha for scaling to well-known nodes - https://docs.tigera.io/calico/latest/network-policy/comms/reduce-nodes
- Amazon EKS documentation: Limit Pod traffic with Kubernetes network policies - https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html

## Issues Found
- The post stated that Calico eBPF mode is supported with Linux kernel 5.3+. Calico's current eBPF requirements list the base eBPF data plane requirement as kernel 5.10+ for supported distributions, so the kernel guidance was updated.
- The eBPF enablement command only patched `linuxDataplane: BPF`. For an existing EKS cluster, Calico documentation also requires handling `kube-proxy` conflicts, and the current operator resource name is `installation.operator.tigera.io`; the command was updated and a reversible `kube-proxy` DaemonSet patch was added.
- The Felix tuning snippet set `iptablesRefreshInterval` to `90s`, which is lower than the documented default and increases refresh frequency, and it also set deprecated iptables lock options that can deadlock with `iptables-restore` v1.8+. The refresh interval was changed to `5m`, and deprecated lock settings plus the unsupported `routeRefreshInterval` were removed.
- The resource limit example patched the managed `calico-node` DaemonSet directly. Operator-managed Calico installations should configure this through the Installation CR's `calicoNodeDaemonSet` field, so the snippet was updated.
- The metrics section said to create a ServiceMonitor but supplied a Kubernetes Service. The wording was corrected, and the Service was aligned with Calico's documented headless Service pattern by adding `clusterIP: None` and `targetPort: 9091`.
- The Typha section said to enable Typha using `typhaAffinity`, which is deprecated and does not enable Typha. Operator installations include Typha, so the section was corrected to schedule Typha via `typhaDeployment` affinity and a worker-node label instead of targeting EKS control-plane nodes.

## Review Notes
The post assumes an operator-based Calico installation in `calico-system`. Clusters installed from raw manifests or using nonstandard namespaces need equivalent manifest-level changes. For eBPF migrations, production operators should also confirm API server endpoint configuration and planned `kube-proxy` handling before rollout.
