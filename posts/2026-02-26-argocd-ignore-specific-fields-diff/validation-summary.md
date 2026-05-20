# Validation Summary: How to Ignore Specific Fields in ArgoCD Diff

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- JSON Pointer
- jq path expressions
- Istio sidecar injection
- HashiCorp Vault Agent Injector
- Linkerd proxy injection
- cert-manager CA injection
- KEDA and HPA scaling

## Sources Consulted
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD source for `argocd app diff` output ordering and ignore normalizer behavior: https://github.com/argoproj/argo-cd
- Kubernetes well-known labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- cert-manager CA injector documentation: https://cert-manager.io/docs/concepts/ca-injector/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- Linkerd proxy injection documentation: https://linkerd.io/2/features/proxy-injection/

## Issues Found
- The post described `argocd app diff` signs backwards for the default CLI diff. Argo CD passes live state as the old file and target state as the new file, so `-` lines are live-only and `+` lines are target/Git-only. Updated the explanation and the sample diff signs.
- Several `jqPathExpressions` attempted to ignore annotation prefixes with `to_entries[] | select(...)`. Argo CD wraps jq path expressions in `del(...)`, and that form is not a valid path expression for deleting map entries. Replaced those examples with map-key path expressions that delete matching annotation keys.
- The system-level managed fields example used `managedFields` with nested `manager` values. Argo CD's documented key is `managedFieldsManagers`. Updated the snippet accordingly.

## Review Notes
The Argo CD CLI was not installed locally, so CLI flags were checked against the official command reference and Argo CD source. The corrected jq expressions were also validated locally with `jq`.
