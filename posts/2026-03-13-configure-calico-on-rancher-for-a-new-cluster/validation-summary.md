# Validation Summary: How to Configure Calico on Rancher for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Rancher
- RKE1
- RKE2
- Kubernetes networking
- Calico CNI
- calicoctl
- Calico IPPool and FelixConfiguration resources

## Sources Consulted
- RKE1 network plug-ins documentation: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- RKE1 Kubernetes services configuration: https://rke.docs.rancher.com/config-options/services
- Rancher RKE1 template example and RKE1 end-of-life notice: https://ranchermanager.docs.rancher.com/reference-guides/rke1-template-example-yaml
- RKE type reference for `network.mtu` and `calico_network_provider`: https://pkg.go.dev/github.com/rancher/rke/types
- RKE2 network options: https://docs.rke2.io/networking/basic_network_options
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The prerequisites said only "Rancher v2.6+", which is incomplete for a 2026 post because Rancher v2.12 and later no longer support provisioning or managing downstream RKE1 clusters. Updated the prerequisite to distinguish RKE2 clusters from RKE1 clusters on Rancher versions earlier than v2.12.
- The RKE1 UI guidance referred to Pod Security Policy without a Kubernetes version caveat. Kubernetes removed Pod Security Policy in v1.25, and RKE documents Pod Security Admission for newer Kubernetes versions. Updated the text to recommend Pod Security Admission for v1.25+ and limit Pod Security Policy to older Kubernetes versions.
- The RKE1 Calico `cluster.yml` example used `calico_network_provider.cloud_provider: none`. RKE's Calico cloud provider setting is for AWS or GCE; for no cloud-specific Calico behavior, the provider block should be omitted. Removed the invalid `none` value and left a commented AWS/GCE-only example.
- The RKE1 Calico `cluster.yml` example included `options.flannel_backend_type: vxlan`, which is a Flannel option and not a Calico option. Removed it from the Calico example.
- The pod CIDR UI path said **Cluster Options** > **Pod Security**, which is not the correct conceptual location for pod networking CIDR settings. Changed the wording to refer generally to Rancher cluster options or the cluster configuration file.
- The RKE1 service CIDR example set `service_cluster_ip_range` only under `kube-controller`. RKE documentation requires the service CIDR to match between `kube-controller` and `kube-api`. Added the matching `kube-api.service_cluster_ip_range` value.

## Review Notes
The Calico IPPool patch, FelixConfiguration fields shown, `calicoctl get`, `calicoctl apply -f -`, and `calicoctl patch ippool ... -p` commands align with current Calico documentation. The post intentionally uses Calico v3.27.0 for the download URL; current Calico docs recommend installing the `calicoctl` version that matches the cluster's Calico version, so future revisions could make that version placeholder-based.
