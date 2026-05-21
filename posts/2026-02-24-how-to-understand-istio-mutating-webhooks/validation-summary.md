# Validation Summary: How to Understand Istio Mutating Webhooks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes admission webhooks
- Kubernetes MutatingWebhookConfiguration
- Istio sidecar injection
- istioctl
- kubectl

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Istio Installing the Sidecar documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio check-inject diagnostic tool documentation: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/

## Issues Found
- The post described `sidecar.istio.io/inject` as a per-pod annotation. Current Istio documentation uses the pod label for injection policy, while the annotation form is deprecated. Changed the heading and YAML examples to use `metadata.labels`.
- The post implied the injected `istio-init` container is always added. Istio CNI replaces the per-pod `istio-init` traffic-redirection model, so I added a CNI caveat and updated the summary.
- The `istioctl kube-inject` example used `--meshConfigFile /dev/null`, which does not represent the webhook configuration. Changed it to use the default cluster-backed `istioctl kube-inject -f my-deployment.yaml` flow and noted that exact reproduction requires the webhook's injection template, mesh config, and values.
- The direct `curl` example against `/inject` could be mistaken for a functional webhook request. Added a note that `/inject` expects an AdmissionReview POST and that the direct curl command is only a connectivity check.

## Review Notes
The example sidecar image uses Istio `1.22.0`, which is version-specific and older than current Istio releases, but it is presented as an example snippet rather than an installation recommendation.
