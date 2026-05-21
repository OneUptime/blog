# Validation Summary: How to Handle mTLS for Services Behind Load Balancer

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Gateway
- Istio PeerAuthentication
- Istio DestinationRule
- Istio mutual TLS
- Kubernetes Service
- Kubernetes kubectl
- AWS Load Balancer Controller annotations
- Prometheus / PromQL

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes Service source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The internal load balancer section implied any internal load balancer between sidecars necessarily breaks mTLS. Updated the wording to clarify that the problem applies when the load balancer terminates or inspects the connection at layer 7; TCP passthrough can preserve the sidecar-to-sidecar mTLS connection.
- The DestinationRule solution said it disabled mTLS while using `ISTIO_MUTUAL`, which enables Istio mutual TLS. Updated the heading and explanation to say it explicitly enables mTLS.
- The health check example used non-Kubernetes pseudo-fields (`healthCheckPort` and `healthCheckPath`) and labeled them as an AWS ALB target. Replaced them with AWS Network Load Balancer Service annotation keys documented by the AWS Load Balancer Controller.

## Review Notes
The Istio Gateway snippets show listener configuration only; a complete ingress setup also needs matching routing resources such as VirtualService or Gateway API routes. The post remains technically correct for its mTLS-focused scope.
