# Validation Summary: How to Configure Calico on Single-Node Kubernetes for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- calicoctl
- kubectl
- Calico IPPool, FelixConfiguration, and BGPConfiguration resources

## Sources Consulted
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl datastore configuration documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico BGPConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP peering configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico v3.27.0 Kubernetes manifest CRD definitions: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
- Kubernetes kubectl rollout documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The calicoctl install command wrote directly to `/usr/local/bin/calicoctl` without `sudo`, which commonly fails for non-root users. Changed the command to download `calicoctl` locally, mark it executable, and move it into `/usr/local/bin/` with `sudo`, matching the official installation pattern.
- The inspection command used `calicoctl get node -o yaml`. Changed it to `calicoctl get nodes -o yaml`, which matches Calico documentation examples and avoids depending on singular resource aliases.
- The introduction and IP pool step implied that disabling encapsulation and BGP mesh can be promoted unchanged to production multi-node clusters. Clarified that those single-node settings must be revisited before scaling beyond one node, because multi-node clusters need an appropriate overlay or routing/BGP design.

## Review Notes
The Calico v3.27.0 CRDs confirm that the IPPool fields `cidr`, `ipipMode`, `vxlanMode`, `natOutgoing`, and `nodeSelector`; the FelixConfiguration fields `logSeverityScreen`, `healthEnabled`, `iptablesRefreshInterval`, `ipv6Support`, and `reportingInterval`; and the BGPConfiguration fields `logSeverityScreen`, `nodeToNodeMeshEnabled`, and `asNumber` are valid. Calico v3.27.0 is not the latest Calico release as of this review, but the post explicitly targets that version and the version-specific examples remain technically valid.
