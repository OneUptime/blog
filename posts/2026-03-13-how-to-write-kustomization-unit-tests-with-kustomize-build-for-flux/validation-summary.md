# Validation Summary: How to Write Kustomization Unit Tests with kustomize build for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Kustomize
- kubectl
- yq
- GitHub Actions
- Bash

## Sources Consulted
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Flux Kustomization post-build substitution documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- Kustomize project repository and installation script location: https://github.com/kubernetes-sigs/kustomize

## Issues Found
- The prerequisites omitted tools used by the examples. Added Flux CLI and yq to the prerequisites because the scripts use `flux envsubst` and `yq eval`.
- The expected-resource test used separate `grep` checks for kind and name, which could pass when the kind and name appear on different resources. Changed it to a structured `yq` query that checks both fields on the same YAML document.
- The Flux variable substitution section said to test substitutions locally but only detected unresolved placeholders. Clarified that Flux substitution happens after `kustomize build` when postBuild substitution is configured, replaced non-portable `grep -P` with `grep -E`, and added a `flux envsubst --strict` local substitution check.
- The namespace test defaulted missing namespaces to `default` and checked for `null`, which could warn on cluster-scoped resources and would not emit `null` with the expression used. Changed it to inspect declared namespaces only.
- The CI workflow included `mikefarah/yq@master` as an "Install yq" step, but that action runs yq commands and does not install yq for later shell steps. Removed the unused step.
- The best-practices section described `kubectl apply --dry-run=client` as Kubernetes API schema validation. Updated the wording to distinguish client-side validation from `--dry-run=server`, which uses API server validation.
- The conclusion overstated that these checks guarantee Flux reconciliation success. Changed the wording to say they increase confidence.

## Review Notes
The remaining examples are illustrative and assume a repository layout with `overlays/*/` directories and resource names matching the sample assertions. `kubectl apply --dry-run=client` is useful in CI without cluster access, but server-side dry-run provides stronger validation when a Kubernetes API server and the relevant CRDs are available.
