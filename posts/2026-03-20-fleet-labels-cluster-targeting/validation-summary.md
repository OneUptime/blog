# Validation Summary: How to Use Fleet Labels for Cluster Targeting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- `kubectl`
- GitOps
- Kubernetes label selectors

## Sources Consulted
- Fleet docs: Mapping to Downstream Clusters - https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet docs: `fleet.yaml` reference - https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet docs: Custom Resources Spec - https://fleet.rancher.io/reference/ref-crds
- Fleet docs: Register Downstream Clusters - https://fleet.rancher.io/how-tos-for-operators/cluster-registration
- Fleet docs: Bundle Resource - https://fleet.rancher.io/reference/ref-bundle
- Kubernetes docs: `kubectl label` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Rancher docs: Fleet overview in Rancher UI - https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview

## Issues Found
- The original `fleet.yaml` targeting examples used `targets:`. For GitRepo-managed bundles, Fleet documents `overrideTargets:` in `fleet.yaml` as the mechanism that replaces GitRepo-defined targets, so the examples were updated to use `overrideTargets:` to match the documented workflow.
- The "Environment-Progressive Deployment" section implied that target order controls deployment rollout order. In Fleet, target order controls first-match selection, not progressive rollout sequencing. The section was renamed to "Environment-Based Targeting" and the comments were updated accordingly.
- The "Catch-all for unlabeled clusters" comment was inaccurate because `clusterSelector: {}` matches all remaining clusters, not only unlabeled ones. The comment was corrected.
- The "Via Cluster Registration YAML" example showed a `Cluster` resource without the fields needed for a valid manager-initiated registration example. It was corrected to a valid declarative `Cluster` resource example using `spec.kubeConfigSecret`.
- The bulk-labeling example comment claimed the loop matched a condition, but the command iterated over every cluster in the namespace. The comment was corrected.
- The `BundleDeployment` verification command filtered on `fleet.cattle.io/cluster-namespace` as a label across all namespaces, which does not reflect how Fleet exposes cluster-specific `BundleDeployment` resources. It was replaced with a documented lookup via `Cluster.status.namespace`, followed by listing `bundledeployments` in that cluster namespace.

## Review Notes
- The `overrideTargets` examples assume the post is describing `fleet.yaml` used with `GitRepo`-generated bundles. Direct `Bundle` resources can also define `spec.targets`, but Fleet documents `overrideTargets` as the bundle-level targeting override for GitRepo workflows.
- Progressive rollout across environments is a separate concern from target matching and is handled via Fleet rollout strategy features rather than ordered target lists.
