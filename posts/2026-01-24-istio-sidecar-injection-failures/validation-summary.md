# Validation Summary: How to Fix 'Sidecar Injection' Failures in Istio

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Mutating admission webhooks
- Istio CNI
- Pod Security Admission
- OPA Gatekeeper
- istioctl
- kubectl

## Sources Consulted
- Istio: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio: Install the Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes: Pod Security Policies - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The post described `sidecar.istio.io/inject` as a pod annotation. Current Istio documentation treats the pod-level injection override as a label, while the annotation form is deprecated. Updated the section title, prose, examples, and checklist to use labels.
- The Deployment YAML examples omitted the required `spec.selector` field for `apps/v1` Deployments and did not include matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` to each Deployment example.
- The namespace-label explanation only mentioned `istio-injection=enabled`. Updated it to also mention the supported `istio.io/rev` revision label.
- The webhook failure description said failures happen silently and pods are created without sidecars. Istio documentation shows webhook invocation failures can prevent pod creation, depending on webhook behavior. Updated the claim to reflect both possible outcomes.
- The init-container section implied `istio-init` is always used. Istio CNI replaces the per-pod privileged init-container model. Updated the text to say `istio-init` is used when the Istio CNI node agent is not installed.
- The init-container capability requirement listed only `NET_ADMIN`. Istio documentation lists both `NET_ADMIN` and `NET_RAW`. Updated the requirement.
- The PodSecurityPolicy example used `policy/v1beta1`, which Kubernetes removed in v1.25. Replaced it with the current Istio CNI installation approach documented by Istio.
- The prevention checklist referenced `istioctl verify-install`, which is not present in the current Istio command reference. Replaced it with current control-plane health checks using `kubectl get pods -n istio-system -l app=istiod` and `istioctl analyze`.

## Review Notes
The remaining commands and Istio annotations checked are current and plausible. Some examples, such as `istioctl kube-inject`, are useful for previewing/manual injection but do not fully replace live-cluster injection diagnostics like `istioctl experimental check-inject`.
