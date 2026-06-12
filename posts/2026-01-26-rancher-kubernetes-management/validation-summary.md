# Validation Summary: How to Set Up Rancher for Kubernetes Management

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Helm
- cert-manager
- RKE2 and K3s
- Rancher RBAC
- Rancher Monitoring
- Prometheus Operator ServiceMonitor
- Rancher Backup Operator

## Sources Consulted
- Rancher Manager installation with Helm: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- Rancher RBAC custom roles: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/custom-roles
- Rancher global permissions and GlobalRole scope: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher monitoring enablement: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher monitoring and alerting overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting
- Rancher backup documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- SUSE Rancher Manager backup and restore reference: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/rancher-admin/back-up-restore-and-disaster-recovery/back-up-restore-and-disaster-recovery.html
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The architecture diagram implied Rancher uses an `etcd / PostgreSQL` datastore directly. Updated it to refer to the datastore of the local Kubernetes cluster that hosts Rancher.
- The prerequisites omitted the required Ingress controller for the Rancher UI/API. Added it to match Rancher's Helm install requirements.
- The cert-manager install pinned an older chart version and manually applied CRDs. Updated the command to the current Rancher/cert-manager Helm pattern using `--create-namespace` and `--set crds.enabled=true`.
- The Let's Encrypt Rancher install omitted the current strict agent TLS caveat. Added the required note about uploading the Let's Encrypt CA and using `--set privateCA=true` when `agentTLSMode` is strict.
- The custom role example used `GlobalRole` for workload permissions. Changed it to a project-scoped `RoleTemplate`, which is the correct Rancher resource for namespaced workload permissions such as deployments.
- The monitoring Helm example installed `rancher-monitoring` without first installing its CRD chart. Added the `rancher-monitoring-crd` install step.
- The backup section claimed Rancher backs up both the Rancher server and managed clusters. Corrected it to state that the Rancher Backup operator backs up Rancher server configuration; downstream workloads and datastores need separate backup tooling.
- The Backup examples used `rancher-resource-set`, which is not the documented ResourceSet name. Updated both examples to `rancher-resource-set-full`.
- The production best practice recommended an external PostgreSQL or MySQL database for Rancher itself. Reworded it to recommend a highly available Kubernetes cluster with a reliable etcd or supported K3s/RKE2 datastore for the Rancher management plane.

## Review Notes
The post remains version-sensitive. Rancher feature chart versions, supported Kubernetes versions, and generated node registration commands should still be copied from the Rancher UI for the exact Rancher release in use.
