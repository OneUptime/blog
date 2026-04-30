# Validation Summary: How to Create K3s Clusters on Harvester

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harvester
- Rancher
- K3s
- RKE2
- Kubernetes
- Cloud-init
- Harvester CSI Driver

## Sources Consulted
- Harvester: Creating an K3s Kubernetes Cluster: https://docs.harvesterhci.io/v1.6/rancher/node/k3s-cluster/
- Harvester: Harvester Node Driver: https://docs.harvesterhci.io/v1.5/rancher/node/node-driver/
- Harvester: Harvester Cloud Provider: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Harvester: Harvester CSI Driver: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Rancher: K3s Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/k3s-cluster-configuration
- K3s: Requirements: https://docs.k3s.io/installation/requirements
- K3s: Configuration Options: https://docs.k3s.io/installation/configuration
- K3s: Server CLI Reference: https://docs.k3s.io/cli/server
- K3s: Token CLI Reference: https://docs.k3s.io/cli/token
- K3s: Cluster Access: https://docs.k3s.io/cluster-access
- K3s: Networking Services: https://docs.k3s.io/networking/networking-services
- K3s: CIS Hardening Guide: https://docs.k3s.io/security/hardening-guide
- RKE2: Introduction: https://docs.rke2.io/
- RKE2: Requirements: https://docs.rke2.io/install/requirements

## Issues Found
- The introduction and conclusion implied that K3s on Harvester is fully seamless. Current Harvester docs still require additional Harvester cloud-provider and CSI configuration for K3s, so those statements were corrected.
- The comparison table used unverified RAM-overhead estimates and understated K3s CIS support. The resource row was updated to reflect documented minimum server requirements, and the CIS row was updated to match the official hardening guidance.
- The prerequisites omitted documented Harvester node-driver requirements for K3s: cloud images, VLAN networking, and DHCP or Managed DHCP. Those requirements were added.
- The Rancher UI steps omitted required inputs such as the Harvester cloud credential, network, and SSH user. Those details were added.
- The Rancher provisioning YAML omitted `cloudCredentialSecretName`, hardcoded an outdated K3s version as "latest", and used `disable-local-storage`, which is not the documented K3s packaged-component flag. The YAML was corrected to include the cloud credential, use a supported-version placeholder, and disable `local-storage` through the documented `disable` list.
- The Harvester machine config used `default/management`, but Harvester's K3s node-driver documentation requires a VLAN network. The example was updated to use a VLAN network and to keep the user-data aligned with the documented `qemu-guest-agent` requirement.
- The manual VM example used a manifest that was not a reliable Harvester workflow for creating SSH-reachable guest nodes. It was replaced with a cloud-image, VLAN, and cloud-init example that matches the documented Harvester/K3s requirements.
- The manual K3s server section referenced `/var/lib/rancher/k3s/server/node-token`, but current K3s documentation writes the server token to `/var/lib/rancher/k3s/server/token`. That command was corrected.
- The CSI section used an unsupported raw-manifest flow. It was replaced with Harvester's documented `generate_addon_csi.sh <serviceaccount-name> <namespace> k3s` flow and chart-based installation guidance.
- The cluster watch command was changed to the explicit `clusters.provisioning.cattle.io` resource for clarity and correctness.

## Review Notes
- Harvester documentation still marks the K3s node-driver/cloud-provider path as Tech Preview or experimental in current documentation, so support should be checked against the exact Harvester and Rancher versions in use.
- The post now intentionally avoids pinning a concrete K3s version because Rancher-supported K3s versions vary by Rancher release.
