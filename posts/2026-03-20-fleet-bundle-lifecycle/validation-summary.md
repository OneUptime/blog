# Validation Summary: How to Manage Fleet Bundle Lifecycle

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- `kubectl`

## Sources Consulted
- Fleet Git Repository Contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet GitRepo Resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Bundle Resource reference: https://fleet.rancher.io/reference/ref-bundle
- Fleet Status Fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Configuration reference: https://fleet.rancher.io/reference/ref-configuration
- Fleet Create a GitRepo Resource guide: https://fleet.rancher.io/how-tos-for-users/gitrepo-add
- Rancher Fleet source for `GitRepoSpec`: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Rancher Fleet source for `BundleDeploymentSpec`: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go
- Kubernetes field selectors reference: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl annotate` / command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The introduction stated that every directory containing manifests or `fleet.yaml` becomes a Bundle. I changed this to match Fleet’s documented scanning behavior: bundles are created from scanned GitRepo paths, and subdirectories with their own `fleet.yaml` define separate bundles.
- The bundle status field explanations overstated or misdescribed several counters. I corrected `ready`, `desiredReady`, `notReady`, `modified`, and `waitApplied` so they match Fleet’s status model for BundleDeployments.
- The `BundleDeployment` filter used `spec.bundleID`, which is not a field on `BundleDeploymentSpec`. I replaced it with the documented/implemented label-based lookup using `fleet.cattle.io/bundle-name` and `fleet.cattle.io/bundle-namespace`, and changed the `describe` example to use a real deployment name from the list output.
- The pause/resume workflow used Git revision pinning as the primary pause mechanism. I replaced it with `spec.paused` on the `GitRepo`, which is the explicit Fleet-supported pause control for bundles and bundle deployments created from that repo.
- The forced redeploy example cleared the `fleet.cattle.io/commit` annotation. I replaced it with incrementing `spec.forceSyncGeneration`, which Fleet documents and implements as the supported way to request a redeployment without changing Git content.
- The production health query used a field selector on `status.summary.*`, which is not supported for Fleet CRDs unless selectable fields are declared. I replaced it with a `custom-columns` plus `awk` comparison.
- The event query filtered for `reason=FailedSync`, which is not a stable Fleet error reason to rely on here. I replaced it with a supported `type=Warning` field selector to surface recent warning events that may explain failures.
- The deletion explanation implied resources are always cleaned up. I clarified that deployed resources are removed unless `keepResources` is set.

## Review Notes
- The rollback example that pins `spec.revision` to a specific commit is valid for moving to an earlier commit, but operators must clear `spec.revision` later if they want to return to normal branch tracking.
- Fleet documentation and source both use `GitRepo` as the main user-facing control point for pausing and forced redeploys; some lower-level bundle details are clearer in source than in the rendered docs.
