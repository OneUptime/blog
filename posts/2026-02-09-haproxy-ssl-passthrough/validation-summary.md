# Validation Summary: How to Configure HAProxy Ingress SSL Passthrough for End-to-End Encryption

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Ingress
- HAProxy Kubernetes Ingress Controller
- SSL/TLS passthrough
- cert-manager
- Prometheus

## Sources Consulted
- Kubernetes Ingress concept documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- HAProxy Kubernetes Ingress Controller Ingress annotations: https://www.haproxy.com/documentation/kubernetes-ingress/enterprise/configuration-reference/ingress/
- HAProxy Kubernetes Ingress Controller Service annotations: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/service/
- HAProxy Kubernetes Ingress Controller IngressClass documentation: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/ingressclass/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The example Ingress used `ingressClassName: nginx`, which did not match the HAProxy-focused title. Changed it to `ingressClassName: haproxy`, matching the HAProxy controller's documented default class name.
- The example routed to service port `80` and did not enable SSL passthrough. Added the documented `haproxy.org/ssl-passthrough: "true"` annotation and changed the backend service port to `443` so encrypted traffic is passed to a TLS-terminating backend.
- The post described HTTP-layer features such as header-based routing, CORS, security headers, WAF rules, HTTP/2, and compression without caveats. HAProxy documents SSL passthrough as TCP mode, where HTTP-mode annotations and inspection are unavailable. Added scoped caveats so those recommendations apply to HTTP-mode routes or to the backend service when passthrough is used.
- The security guidance implied cert-manager would manage the ingress-terminated certificate. For SSL passthrough, TLS terminates in the backend service, so the text now says to manage the backend service's certificate lifecycle directly.

## Review Notes
The post is still high-level and does not include deployment commands for installing the HAProxy ingress controller or creating backend TLS certificates. Future improvements could add a complete working example with the Service, backend Deployment, certificate resource, and controller installation steps.
