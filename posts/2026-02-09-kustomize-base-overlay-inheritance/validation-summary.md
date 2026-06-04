# Validation Summary: How to implement Kustomize base and overlay inheritance patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Kustomize
- YAML kustomization files
- JSON Patch
- Bash
- yq

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes kubectl reference: kubectl kustomize - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes SIGs Kustomize repository README - https://github.com/kubernetes-sigs/kustomize
- Kustomize API type reference for kustomization fields - https://pkg.go.dev/sigs.k8s.io/kustomize/api/types

## Issues Found
- The post used the deprecated `bases` field in multiple `kustomization.yaml` examples. Current Kustomize marks `bases` as deprecated and directs users to use `resources` for files and other kustomization directories. I changed those examples to use `resources`.
- The post used the deprecated `commonLabels` field in several examples. Current Kustomize marks `commonLabels` as deprecated in favor of `labels`. I changed those examples to use `labels` with `includeSelectors: true` so the examples preserve the old behavior of applying labels to resources and selectors.
- One application-family example needed consolidation after the `bases` replacement because it would otherwise have had two `resources` keys. I merged the app base path and application-specific resource into one `resources` list.

## Review Notes
The local environment did not have `kustomize`, `kubectl`, Go, or Ruby installed, so I could not execute `kustomize build` or parse snippets with local tooling. Static checks and official documentation review were completed, and `git diff --check` passed.
