# Validation Summary: How to Ignore MutatingWebhook-Injected Fields in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes admission webhooks
- Kubernetes MutatingWebhookConfiguration
- Argo CD diff customization
- JSON Pointer
- JQ path expressions
- Istio sidecar injection
- HashiCorp Vault Agent Injector
- Linkerd proxy injection

## Sources Consulted
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Diff Strategies documentation for release 2.10: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/diff-strategies/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/release-1.8/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/platform/k8s/injector
- Linkerd Automatic Proxy Injection documentation: https://linkerd.io/2/features/proxy-injection/

## Issues Found
- The server-side diff section stated that mutating webhook modifications are included automatically. Argo CD 2.10 documents that server-side diff does not include mutation webhooks by default, and requires `IncludeMutationWebhook=true`. Updated the explanation and annotation example to use `ServerSideDiff=true,IncludeMutationWebhook=true`.
- The Istio section implied the sidecar injector mutates Deployment objects directly. Istio, Vault Agent Injector, and Linkerd commonly mutate Pods at admission time. Added a clarification that Deployment-level ignore rules should only be added after confirming that the Deployment or workload template is the resource actually showing OutOfSync.
- The best-practice note said server-side diff handles most webhook scenarios automatically. Updated it to state that `IncludeMutationWebhook=true` is needed when mutating webhook changes should be included in comparison.

## Review Notes
The Argo CD `ignoreDifferences`, `jsonPointers`, `jqPathExpressions`, system-level `resource.customizations.ignoreDifferences`, `RespectIgnoreDifferences=true`, JSON Pointer escaping, `argocd app diff --local`, and `argocd app get --hard-refresh` examples are consistent with the official documentation consulted. `RespectIgnoreDifferences=true` only affects resources that already exist in the cluster; initial creation still applies desired state as-is.
