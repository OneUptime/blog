# Validation Summary: How to Configure Fleet Depends-On for Deployment Ordering - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- Helm
- `kubectl`

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Git repository contents and bundle naming: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet source for `BundleRef` and bundle status fields: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundle_types.go

## Issues Found
- The post described `dependsOn` as always waiting for a dependency to be fully ready. I corrected this to Fleet's current accepted-state model and noted that the default accepted state is `Ready`.
- The bundle-name examples implied that simple names such as `infra-cert-manager` are the default. I clarified that these are example explicit names set with `name:`, and that auto-generated names are computed from the `GitRepo` name and bundle path.
- The monitoring command used non-existent Bundle status fields (`.status.ready` and `.status.waitingOnConditions`). I replaced it with valid Bundle status fields: `status.display.readyClusters` plus the `Ready` condition status and message.

## Review Notes
- Fleet also supports `dependsOn.selector` and custom `acceptedStates`, but the post's simpler name-based examples are valid for a practical guide.
- Auto-generated bundle names can be truncated and hashed when they exceed Fleet's name-length limit, so explicitly setting `name:` is useful when you want stable dependency references.
