# Validation Summary: How to Manage Cluster Groups in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- `kubectl`
- `jq`
- Rancher RBAC

## Sources Consulted
- Fleet docs: Create Cluster Groups - https://fleet.rancher.io/how-tos-for-operators/cluster-group
- Fleet docs: Mapping to Downstream Clusters - https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet docs: `fleet.yaml` reference - https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet docs: Custom Resources Spec - https://fleet.rancher.io/reference/ref-crds
- Fleet docs: Status Fields - https://fleet.rancher.io/reference/ref-status-fields
- Fleet docs: Namespaces - https://fleet.rancher.io/0.14/namespaces
- Rancher docs: Fleet overview - https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher docs: Adding Users to Clusters - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/add-users-to-clusters
- Rancher docs: API reference for `ClusterRoleTemplateBinding` - https://ranchermanager.docs.rancher.com/api/api-reference

## Issues Found
- The labeling examples targeted the wrong resource type. Fleet `ClusterGroup` selectors match Fleet `Cluster` resources in the workspace namespace, so the commands were corrected to label `clusters.fleet.cattle.io` in `fleet-default`.
- The `GitRepo` examples incorrectly placed `helm.values` under `spec.targets`. Fleet uses `GitRepo.spec.targets` only for cluster or cluster-group selection; per-target Helm overrides belong in repository-local `fleet.yaml` `targetCustomizations`. The examples were split accordingly.
- The monitoring examples referenced a non-existent `ClusterGroup` field, `status.readyClusters`, and relied on a `BundleDeployment` grep that does not reliably represent a cluster group. These commands were replaced with `ClusterGroup` status queries that use documented fields such as `status.clusterCount`, `status.nonReadyClusterCount`, and `status.display.readyClusters`.
- The RBAC section implied ClusterGroups are an RBAC boundary and used `GlobalRoleBinding`, which grants Rancher-wide permissions. The section was corrected to explain that access is still assigned per cluster or project, and that automation should use cluster-scoped `ClusterRoleTemplateBinding` objects instead.
- The automation script would not work as written because it queried the wrong resource, piped non-JSON `jsonpath` output into `jq`, only handled `matchLabels`, and depended on an undefined `get_cluster_kubeconfig` helper. It was updated to build a standard label selector from the `ClusterGroup` JSON, query Fleet cluster resources, and use an explicit kubeconfig directory.

## Review Notes
- The post assumes Rancher-managed downstream clusters are in the default Fleet workspace, `fleet-default`. If a different workspace is used, the namespace in the examples must be adjusted.
- The example Helm values remain illustrative and still need to match the actual chart schema in the referenced repositories.
- Fleet documentation still documents these resources under `fleet.cattle.io/v1alpha1` as of 2026-04-24.
