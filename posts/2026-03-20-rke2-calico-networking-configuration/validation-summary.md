# Validation Summary: How to Configure RKE2 Networking with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Calico
- Kubernetes CNI
- HelmChartConfig
- BGP
- IP pools
- Calico GlobalNetworkPolicy
- calicoctl
- Prometheus metrics

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Helm Integration: https://docs.rke2.io/add-ons/helm
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Calico chart values: https://github.com/rancher/rke2-charts/blob/main/charts/rke2-calico/rke2-calico/v3.31.500/values.yaml
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico service IP advertisement: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico network policy documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl installation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl Kubernetes datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The opening claim that Calico provides the most powerful NetworkPolicy capabilities of any RKE2 CNI was too absolute and not technically verifiable. Reworded it to state that Calico supports Kubernetes NetworkPolicy plus Calico-specific policy resources such as `GlobalNetworkPolicy`.
- The HelmChartConfig comments implied changing a value to `None` for BGP without identifying the correct fields. Updated the guidance to say native BGP requires `bgp: Enabled` and IP pool `encapsulation: None`.
- The BGP section described `serviceClusterIPs` as advertising pod CIDRs. Corrected the comment to say it advertises service CIDRs; Calico advertises pod/workload routes separately when BGP routing is enabled.
- The post did not state how `projectcalico.org/v3` resources should be applied in an RKE2 Calico install. Added guidance to use `calicoctl`, or enable the Calico API server before using `kubectl` for that API group.
- The verification commands checked Calico pods in `kube-system`, but current operator-based Calico deployments place core Calico pods in `calico-system` and the operator in `tigera-operator`. Updated the commands and added `kubectl get tigerastatus`.
- The `calicoctl` installation command used an old manifest URL that redirects to an archived Calico v3.25 manifest and the `kubectl exec -n kube-system calicoctl` command assumes a pod name that is not part of the current RKE2 chart. Replaced it with the official current kubectl plugin installation workflow and `kubectl calico get ippool -o wide`.
- The cloud/BGP best-practice note overstated that BGP is blocked by default across AWS, Azure, and GCP. Reworded it to recommend VXLAN when BGP peering to the underlay is unavailable.
- The bare-metal BGP best-practice note did not mention the requirement for the fabric to peer with Calico and route pod CIDRs. Added that condition.
- The Prometheus note attributed metrics to the Tigera operator. Reworded it to monitoring Calico component metrics with Prometheus.

## Review Notes
- The `calicoctl` download URL is version-specific. Operators should match the `calicoctl` version to the Calico version bundled with their RKE2 release.
- The examples use IPv4-only CIDRs. RKE2 and Calico support dual-stack, but dual-stack configuration has additional install-time considerations outside the scope of this post.
