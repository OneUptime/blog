# Validation Summary: How to implement ArgoCD with Jsonnet for programmatic application definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet resources
- Jsonnet
- Kubernetes manifests
- k8s-libsonnet-style Kubernetes Jsonnet libraries
- GitOps configuration management

## Sources Consulted
- Argo CD Jsonnet user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_get/
- Jsonnet language reference: https://jsonnet.org/ref/language.html
- Jsonnet specification: https://jsonnet.org/ref/spec.html
- k8s-libsonnet documentation: https://jsonnet-libs.github.io/k8s-libsonnet/
- k8s-libsonnet Deployment API documentation: https://jsonnet-libs.github.io/k8s-libsonnet/1.30/apps/v1/deployment/
- k8s-libsonnet Service and ServicePort API documentation: https://jsonnet-libs.github.io/k8s-libsonnet/1.28/core/v1/service/ and https://jsonnet-libs.github.io/k8s-libsonnet/1.34/core/v1/servicePort/
- k8s-libsonnet Container API documentation: https://jsonnet-libs.github.io/k8s-libsonnet/1.30/core/v1/container/
- Kubernetes Ingress v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/

## Issues Found
- The post described Jsonnet as having "Strong typing and validation." Jsonnet is dynamically typed and the official specification notes it has no static types. Changed this to "Runtime type checks with `std.type` and validation through assertions."
- Two Argo CD Application examples omitted `spec.project`. Argo CD can default applications to the default project when unspecified, but the official Application examples include `project: default`; added it for clearer, complete declarative examples.
- The reusable library's Ingress example created a `networking.k8s.io/v1` `HTTPIngressPath` without `pathType`, which is required by the Kubernetes v1 Ingress API. Added `k.networking.v1.httpIngressPath.withPathType('Prefix')`.
- The Argo CD TLA example used `code:` as a string field containing Jsonnet source. In Argo CD, `code` is a boolean that controls whether `value` is interpreted as Jsonnet code. Changed the example to `code: true` with the Jsonnet object under `value`.
- The TLA Deployment example omitted required Deployment selector/template labels and did not include a container image. Added matching `spec.selector.matchLabels`, `spec.template.metadata.labels`, and an example image so the manifest is structurally valid.

## Review Notes
The Jsonnet snippets that import `kubernetes.libsonnet` assume a vendored or local Kubernetes Jsonnet library with k8s-libsonnet-compatible APIs. That is reasonable for the article's repository structure, but a future improvement could mention the exact library/version and `libs` path configuration explicitly.
