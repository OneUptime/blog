# Validation Summary: How to Manage Multiple Clusters from a Single Rancher Instance (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Fleet
- Rancher Kubernetes API (RK-API)
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- `kubectl`

## Sources Consulted
- Fleet custom resource reference: https://fleet.rancher.io/reference/ref-crds
- Fleet `fleet.yaml` target reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Rancher global permissions: https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/rancher-admin/users/authn-and-authz/manage-role-based-access-control-rbac/global-permissions.html
- Rancher projects workflow: https://documentation.suse.com/cloudnative/rancher-manager/v2.10/en/api/workflows/projects.html
- Rancher kubeconfigs workflow: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/api/workflows/kubeconfigs.html
- Rancher enable monitoring: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/monitoring-and-dashboards/enable-monitoring.html
- Rancher v3 API guide note about RK-API support: https://documentation.suse.com/cloudnative/rancher-srfa/latest/en/api/v3-rancher-api-guide.html
- Rancher authz type definitions: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/management.cattle.io/v3/authz_types.go
- Kubernetes NetworkPolicy defaults: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota reference: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The label commands used the singular `cluster.management.cattle.io` resource name. I corrected them to `clusters.management.cattle.io`, which matches the Rancher resource name used in current docs and API examples.
- The `kubectl get clustergroup` example was changed to `kubectl get clustergroups.fleet.cattle.io` to use the explicit Fleet resource name.
- The RBAC section claimed a `GlobalRoleBinding` could grant access to a specific cluster group, but Rancher global roles with inherited cluster roles apply across downstream clusters, not a Fleet `ClusterGroup`. I replaced that example with `ClusterRoleTemplateBinding` automation for selected clusters and a supported `ProjectRoleTemplateBinding` example for project access.
- The original `GlobalRoleBinding` manifest used incorrect fields (`subjectName` and `subjectKind`). I replaced the example with current Rancher binding resources that use supported fields such as `userName`, `userPrincipalName`, and `groupPrincipalName`.
- The post used legacy `/v3` API examples for project membership, namespace creation, and kubeconfig generation. Rancher documents the v3 API as unsupported after RK-API was introduced in Rancher v2.8.0, so I replaced those examples with supported Rancher Kubernetes API and CRD workflows.
- The namespace creation example incorrectly passed `projectId` in the request body. Rancher’s documented workflow attaches a namespace to a project using the `field.cattle.io/projectId` annotation on the `Namespace` object, so I corrected that example.
- The bulk-operations script used legacy `/v3` kubeconfig generation and label filtering. I rewrote it to use the supported `kubeconfigs.ext.cattle.io` resource and standard `kubectl` label selection on Rancher cluster resources.
- The monitoring section implied that enabling Rancher Monitoring on the management cluster provided centralized downstream-cluster federation by default. Current Rancher docs describe monitoring as being enabled per cluster, with the local cluster exposing Rancher server health metrics. I corrected the instructions and wording accordingly.
- The quota section referred to “cluster quota” policies, but the manifest shown is a Kubernetes `ResourceQuota`, which is namespace-scoped. I updated the heading and description to reflect namespace quotas.

## Review Notes
- Rancher’s supported automation path is the Rancher Kubernetes API / CRD model; the legacy `/v3` API still exists in some environments but is no longer the supported interface.
- The `default-deny-all` `NetworkPolicy` and `ResourceQuota` examples are technically valid Kubernetes manifests as written.
