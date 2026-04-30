# Validation Summary: How to Install Longhorn from Rancher UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Rancher
- Kubernetes
- Helm chart values in Rancher Apps
- kubectl
- iSCSI / open-iscsi
- NFSv4 client support for RWX volumes

## Sources Consulted
- Longhorn installation requirements and prerequisites: https://longhorn.io/docs/1.11.1/deploy/install/
- Longhorn installation with Rancher Apps & Marketplace: https://longhorn.io/docs/1.11.1/deploy/install/install-with-rancher/
- Longhorn Helm values reference: https://longhorn.io/docs/1.11.1/references/helm-values/
- Longhorn default settings customization: https://longhorn.io/docs/1.11.1/advanced-resources/deploy/customizing-default-settings/
- Longhorn storage class parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn settings reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn UI access: https://longhorn.io/docs/1.11.1/deploy/accessing-the-ui/
- Longhorn project overview: https://longhorn.io/docs/1.11.1/what-is-longhorn/
- Longhorn best practices: https://longhorn.io/docs/1.11.1/best-practices/
- Rancher Helm charts and apps navigation: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher

## Issues Found
- The introduction described Longhorn as a "Rancher/SUSE project". Official Longhorn docs now describe it as originally developed by Rancher Labs, so I removed the outdated ownership wording.
- The prerequisites omitted Longhorn's current Kubernetes version requirement and included a hard `10 GiB` per-node minimum that is not stated in the official installation docs. I replaced this with the documented Kubernetes requirement and storage guidance.
- The node preparation commands treated NFS client packages as universally required and used a simplified RHEL/CentOS/Rocky iSCSI setup. I changed the text to make NFS client installation conditional on RWX usage and updated the RHEL/CentOS/Rocky commands to match the official Longhorn `open-iscsi` installation steps.
- The installation flow assumed a mandatory Rancher `Metadata` page with explicit namespace and name selection. I changed this to version-neutral wording that matches current Rancher and Longhorn documentation.
- The `defaultReplicaCount` comment implied it applied to all new volumes. Longhorn documents that this setting applies to volumes created through the Longhorn UI, while Kubernetes-provisioned volumes use StorageClass parameters, so I corrected the comment.
- The Rancher access steps relied on an `Endpoints` section in Installed Apps. Official Longhorn docs direct users to the Rancher `Longhorn` entry or app icon, so I updated those instructions.
- The Longhorn UI navigation said `Volume` instead of `Volumes`. I corrected the menu label to match the current UI.

## Review Notes
- Longhorn documentation still uses the phrase `Apps & Marketplace`, while newer Rancher documentation labels the same area simply `Apps`. The post now mentions both to avoid version-specific confusion.
- The example `storageOverProvisioningPercentage: 200` is a valid Helm value, but Longhorn best-practices guidance makes clear that the right value depends on workload behavior and disk layout; `100` remains the safer baseline on root disks.
- The post assumes installation and upgrade are performed from the current Rancher Apps flow. Longhorn documents that upgrades should be performed from the same Rancher UI path that was used for installation.
