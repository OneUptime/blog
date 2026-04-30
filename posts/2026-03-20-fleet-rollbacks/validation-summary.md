# Validation Summary: How to Perform Fleet Rollbacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- GitOps
- Rancher
- Kubernetes
- Git
- Helm
- Bash

## Sources Consulted
- Fleet GitRepo Resource: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet Status Fields: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Creating a Deployment: https://fleet.rancher.io/tutorials/tut-deployment
- Fleet Git Repository Contents: https://fleet.rancher.io/0.13/explanations/gitrepo-content
- Fleet source for GitRepo spec/status: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source for branch vs. revision resolution: https://github.com/rancher/fleet/blob/main/pkg/git/fetch.go
- Fleet source for Helm release naming behavior: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Git revert documentation: https://git-scm.com/docs/git-revert
- Git checkout documentation: https://git-scm.com/docs/git-checkout
- Git tag documentation: https://git-scm.com/docs/git-tag
- Helm list documentation: https://helm.sh/docs/helm/helm_list/
- Helm history documentation: https://helm.sh/docs/helm/helm_history/
- Helm get values documentation: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The introduction and rollback principles said rollback is always a Git operation and requires no direct cluster access. That was too absolute because the post also uses supported `kubectl patch` workflows that change the `GitRepo` resource's tracked `branch` or `revision`. I corrected the wording to distinguish Git history changes from GitRepo reference changes.
- Several sample commit IDs contained non-hex characters, which are not valid Git SHAs, and the revert example reused an earlier commit ID for the new revert commit. I replaced them with plausible hexadecimal short SHAs and a distinct revert commit example.
- The verification step described `.status.commit` as showing that a commit "is being applied." In Fleet, that field is the GitRepo's last observed Git commit, not a full downstream readiness signal. I corrected the wording to match what the field actually represents.
- The commit-pinning section said Fleet would "revert" clusters to the pinned commit. I changed that wording to "reconcile" so it matches Fleet's actual reconciliation behavior.
- The Helm section implied Fleet performs a literal Helm rollback and assumed the release name is always `my-app`. Fleet deploys bundles as Helm releases, and the release name is generated unless `helm.releaseName` is set. I corrected the wording so the example is explicitly conditional on `helm.releaseName: my-app` and describes verifying the resulting release state.
- The emergency rollback script documented an optional namespace, but its argument parsing required the namespace to be the second positional argument. I fixed the script to accept `<gitrepo-name> <good-commit> [namespace]` and updated the usage text accordingly.

## Review Notes
- Fleet resolves `spec.revision` before `spec.branch`. That makes the commit-pinning and tag-based examples technically valid, and clearing `revision` is the right way to resume branch tracking.
- Fleet's source still defaults an unspecified branch to `master`. The post explicitly uses `main`, which is fine as long as the tracked repository actually uses `main`.
- `status.commit` confirms which Git revision Fleet most recently fetched. Bundle and BundleDeployment readiness checks are still the stronger signal for confirming rollback convergence across target clusters.
