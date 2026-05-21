# Validation Summary: How to Debug Sidecar Injection Webhook Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio sidecar injection
- Kubernetes mutating admission webhooks
- Kubernetes Services and EndpointSlices
- istiod
- istioctl
- kubectl
- TLS certificates for admission webhooks

## Sources Consulted
- Istio: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes: Dynamic Admission Control - https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes: kubectl describe reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes: Endpoints to EndpointSlices deprecation notice - https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The admission webhook overview said Kubernetes sends pods to all configured mutating webhooks. Updated this to "matching mutating admission webhooks" to reflect webhook selectors and matching rules.
- The injection patch description always mentioned an init container. Updated this to "any required init container" because Istio deployments using CNI or other modes may not inject `istio-init`.
- The pod-level override section used `sidecar.istio.io/inject` as an annotation. Updated the section to use pod labels, and noted that the annotation form is deprecated in favor of the label.
- The service backend check used the deprecated Endpoints API. Updated the command to use EndpointSlices with `kubectl get endpointslice -l kubernetes.io/service-name=istiod`.
- The TLS section described the webhook as using TLS to communicate with the API server. Corrected the direction: the API server calls the webhook service over TLS.
- The certificate checklist implied the decoded `caBundle` should contain the service DNS SAN. Clarified that the CA bundle should match istiod's root certificate, while the istiod serving certificate should contain the service DNS name in its SAN.
- The manual testing section described `istioctl analyze` as comparing what the webhook would produce. Replaced that with `istioctl experimental check-inject`, which is the Istio diagnostic command for checking whether live webhook configuration would inject a workload, and kept `istioctl analyze` as a broader configuration check.
- Updated the common scenarios section to refer to pod override labels and pod template metadata accurately.

## Review Notes
The post is now technically accurate for current Istio and Kubernetes behavior. The `istioctl experimental check-inject` command is documented by Istio but remains under the `experimental` command group, so future Istio releases may rename or promote it.
