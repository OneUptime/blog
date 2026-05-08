# Validation Summary: Upgrade Calico on Rancher Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Rancher Manager
- RKE
- RKE2
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Automated Upgrades: https://docs.rke2.io/upgrades/automated
- Rancher Upgrading and Rolling Back Kubernetes: https://ranchermanager.docs.rancher.com/v2.9/getting-started/installation-and-upgrade/upgrade-and-roll-back-kubernetes
- Rancher Registering Existing Clusters: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- RKE1 Upgrades: https://rke.docs.rancher.com/upgrades
- Calico Upgrade on Kubernetes: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl install reference: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The operator-managed Calico upgrade command applied only the Tigera Operator manifest and did not apply the target version's Calico CRDs first. Updated the example to download and apply `v1_crd_projectcalico_org.yaml` and `tigera-operator.yaml` with `kubectl apply --server-side --force-conflicts`, matching the official Calico operator upgrade procedure.
- The backup section said it exported all Calico resources, but the listed commands only export key policy and IPAM resources. Updated the section wording and comment to avoid overstating the coverage.
- The operator example pinned Calico v3.28.0, which is no longer the current version in the official Calico documentation consulted during this review. Updated the example URLs to v3.32.0, the documented target version in the current Calico upgrade guide.

## Review Notes
- The recommendation to use Rancher UI-managed upgrades for Rancher-managed RKE2 clusters is consistent with RKE2 and Rancher documentation.
- The `calicoctl` commands and use of `-A/--all-namespaces` for namespaced Calico policy resources are consistent with the official calicoctl reference.
- `calicoctl node status` is mainly useful for Calico node and BGP status; clusters using non-BGP modes may need additional validation beyond this command.
