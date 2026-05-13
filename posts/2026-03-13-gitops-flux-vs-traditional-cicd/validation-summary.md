# Validation Summary: GitOps with Flux CD vs Traditional CI/CD: When to Choose What

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- GitOps
- Kubernetes
- kubectl
- Jenkins Pipeline
- GitHub Actions
- CI/CD
- Helm
- Kustomize

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux `bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Jenkins Kubernetes CLI plugin documentation: https://plugins.jenkins.io/kubernetes-cli
- OpenGitOps principles: https://opengitops.dev/

## Issues Found
- The post claimed disaster recovery could restore the "entire cluster" from Git and that every cluster change is a Git commit. Flux reconciles the declared state it manages from a configured source, but unmanaged resources or out-of-band cluster changes are not necessarily represented in Git. Updated the wording to refer to desired-state changes managed through GitOps and Flux-managed cluster state.

## Review Notes
- The Flux `Kustomization` example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `interval`, `prune`, `path`, and `sourceRef` fields.
- The `flux bootstrap github` command uses current flags, including `--owner`, `--repository`, `--branch`, `--path`, and `--personal`.
- The `kubectl set image` and `kubectl rollout status` commands are valid for updating and monitoring a Kubernetes Deployment.
- The comparison table is intentionally high-level; in future revisions, it could mention that Flux can also be triggered by webhooks/receivers in addition to interval-based reconciliation.
