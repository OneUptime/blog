# Validation Summary: How to Configure Istio with AWS ALB (Application Load Balancer)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- IstioOperator
- Istio Gateway and VirtualService APIs
- Istio AuthorizationPolicy
- AWS Load Balancer Controller
- AWS Application Load Balancer
- Kubernetes Ingress and Service
- Amazon EKS
- AWS WAF and ACM

## Sources Consulted
- AWS Load Balancer Controller annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller SSL redirect documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/tasks/ssl_redirect/
- AWS Load Balancer Controller IngressClass documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/
- Amazon EKS documentation for installing AWS Load Balancer Controller with Helm: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio gateway network topology documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/

## Issues Found
- The ALB Ingress examples used the legacy `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: alb`, which is the current Kubernetes Ingress field and is supported by AWS Load Balancer Controller.
- The instance-target ALB health check was configured for port `15021`, but in instance mode ALB targets node ports. Added `status-port` to the Istio ingress gateway NodePort service and changed the health check port to node port `30021`.
- The Istio Gateway examples used Kubernetes-style `selector.matchLabels`. Istio Gateway `selector` is a direct label map, so the examples now use `selector: { istio: ingressgateway }` in YAML form.
- The Istio Gateway examples used container ports `8080` and `8443`. Updated them to use the gateway service ports `80` and `443`, matching Istio Gateway examples and the Kubernetes Service ports exposed to the ALB.
- The IP target mode Ingress backend referenced service port `8080`, which was not defined as a Service port in the earlier IstioOperator snippet. Changed it to service port `80`; AWS Load Balancer Controller can still route to pod IPs using the Service target port in IP mode.
- The re-encryption section was titled as mTLS but only configured HTTPS backend traffic, not mutual TLS. Renamed the section to TLS and updated the example to forward to the gateway HTTPS service port `443`.

## Review Notes
- Kubernetes documents Ingress as stable but frozen and recommends Gateway API for new extensibility. The post remains technically valid because AWS Load Balancer Controller still documents and supports Kubernetes Ingress for ALB provisioning.
