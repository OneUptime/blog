# Validation Summary: How to Manage Multiple Clusters from a Single Rancher Instance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2
- Fleet
- Rancher CLI
- Rancher RBAC
- Prometheus and Alertmanager
- Rancher Compliance scans

## Sources Consulted
- SUSE Rancher Manager: Registering Existing Clusters: https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/cluster-deployment/register-existing-clusters.html
- SUSE Rancher Manager: Creating an Amazon EC2 Cluster: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/cluster-deployment/infra-providers/aws/aws.html
- SUSE Rancher for AWS: RKE2 Cluster Configuration Reference: https://documentation.suse.com/en-us/cloudnative/rancher-srfa/latest/en/cluster-deployment/configuration/rke2.html
- SUSE Rancher Manager: Rancher CLI: https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/rancher-admin/cli/rancher-cli.html
- Rancher CLI repository README: https://github.com/rancher/cli/blob/main/README.md
- Rancher CLI releases page: https://github.com/rancher/cli/releases
- SUSE Edge: Fleet with Rancher: https://documentation.suse.com/suse-edge/3.2/html/edge/components-fleet.html
- SUSE Rancher Manager: Monitoring and Dashboards: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/monitoring-and-dashboards/monitoring-and-dashboards.html
- SUSE Rancher Manager: Receiver Configuration: https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/observability/monitoring-and-dashboards/configuration/receivers.html
- Rancher product docs: Prometheus Configuration: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/observability/monitoring-and-dashboards/configuration/advanced/prometheus.html
- SUSE Rancher Manager: Compliance Scans: https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/security/compliance-scans/compliance-scans.html
- Rancher source: `ClusterRoleTemplateBinding` schema: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/management.cattle.io/v3/authz_types.go
- Rancher source: built-in role templates: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/data/management/role_data.go

## Issues Found
- The RKE2 provisioning step said the example targeted existing Linux nodes, but the YAML was an Amazon EC2 machine-provisioned cluster using `Amazonec2Config`. I changed the text to describe EC2 machine provisioning and added the missing `cloudCredentialSecretName` field used by Rancher’s machine-provisioned cluster config.
- The labels/annotations example targeted `cluster.management.cattle.io` with the `fleet-default` namespace, which does not match how Fleet-managed cluster metadata is organized. I replaced it with a `clusters.fleet.cattle.io` example in the `fleet-default` workspace and clarified that the grouping applies in the Continuous Delivery UI.
- The `ClusterRoleTemplateBinding` example was missing the required `clusterName` field. I added `clusterName: c-xxxxx` so the YAML matches Rancher’s schema, where the namespace must match the cluster ID.
- The role description list mixed cluster-scoped and project-scoped roles by listing `read-only` under cluster-level RBAC. I corrected the section to keep `cluster-owner` and `cluster-member` as the primary cluster membership roles and noted that `read-only` is project-scoped.
- The Rancher CLI install and usage example was technically wrong. The original `curl -Lo rancher ...tar.gz` command downloaded a tarball into a file named `rancher`, `rancher context switch` was presented like a cluster switch even though it is project-scoped, and `rancher kubectl --cluster ...` is not supported by the current CLI. I replaced that with a verified tarball download pattern, `rancher clusters ls`, and `rancher clusters kubeconfig` followed by standard `kubectl`.
- The alerting section referenced a global alerting receiver path that is not present in current Rancher documentation. I updated it to the current per-cluster monitoring model using `Monitoring > Alerting > AlertManagerConfigs`, and noted that cross-cluster centralization should be done by sending alerts to a shared external destination.
- The best-practices section referred to a generic Rancher “CIS scan.” Current Rancher documentation uses the Compliance app and CIS profiles, so I updated the wording accordingly.

## Review Notes
- The post is now technically consistent with current Rancher documentation as of 2026-04-29.
- Exact Rancher CLI release tags change over time. The post now uses a `<version>` placeholder instead of pinning an old release. The latest Rancher CLI release I verified was `v2.14.0`, published on March 27, 2026.
