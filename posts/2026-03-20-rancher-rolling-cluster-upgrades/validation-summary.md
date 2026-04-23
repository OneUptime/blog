# Validation Summary: How to Perform Rolling Cluster Upgrades in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Kubernetes API
- RKE2
- Kubernetes cluster upgrades
- etcd snapshots and health checks
- Cluster API / Rancher provisioning resources

## Sources Consulted
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher cluster backup and snapshot documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters
- Rancher cluster configuration overview: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration
- Rancher RK-API quick start: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher API keys and token guidance: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher API token guidance: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher registered-cluster upgrade/version-management behavior: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- RKE2 backup and restore documentation: https://docs.rke2.io/datastore/backup_restore
- RKE2 server role documentation: https://docs.rke2.io/install/server_roles
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment

## Issues Found
- The description claimed "zero downtime." Rancher and Kubernetes upgrade guidance support minimizing downtime, not guaranteeing zero downtime, so I changed this to "minimal downtime."
- The post described the workflow as applying to Rancher-managed clusters in general, but the snapshot and provisioning-resource steps are specific to Rancher-provisioned RKE2 clusters. I narrowed the scope in the description and introduction so the instructions match the documented cluster type.
- The pre-upgrade snapshot section used `kubectl create job --from=cronjob/rke2-etcd-snapshot-now`, which is not a documented Rancher or RKE2 snapshot workflow. I replaced it with Rancher's documented `Snapshot Now` UI path and RKE2's documented `rke2 etcd-snapshot save` CLI.
- The Rancher UI field names in the upgrade strategy section were partly incorrect for RKE2. I changed `Max Unavailable Workers` and the generic drain wording to the documented RKE2 fields: `Worker Concurrency`, `Control Plane Concurrency`, `Drain Nodes (Control Plane)`, and `Drain Nodes (Worker Nodes)`.
- The API example targeted the legacy `/v3/clusters` flow with a v3 bearer-token pattern and omitted the documented `controlPlaneConcurrency` field. I replaced it with a Rancher Kubernetes API `kubectl patch` example against the `provisioning.cattle.io/v1` `Cluster` resource and aligned the `upgradeStrategy` shape with Rancher's documented RKE2 cluster spec.
- The monitoring command printed `.status.conditions[-1].type`, which does not reliably represent a node's readiness state and can be misleading. I simplified the watch command and switched the deeper inspection commands to Rancher provisioning resources on the management cluster.
- The upgrade-order section stated that dedicated etcd nodes are always upgraded first, then control plane, then workers. Rancher docs do not support that as a universal rule across RKE2 layouts. I rewrote the section to reflect the documented role/concurrency model and the common RKE2 server-node layout.
- The stuck-upgrade section used imprecise machine commands and a vague "stale token" recovery step. I replaced those with provisioning-resource inspection, clarified the PDB patch caveat for `minAvailable`, and pointed readers to RKE2 service logs for node-level restart failures.

## Review Notes
- The guide is technically correct after these fixes.
- The commands that inspect `clusters.provisioning.cattle.io`, `rkecontrolplanes.rke.cattle.io`, and `machines.cluster.x-k8s.io` are intended to run against the Rancher management cluster.
- Registered RKE2/K3s clusters follow Rancher's version-management flow and use the system-upgrade-controller. They also require snapshots to be taken manually outside the Rancher UI, which is why this post now explicitly targets Rancher-provisioned RKE2 clusters.
