# Validation Summary: How to Configure Cross-Namespace Ingress Routing in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Services and ExternalName Services
- ingress-nginx annotations and monitoring
- Gateway API, HTTPRoute, Gateway, and ReferenceGrant
- Istio Gateway and VirtualService
- Kubernetes RBAC, NetworkPolicy, and admission webhooks
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Ingress concepts: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx command-line arguments documentation: https://kubernetes.github.io/ingress-nginx/user-guide/cli-arguments/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- Gateway API installation guide: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/
- Gateway API cross-namespace routing guide: https://gateway-api.sigs.k8s.io/guides/user-guides/multiple-ns/
- Gateway API ReferenceGrant documentation: https://gateway-api.sigs.k8s.io/api-types/referencegrant/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/

## Issues Found
- The post implied ExternalName backends work with most ingress controllers. Changed the wording to say this depends on ingress controller support.
- The ingress-nginx annotation section implied annotations allow direct cross-namespace Service references. Updated it to clarify that Ingress still needs a same-namespace Service, commonly an ExternalName Service.
- The ExternalName proxy Service in the ingress-nginx section did not define the port referenced by the Ingress. Added port 8080.
- The configuration-snippet example used `proxy_pass`, which is unsafe and not a valid replacement for the generated Ingress backend path. Reworked it to use the same ExternalName backend Service and clarified that snippets are disabled by default and should be limited to trusted authors.
- The Gateway API install command used the old v1.0.0 bundle. Updated it to the current v1.5.0 standard install command with server-side apply.
- The ReferenceGrant explanation was incorrect for the shown HTTPRoute examples. Updated it to state that ReferenceGrant is required for cross-namespace backend references, that the grant belongs in the referenced Service namespace, and that the current v1.5.0 bundle supports the stable `gateway.networking.k8s.io/v1` ReferenceGrant API.
- Istio examples used `networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API.
- The NetworkPolicy namespace selector used a non-standard `name` label. Updated it to the built-in `kubernetes.io/metadata.name` namespace label.
- The ValidatingWebhookConfiguration example omitted required `admissionReviewVersions` and `sideEffects` fields for `admissionregistration.k8s.io/v1`. Added both fields.
- The ingress-nginx monitoring command referenced `/nginx_status` on port 10254. Updated it to query `/metrics`, which matches ingress-nginx's documented Prometheus endpoint.

## Review Notes
The post is now technically valid as a guide, but some examples remain illustrative and depend on controller-specific behavior. ExternalName backend handling, snippet annotations, and GatewayClass names vary by ingress or Gateway implementation and should still be validated in a staging cluster.
