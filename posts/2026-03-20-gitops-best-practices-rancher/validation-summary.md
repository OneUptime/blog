# Validation Summary: GitOps Best Practices for Rancher Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Fleet
- Rancher
- Kubernetes
- GitOps
- Kustomize
- GitHub CLI
- External Secrets Operator
- Kubernetes RBAC
- Sealed Secrets

## Sources Consulted
- Fleet GitRepo Resource: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet Status Fields: https://fleet.rancher.io/reference/ref-status-fields
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Kustomize docs: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes RBAC docs: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- External Secrets Operator API spec: https://external-secrets.io/latest/api/spec/
- GitHub CLI `gh pr create`: https://cli.github.com/manual/gh_pr_create
- Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The `apps/v1` Deployment example was invalid because it omitted `.spec.selector` and matching pod template labels. I added `selector.matchLabels` and `template.metadata.labels` so the manifest matches current Kubernetes requirements.
- The Kustomize overlay pointed at `../../base` as a base even though the post did not include a `base/kustomization.yaml`. I changed the overlay to reference `../../base/deployment.yaml` via `resources`, which makes the example self-consistent as written.
- The PR automation example was incomplete for non-interactive use. I added branch creation, `git add`, `git push`, and a PR body so the workflow can actually create a pull request with `gh pr create`.
- The secret-handling guidance said to never store secrets in Git while later recommending Sealed Secrets. I corrected this to “Never store plaintext secrets in Git,” which matches how Sealed Secrets are intended to be used.
- The RBAC `RoleBinding` example omitted required RBAC fields. I added `metadata.namespace`, `subjects[].apiGroup`, and `roleRef.apiGroup` so the manifest matches the Kubernetes RBAC API.
- The drift remediation section used the wrong Fleet fields. `forceSyncGeneration` forces a redeployment, while drift correction is configured through `correctDrift`; `prune` is not a Fleet GitRepo field. I replaced the snippet with a valid `correctDrift` example and clarified the surrounding text.
- The monitoring example used less precise resource names and a weak drift check. I changed it to `kubectl get gitrepos -A` and a `custom-columns` command that surfaces Fleet `status.display.state` and `status.display.message`, which are documented Fleet status fields.

## Review Notes
- Fleet’s GitRepo API is still documented as `fleet.cattle.io/v1alpha1` as of April 30, 2026, so the post’s API version remains current.
- Fleet also has a built-in image scan and Git write-back capability, but the official docs mark it as experimental and disabled by default; the post’s PR-based recommendation remains a valid conservative approach.
