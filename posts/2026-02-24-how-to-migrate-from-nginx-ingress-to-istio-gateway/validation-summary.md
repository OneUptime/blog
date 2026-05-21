# Validation Summary: How to Migrate from NGINX Ingress to Istio Gateway

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx
- Istio Gateway
- Istio VirtualService
- Istio EnvoyFilter
- Kubernetes Services
- TLS secrets
- DNS traffic shifting
- Helm
- kubectl
- jq

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio ingress gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio secure gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Envoy rate limiting documentation: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Helm uninstall command reference: https://helm.sh/docs/helm/helm_uninstall/

## Issues Found
- The NGINX Ingress examples used the deprecated `kubernetes.io/ingress.class` annotation. Changed them to `spec.ingressClassName: nginx`, which is the current Kubernetes field.
- The Istio Gateway and VirtualService examples used `networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, which is the current Istio API version shown in the official docs.
- The TLS secret copy command only changed the namespace with `sed`, which can carry Kubernetes-managed metadata such as `uid` and `resourceVersion`. Replaced it with a JSON pipeline that removes managed metadata before applying the secret in `istio-system`.
- The NGINX regex rewrite example omitted `nginx.ingress.kubernetes.io/use-regex: "true"` and used `pathType: Prefix` for a regex path. Added `use-regex` and changed the path type to `ImplementationSpecific`.
- The Istio URL rewrite example used a simple prefix rewrite that did not preserve the NGINX capture-group behavior. Replaced it with `uriRegexRewrite` using capture groups.
- The post described backend protocol detection only as Service port naming. Updated it to include `appProtocol`, which Istio supports and gives precedence over port naming.
- The introductory mTLS claim could imply client-to-gateway mTLS by default. Clarified it as gateway-to-service mTLS.
- DNS weighted traffic shifting was described without mentioning provider support. Added a short caveat that this approach depends on DNS provider support and should use a low TTL.

## Review Notes
The EnvoyFilter rate limiting example matches Istio's documented approach, but EnvoyFilter exposes Envoy internals and should be reviewed during Istio upgrades. DNS-based cutovers are also subject to resolver and client caching even when low TTLs are used.
