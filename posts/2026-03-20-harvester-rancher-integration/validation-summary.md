# Validation Summary: How to Integrate Harvester with Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- Rancher
- RKE2
- Kubernetes
- Helm
- cert-manager
- Harvester Cloud Provider
- Harvester CSI Driver

## Sources Consulted
- Harvester Rancher Integration: https://docs.harvesterhci.io/v1.7/rancher/rancher-integration/
- Harvester Virtualization Management: https://docs.harvesterhci.io/v1.7/rancher/virtualization-management/
- Harvester Import Existing Cluster built on Harvester VM: https://docs.harvesterhci.io/v1.7/rancher/import-existing-vm/
- Harvester Cloud Provider: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- Rancher install/upgrade on Kubernetes: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Harvester overview: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/harvester/overview
- Rancher node drivers: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-provisioning-drivers/manage-node-drivers
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The original VM creation example was not runnable as written: it referenced root PVCs that were never created and did not define a valid boot source. I replaced that block with accurate Harvester VM requirements for a dedicated RKE2 management cluster.
- The RKE2 HA bootstrap instructions were incomplete and inconsistent with the official HA flow. I corrected them to install RKE2 on every VM, use the fixed registration address for additional server nodes, and include matching `tls-san` values.
- The cert-manager commands were pinned to an older release path and used a split CRD workflow that would age poorly. I updated the install step to the current documented Helm flow using `--set crds.enabled=true`.
- The Harvester import flow pointed readers to the wrong Rancher UI area and used the wrong registration mechanism. I changed it from `Cluster Management` plus `kubectl apply -f https://.../import/...yaml` to the documented `Virtualization Management` flow that sets Harvester's `cluster-registration-url`.
- The post-integration cloud-provider YAML snippet did not match the documented Harvester workflow. I replaced it with the supported guidance for node-driver-based RKE2 provisioning and for manually installing the Harvester Cloud Provider and CSI Driver on existing guest clusters.
- The post implied cluster provisioning on Harvester was immediately available after import. I clarified that the Harvester node driver must be active in Rancher before provisioning guest clusters.

## Review Notes
- The post now avoids hard-coding stale RKE2 and cert-manager versions. In practice, Rancher, Harvester, and guest-cluster versions should be chosen from the current support matrix before deployment.
- Harvester upstream currently warns about CVE-2025-71261 for the `cluster-registration-url` registration path on Harvester v1.7 and earlier. I added a brief caveat to the post.
- Rancher v2.10 and later require the Harvester UI Extension for embedded Harvester UI access inside Rancher. The post remains technically correct for the import flow, but that version-specific requirement is worth keeping in mind for future revisions.
