# Validation Summary: How to Implement Cluster Federation with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Submariner
- Kubernetes
- Grafana
- PromQL

## Sources Consulted
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Fleet GitRepo targets and `targetCustomizations`: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet custom resource reference for `GitRepo`: https://fleet.rancher.io/reference/ref-crds
- Submariner `subctl` command reference: https://submariner.io/operations/deployment/subctl/
- Submariner service discovery and `.clusterset.local` usage: https://submariner.io/operations/usage/
- Rancher project workflows: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher global resources and `RoleTemplate` reference: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Rancher cluster and project roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles

## Issues Found
- The opening description implied Rancher provides a single native cluster-federation layer. I changed it to describe the documented multi-cluster pattern more accurately: Fleet for GitOps delivery, Submariner for connectivity, and Rancher projects/RBAC features for governance consistency.
- The Fleet example placed per-cluster Helm overrides under `spec.targets` in the `GitRepo`. Current Fleet docs separate cluster selection in the `GitRepo` from per-cluster Helm overrides in `fleet.yaml` via `targetCustomizations`, so I corrected the example accordingly.
- The Submariner join examples disabled NAT traversal with `--natt=false` without any environment-specific justification. Since NAT-T is enabled by default and the official docs present it as the default behavior, I removed that flag from the generic example.
- The Rancher Projects section used `kind: ProjectTemplate` and described Rancher Projects as a cross-cluster federation mechanism. The current Rancher docs I checked document `kind: Project` on the Rancher management cluster, with `metadata.namespace` and `spec.clusterName` set to the downstream cluster ID, so I replaced the example and narrowed the claim to governance consistency rather than federation.
- The best-practices section referred to "federated RBAC" through role templates. I revised this to the documented Rancher RBAC objects, `RoleTemplates` and `ProjectRoleTemplateBindings`, to avoid implying automatic cross-cluster propagation.

## Review Notes
- The post now reads as a guide to assembling multi-cluster behavior with Rancher-integrated tools, which is a more accurate framing than suggesting Rancher has a single built-in federation subsystem.
- The Grafana/PromQL monitoring example is syntactically reasonable, but the exact metric names and labels depend on the application's telemetry model and are not Rancher-specific.
