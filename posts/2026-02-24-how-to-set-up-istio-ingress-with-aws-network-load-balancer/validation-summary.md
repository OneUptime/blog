# Validation Summary: How to Set Up Istio Ingress with AWS Network Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- IstioOperator
- Istio Gateway
- Istio gateway Helm chart
- Amazon EKS
- AWS Network Load Balancer
- AWS Load Balancer Controller
- Kubernetes Services
- AWS CLI

## Sources Consulted
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio application port requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Envoy access log documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- AWS EKS Network Load Balancer documentation: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- AWS EKS load balancing best practices: https://docs.aws.amazon.com/eks/latest/best-practices/load-balancing.html
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- AWS Network Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS Network Load Balancer security groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-security-groups.html

## Issues Found
- The post said EKS Istio ingress defaults to a Classic Load Balancer without qualification. Updated this to note that this applies when the AWS Load Balancer Controller is not managing LoadBalancer Services, since current AWS Load Balancer Controller versions can default Service type LoadBalancer resources to NLBs.
- The post described Classic Load Balancers as being phased out. Updated this to the more accurate AWS positioning that CLB is the previous generation and ALB/NLB are recommended for most new workloads.
- The post used the deprecated AWS Load Balancer Controller cross-zone annotation. Replaced it with `service.beta.kubernetes.io/aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"`.
- The Helm values example used the older `gateways.istio-ingressgateway.serviceAnnotations` shape. Updated it to the current Istio gateway chart format under `service.annotations`.
- The post said IP target mode preserves source IP automatically. Updated this because AWS documents client IP preservation as disabled by default for TCP/TLS IP target groups, requiring `preserve_client_ip.enabled=true` when source IP preservation is needed.
- The health check section said NLBs check target pods generally. Updated this to say NLBs check registered targets and that port 15021 `/healthz/ready` applies directly in IP target mode.
- The log verification section assumed Envoy access logs are enabled. Updated it to make that condition explicit.
- The troubleshooting section said NLBs do not have their own security groups. Updated this because AWS Network Load Balancers now support security groups.

## Review Notes
The guide is now technically valid for current Istio gateway Helm usage and current AWS Load Balancer Controller behavior. EKS Auto Mode has additional annotation and `loadBalancerClass` differences, but the post is focused on Istio with the AWS Load Balancer Controller and does not need a separate Auto Mode section.
