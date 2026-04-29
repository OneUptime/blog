# Validation Summary: How to Manage Cluster Groups in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- GitOps
- YAML manifests
- `kubectl`

## Sources Consulted
- Fleet Create Cluster Groups: https://fleet.rancher.io/0.14/cluster-group
- Fleet Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Fleet Create a GitRepo Resource: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Fleet Status Fields: https://fleet.rancher.io/reference/ref-status-fields
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles

## Issues Found
- The cluster-label example used `clusters.management.cattle.io` with `-n fleet-default`, which does not match the Fleet workspace `Cluster` resources targeted by Fleet selectors. I changed the example to label `clusters.fleet.cattle.io` objects in `fleet-default`, which is the workspace Rancher uses for downstream clusters.
- The `ProjectRoleTemplateBinding` example was incomplete. It was missing the required `projectName` field and used an incorrect placeholder namespace. I updated it to use a project backing namespace and project ID format that matches Rancher's documented examples.
- The monitoring example filtered `BundleDeployment` objects with `--selector fleet.cattle.io/cluster-group=...`, but Fleet documents `fleet.cattle.io/cluster-group` as an annotation, not a label selector key. I replaced that command with a `clustergroup` status inspection command, which is how Fleet exposes aggregated cluster-group health and rollout state.
- The best-practices section recommended “hierarchical groups,” but Fleet cluster groups are selector-based and not a documented nesting or hierarchy feature. I changed that guidance to recommend a consistent label taxonomy instead.

## Review Notes
- The Fleet and Rancher documentation used for verification was current as of April 29, 2026.
- The `GitRepo` examples are syntactically valid for Fleet’s `fleet.cattle.io/v1alpha1` API and the targeting fields used in the post are current in the Fleet CRD reference.
- The placeholder Git URLs are plausible examples and do not affect the technical validity of the manifests.
