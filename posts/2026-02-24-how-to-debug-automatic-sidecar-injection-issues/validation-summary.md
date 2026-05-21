# Validation Summary: How to Debug Automatic Sidecar Injection Issues

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Istio sidecar injection
- Kubernetes mutating admission webhooks
- Kubernetes namespaces, labels, pods, deployments, events, and resource quotas
- Istio CNI
- Kubernetes Pod Security Standards and PodSecurityPolicies

## Sources Consulted
- Istio: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio: Install the Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio: Application Requirements - https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes: Admission Webhook Good Practices - https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes API Reference: MutatingWebhookConfiguration failurePolicy - https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/

## Issues Found
- The post described `sidecar.istio.io/inject` as an annotation. Current Istio documentation identifies it as a pod label and notes the annotation form is deprecated, so the wording was changed to "labels" and clarified that the relevant setting is in the pod template labels.
- The webhook CA bundle note said an expired CA bundle causes silent failure and that restarting istiod regenerates certificates. Istio troubleshooting guidance focuses on invalid or mismatched CA bundles and recommends restarting istiod when the webhook CA bundle does not match the root certificate, so the wording was adjusted accordingly.
- The Pod Security Standards section said sidecar injection will fail under `restricted` or `baseline`. The more precise behavior is that pod creation can fail after injection because the injected init container requires `NET_ADMIN` and `NET_RAW` unless Istio CNI is used, so the text was updated.

## Review Notes
The remaining commands and examples align with current Istio and Kubernetes documentation. The `istio-sidecar-injector` webhook/configmap names are accurate for default non-revisioned installs; revisioned installs may use revision-specific webhook names.
