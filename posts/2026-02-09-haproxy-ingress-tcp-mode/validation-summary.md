# Validation Summary: How to Use HAProxy Ingress Controller with TCP Mode for Non-HTTP Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- HAProxy Kubernetes Ingress Controller
- TCP load balancing
- Ingress resources
- ConfigMaps
- Prometheus monitoring
- cert-manager

## Sources Consulted
- HAProxy Kubernetes Ingress Controller: Load balance TCP: https://www.haproxy.com/documentation/kubernetes-ingress/ingress-tutorials/load-balance-tcp/
- HAProxy Kubernetes Ingress Controller startup arguments: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/startupargs/
- HAProxy Kubernetes Ingress Controller TCP CRD reference: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/tcps-crd/
- HAProxy Kubernetes Ingress Controller IngressClass reference: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/ingressclass/
- Kubernetes Ingress concept documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- HAProxy Kubernetes Ingress Controller metrics documentation: https://www.haproxy.com/documentation/kubernetes-ingress/administration/metrics/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The title and topic describe HAProxy Ingress TCP mode, but the Basic Configuration example used a standard HTTP Ingress with `ingressClassName: nginx`. Replaced it with HAProxy's documented TCP services ConfigMap pattern and noted that the controller must be started with `--configmap-tcp-services` and expose the TCP ports on its Kubernetes Service.
- The architecture section described ingress controllers only as Layer 7 routers. Updated it to distinguish HTTP Layer 7 routing from HAProxy TCP mode, which exposes dedicated ports and maps them to backend services.
- The post said the controller watches only Ingress resources. Updated it to include TCP custom resources and TCP service ConfigMaps, which are used by HAProxy Ingress for TCP traffic.
- Several HTTP-specific recommendations were written as if they applied to all ingress traffic. Qualified header-based routing, security headers, CORS, WAF rules, HTTP/2, and compression as HTTP-specific guidance.
- The phrase "custom middleware chains" was not accurate for HAProxy Kubernetes Ingress Controller terminology. Replaced it with "custom HAProxy configuration."

## Review Notes
The corrected ConfigMap uses the documented `frontend-port: namespace/service:service-port` mapping format. HAProxy also supports a TCP custom resource in version 3.0 and newer, but the post now uses the ConfigMap approach to keep the change focused.
