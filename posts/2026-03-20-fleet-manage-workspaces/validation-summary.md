# Validation Summary: How to Manage Fleet Workspaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- `kubectl`
- Kubernetes RBAC

## Sources Consulted
- Fleet Namespaces: https://fleet.rancher.io/0.14/explanations/namespaces
- Fleet Setup Multi User: https://fleet.rancher.io/0.11/how-tos-for-operators/multi-user
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Rancher Continuous Delivery with Fleet Overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/fleet/overview
- Rancher API Reference (`GlobalRoleBinding` schema): https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Official Fleet examples repository: https://github.com/rancher/fleet-examples

## Issues Found
- Workspace creation was described as creating a plain Kubernetes `Namespace` with a `fleet.cattle.io/workspace=true` label. In Rancher, workspaces are created as `management.cattle.io/v3` `FleetWorkspace` resources, which then create backing namespaces automatically. I replaced the namespace example with a `FleetWorkspace` manifest.
- The post implied clusters could be moved between workspaces by updating a cluster's namespace reference. That is incorrect because Kubernetes namespaces are immutable on namespaced resources. I changed the guidance to use Rancher's Continuous Delivery UI for assigning or moving clusters and kept the CLI example to inspection only.
- The workspace-listing commands treated any namespace containing `fleet` as a workspace and relied on a custom workspace label. That can include non-workspace system namespaces and the label is not the documented Rancher mechanism. I changed the commands to list `fleetworkspaces.management.cattle.io` and, separately, inspect backing namespaces matching `^fleet-`.
- The RBAC examples granted access to `bundledeployments` in the workspace namespace. Fleet stores `BundleDeployment` objects in per-cluster namespaces, not in the workspace namespace, so that permission was misleading. I removed `bundledeployments` from the workspace-scoped `Role` examples and added a note explaining the namespace behavior.
- The Rancher UI instructions used an unsupported navigation path for workspace creation. I updated the steps to match the current Rancher docs: use **Continuous Delivery**, the workspace selector, and the **Clusters** page.
- The sample `GitRepo` pointed to `https://github.com/team-alpha/k8s-configs`, which was not publicly resolvable during review. I replaced it with the official `rancher/fleet-examples` repository and the documented `simple` path from Fleet's targeting guide.

## Review Notes
- The post is now technically consistent with Rancher-managed Fleet workspaces, which differ slightly from standalone Fleet namespace usage.
- Rancher UI access for a workspace requires more than plain Kubernetes namespace RBAC; users also need Rancher permissions on the `FleetWorkspace` resource, typically through a `GlobalRole`.
