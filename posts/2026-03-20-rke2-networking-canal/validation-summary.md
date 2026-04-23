# Validation Summary: How to Configure RKE2 Networking with Canal - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- Canal CNI
- Flannel
- Calico
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- RKE2 HelmChartConfig
- kubectl
- WireGuard
- VXLAN

## Sources Consulted
- RKE2 Network Options documentation: https://docs.rke2.io/networking/basic_network_options
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 HelmChartConfig documentation: https://docs.rke2.io/add-ons/helm
- RKE2 Installation Requirements networking ports: https://docs.rke2.io/install/requirements
- RKE2 Canal chart values: https://github.com/rancher/rke2-charts/blob/main-source/packages/rke2-canal/charts/values.yaml
- RKE2 Canal chart ConfigMap template: https://github.com/rancher/rke2-charts/blob/main-source/packages/rke2-canal/charts/templates/config.yaml
- RKE2 Canal chart CRD templates: https://github.com/rancher/rke2-charts/tree/main-source/packages/rke2-canal/charts/templates/crds
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico GlobalNetworkPolicy documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- RFC 7766, DNS Transport over TCP: https://www.rfc-editor.org/rfc/rfc7766

## Issues Found
- The Flannel backend example used `flannel-backend: wireguard-native` in `/etc/rancher/rke2/config.yaml`, which is not the current RKE2 Canal configuration surface. Updated it to use an `rke2-canal` `HelmChartConfig` with `flannel.backend: "wireguard"` and added the required Canal DaemonSet restart for existing clusters.
- The Canal overview said Calico provides optional BGP routing in this setup. Updated the wording because RKE2 Canal uses Flannel for routing and Calico for intra-node networking and policy enforcement; the Canal chart disables Calico BGP routing.
- The custom VXLAN settings used non-existent RKE2 Canal chart keys such as `vxlanPort`, `vxlanID`, `containerInterface`, `calico.mtu`, and `ipv6.enabled`. Replaced them with the chart-supported keys `flannel.backendPort`, `flannel.vni`, `flannel.directRouting`, `flannel.mtu`, and `calico.vethuMTU`.
- The GlobalNetworkPolicy example implied the Calico CRDs might need to be installed separately and only allowed DNS over UDP. Updated the comment to reflect that RKE2 Canal installs the Calico CRDs, changed the selector comment to refer to Calico endpoints, and added TCP port 53 for DNS compatibility.
- The temporary connectivity test pods were not consistently one-shot commands, and one test hard-coded `10.42.0.1`, which is not guaranteed to be a reachable pod IP or gateway. Added `--restart=Never` and cleanup flags where appropriate, and replaced the hard-coded ping target with a `TARGET_POD_IP` placeholder.
- The troubleshooting section suggested checking Calico IPAM pools, but RKE2 Canal uses host-local IPAM with node PodCIDRs. Replaced that command with a PodCIDR check against Kubernetes nodes.
- The troubleshooting comment referred only to VXLAN interfaces. Changed it to Flannel interfaces so it also applies to non-VXLAN Flannel backends such as WireGuard.

## Review Notes
- Commands and manifests were reviewed against official documentation and current chart templates; they were not applied to a live RKE2 cluster.
- Changing a Flannel backend on an existing cluster should be planned carefully. RKE2 documents restarting Canal after chart value changes, and Flannel documents that the backend should not be changed casually at runtime.
- If operators change `cluster-cidr` from the default `10.42.0.0/16`, troubleshooting commands that grep for `10.42` should be adjusted to match the configured pod CIDR.
