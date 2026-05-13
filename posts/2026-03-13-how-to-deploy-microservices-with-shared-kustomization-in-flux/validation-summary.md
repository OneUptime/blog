# Validation Summary: How to Deploy Microservices with Shared Kustomization in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- GitOps
- Flux GitRepository and Kustomization custom resources
- Flux CLI and kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux get kustomizations` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Flux Kustomization example said `targetNamespace` would create the namespace if it did not exist. Flux documentation states the target namespace must already exist or be included in the manifests. Added `apps/namespace.yaml` to the repository structure and root Kustomize resources, and changed the comment to say `targetNamespace` applies namespaced resources to that namespace.
- The Kustomize examples used `commonLabels`. Updated the examples and best practice text to use the current `labels` field with `pairs`, `includeTemplates`, and `includeSelectors` as appropriate.
- The Flux Kustomization example described `retryInterval` as exponential backoff. Flux documents it as the interval for failed reconciliation retries. Updated the comment accordingly.
- The Flux CLI examples used `flux get kustomization ...`; the documented command is `flux get kustomizations`. Updated the status and watch examples.
- The post described shared Kustomization behavior as atomic deployment and said Flux reconciles the stack on every commit. Adjusted the language to describe a single reconciliation unit and reconciliation when the source revision changes, avoiding transactional or per-commit guarantees.

## Review Notes
The snippets were reviewed against current official Flux and Kubernetes documentation. Local `flux`, `kubectl`, and `kustomize` binaries were not installed in the review environment, so CLI behavior and Kustomize syntax were verified from official documentation rather than executed locally.
