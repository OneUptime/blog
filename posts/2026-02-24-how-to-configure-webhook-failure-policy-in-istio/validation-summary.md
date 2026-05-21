# Validation Summary: How to Configure Webhook Failure Policy in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes admission webhooks
- MutatingWebhookConfiguration
- IstioOperator
- Helm
- kubectl
- Prometheus monitoring concepts

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio dynamic admission webhook overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio istiod Helm chart values and mutating webhook template: https://github.com/istio/istio/tree/master/manifests/charts/istio-control/istio-discovery
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/#mutatingwebhookconfiguration-v1-admissionregistration-k8s-io

## Issues Found
- The post showed `values.sidecarInjectorWebhook.failurePolicy` for IstioOperator and `--set sidecarInjectorWebhook.failurePolicy=Ignore` for Helm. Current Istio istiod chart values do not expose that setting, and the mutating webhook template hardcodes `failurePolicy: Fail`. Updated the IstioOperator example to use a Kubernetes object overlay and changed the Helm section to explain that Helm needs post-processing or a post-install patch.
- The direct `kubectl patch` examples only updated `/webhooks/0`, but current Istio renders multiple sidecar injector webhook entries, including namespace, object, and revision-specific entries. Replaced those examples with structured `jq` updates that apply the change to every webhook entry.
- The STRICT mTLS guidance stated that unsidecared pods would lose connectivity anyway. This is too broad because impact depends on which side enforces STRICT mTLS and whether the workload is actually in the mesh path. Softened the wording to say unsidecared pods may lose connectivity to workloads enforcing STRICT mTLS.
- The monitoring note recommended alerting on `istio_build` as if it were the right signal for sidecar presence. Replaced it with pod metadata signals, specifically the `istio-proxy` container and `sidecar.istio.io/status` annotation.
- The namespace selector explanation implied that only `istio-injection=enabled` namespaces can be affected. Current Istio also supports revision labels and pod-level injection labels through additional webhook entries, so the wording now tells readers to inspect the full selector set.

## Review Notes
The post is now technically accurate for current Istio behavior. The examples assume the default `istio-sidecar-injector` webhook name; revisioned or non-`istio-system` installs can include a revision or namespace suffix in the MutatingWebhookConfiguration name.
