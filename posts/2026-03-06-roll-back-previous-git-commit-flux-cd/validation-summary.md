# Validation Summary: How to Roll Back to a Previous Git Commit with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller, kustomize-controller, and helm-controller
- Kubernetes Deployments, pods, ConfigMaps, Secrets, and events
- Git revert, revision ranges, checkout, branches, tags, and merge behavior
- GitHub Actions
- kubectl
- Mermaid sequence diagrams

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `reconcile source git` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI `logs` documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI `suspend` documentation: https://fluxcd.io/flux/cmd/flux_suspend/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Git `git-revert` documentation: https://git-scm.com/docs/git-revert
- Git `git-merge` documentation: https://git-scm.com/docs/git-merge
- Local Git help for `gitrevisions`, `git checkout`, `git revert`, and `git merge`

## Issues Found
- The multi-commit rollback example used `git revert --no-commit b7e9d3a..f8a2c1d` while saying it reverted `b7e9d3a` through `f8a2c1d`. Git two-dot ranges exclude the left endpoint, so this would omit `b7e9d3a`. Changed it to `b7e9d3a^..f8a2c1d`.
- The same example described the range as "oldest to newest order." Git processes that revision range as a commit set, not as the literal oldest-to-newest sequence stated in the comment. Removed the inaccurate ordering claim.
- The temporary rollback branch example created a branch at the old commit and then merged it into `main` with `--strategy-option theirs`. Because that old commit is normally already an ancestor of `main`, the merge would usually be "Already up to date" and would not restore the old tree. Replaced it with a rollback branch created from `main` that checks out the target commit's contents and commits those restored contents for review and merge.
- The Flux reconciliation wait comment said the automatic detection default was "1-10 min." Flux source and workload reconciliation timing depends on the configured intervals and notification setup, so the comment was changed to say detection happens based on configured intervals.
- The summary still referred to "branch merge" after the branch example was corrected. Updated it to "a rollback branch."

## Review Notes
- The Flux `GitRepository` `spec.ref.commit` field is current and valid in the v1 API. The documentation notes that `commit` takes precedence over other ref fields and can be combined with `branch` when the commit is within that branch.
- Flux pruning behavior and the `kustomize.toolkit.fluxcd.io/prune: disabled` annotation are accurate.
- The emergency script assumes the relevant Flux Kustomizations live in the `flux-system` namespace and are named consistently with the examples. Real installations may also need HelmReleases or Kustomizations in other namespaces suspended or reconciled.
