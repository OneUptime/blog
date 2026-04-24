# Validation Summary: How to Design Rancher Architecture for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- etcd
- Kubernetes networking and ResourceQuota
- Longhorn
- Helm
- Rancher Backup operator
- Amazon S3-compatible backup storage

## Sources Consulted
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/v2.12/getting-started/installation-and-upgrade/installation-requirements
- Rancher tips for running Rancher: https://ranchermanager.docs.rancher.com/reference-guides/best-practices/rancher-server/tips-for-running-rancher
- Rancher port requirements: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher backup install and migration flow: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher backup configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher backup examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- RKE2 high availability: https://docs.rke2.io/install/ha
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 network options: https://docs.rke2.io/networking/basic_network_options
- RKE2 managing server roles: https://docs.rke2.io/install/server_roles
- etcd hardware recommendations: https://etcd.io/docs/v3.4/op-guide/hardware/
- etcd FAQ and performance guidance: https://etcd.io/docs/v3.7/faq/
- etcd cluster status checks: https://etcd.io/docs/v3.7/tasks/operator/how-to-check-cluster-status/
- Longhorn install with Helm: https://longhorn.io/docs/1.9.1/deploy/install/install-with-helm/
- Longhorn default settings customization: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Rancher project resource quota types: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/resource-quota-types

## Issues Found
- The reference architecture listed `AWS ALB`, but Rancher documents a layer 4 TCP load balancer for HA installs. I changed the diagram to use a layer 4 load balancer example (`AWS NLB / F5 / HAProxy`).
- The Rancher management cluster snippet used the old RKE1 `nodes` and `roles` format inside an RKE2 section. I replaced it with a current RKE2 HA configuration example that uses a fixed registration address, `token`, `server`, and `tls-san`.
- The etcd verification command used `etcdctl check perf` without the TLS parameters required for RKE2 embedded etcd. I replaced it with an official `etcdctl endpoint health` example using the documented RKE2 certificate paths, and aligned the latency guidance with etcd's `wal_fsync_duration_seconds` p99 recommendation.
- The networking guidance omitted Canal, which is the default bundled CNI in RKE2, and described Flannel/Calico in a way that was too narrow for current docs. I updated the CNI notes and aligned the sample pod/service CIDRs with RKE2 defaults.
- The Longhorn section mixed shell commands and YAML in a single `yaml` code block and omitted the required Helm repository setup and namespace creation flag. I split the examples into separate bash and YAML blocks and added a note that `kubernetes.io/no-provisioner` local storage requires manually created local PVs.
- The Rancher backup section omitted the Helm repo setup, CRD chart installation, chart-version selection, and required Backup fields such as `resourceSetName` and the S3 endpoint. I updated the commands and Backup custom resource to match current Rancher backup documentation.

## Review Notes
- The management-cluster sizing guidance in the post matches Rancher's documented upstream RKE2 sizing tiers for small, medium, and large deployments.
- Longhorn production installs still require host-level prerequisites such as `open-iscsi`; the post remains architecture-focused, so I did not expand it into a full install guide.
- Exact supported Rancher, RKE2, and `rancher-backup` versions should always be checked against the Rancher support matrix when publishing version-pinned operational guidance.
