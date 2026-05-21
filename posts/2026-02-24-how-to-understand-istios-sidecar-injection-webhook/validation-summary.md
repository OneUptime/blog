# Validation Summary: How to Understand Istio's Sidecar Injection Webhook

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Envoy sidecar proxy
- Kubernetes mutating admission webhooks
- Kubernetes pod labels and annotations
- istioctl
- kubectl

## Sources Consulted
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: Dynamic Admission Webhooks Overview - https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio documentation: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio documentation: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes documentation: Dynamic Admission Control - https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- The post described pod-level injection control as an annotation. Current Istio documentation says injection policy should be controlled with the `sidecar.istio.io/inject` pod label; the annotation form is deprecated. I changed the section title and YAML examples to use `metadata.labels`.
- The troubleshooting section only checked pod annotations and mentioned a service account skip-injection annotation. Istio's documented injection policy is based on namespace and pod labels, with deprecated pod annotation support. I changed the command text to check pod labels as well as deprecated annotations and removed the unsupported service account annotation note.
- The introduction implied sidecar injection is required for all Istio mesh participation. Current Istio supports sidecar and ambient data plane modes, so I narrowed the wording to Istio sidecar mode.

## Review Notes
- The example injected pod spec is version-specific and representative. Actual injected containers and volumes vary by Istio version, mesh configuration, CNI usage, and native sidecar settings.
- `sidecar.istio.io/proxyCPU`, `sidecar.istio.io/proxyMemory`, `sidecar.istio.io/proxyCPULimit`, and `sidecar.istio.io/proxyMemoryLimit` are valid Istio pod annotations, but they are listed as Alpha in the current Istio annotation reference.
