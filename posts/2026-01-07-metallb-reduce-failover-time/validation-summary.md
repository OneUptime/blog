# Validation Summary: How to Reduce MetalLB Failover Time in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MetalLB
- Kubernetes
- BGP
- BFD
- Layer 2 ARP/NDP failover
- Prometheus and Grafana monitoring
- Node Problem Detector
- Linux networking sysctls

## Sources Consulted
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB Layer 2 concepts: https://metallb.universe.tf/concepts/layer2/
- MetalLB BGP concepts: https://metallb.universe.tf/concepts/bgp/
- MetalLB advanced BGP configuration: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB advanced Layer 2 configuration: https://metallb.universe.tf/configuration/_advanced_l2_configuration/
- MetalLB Prometheus metrics: https://metallb.universe.tf/prometheus-metrics/
- Kubernetes kubelet configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- Replaced the unsupported `metallb-memberlist` tuning ConfigMap with a supported NetworkPolicy example that allows memberlist traffic on TCP/UDP 7946 between speaker pods. MetalLB uses memberlist for Layer 2 node detection, but current MetalLB documentation does not expose those probe parameters as ConfigMap fields.
- Added required `spec.selector` and matching pod template labels to DaemonSet examples so they are valid `apps/v1` manifests.
- Corrected `base_reachable_time_ms` from `30` to `30000`; the sysctl is measured in milliseconds, so `30` would configure 30 ms rather than 30 seconds.
- Replaced invalid `gracefulRestart.enabled/time` fields in `BGPPeer` examples with the documented `enableGracefulRestart: true` field.
- Corrected BFD comments and removed `minimumTtl` from directly connected BFD examples because MetalLB documents it as a multi-hop BFD setting.
- Replaced the `no-export` community string with the numeric well-known community `65535:65281`; MetalLB accepts numeric communities or aliases defined by a `Community` CRD, not undeclared names.
- Revised the node failure detector example so it no longer claims that `SIGUSR1` to a speaker process triggers MetalLB route withdrawal. The replacement logs health failures for alerting or external automation.
- Fixed the Node Problem Detector example to stop referencing missing `kernel-monitor.json` and `docker-monitor.json` files, and set executable mode for the mounted custom check script.
- Replaced the removed/undocumented `--pod-eviction-timeout` kube-controller-manager example with current node monitoring/eviction-rate flags.
- Updated Prometheus and Grafana examples to include current FRR-K8s `frrk8s_*` metrics as well as native or relabeled `metallb_*` metrics, and removed queries for metrics not listed in current MetalLB documentation.
- Removed `sourceAddress` from multi-node `BGPPeer` examples because MetalLB documents that source addresses should normally be used with per-node peers where the address exists on that selected node.
- Adjusted BGP and Layer 2 failover timing language to reflect documented behavior: Layer 2 normally converges within a few seconds in healthy client networks, while BGP failover without BFD depends on negotiated hold timers.

## Review Notes
The post is now technically valid as a production-oriented guide, but several snippets remain environment-specific examples. Operators still need to align labels, router BGP/BFD capabilities, MetalLB installation mode, ServiceMonitor selectors, and security policies with their actual cluster.
