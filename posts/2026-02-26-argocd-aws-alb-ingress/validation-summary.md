# Validation Summary: How to Expose ArgoCD with AWS ALB Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Amazon EKS
- AWS Load Balancer Controller
- Kubernetes Ingress
- AWS Application Load Balancer
- AWS Certificate Manager
- AWS WAFv2
- Route 53
- ExternalDNS
- AWS CLI
- Helm

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Amazon EKS AWS Load Balancer Controller Helm installation: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- AWS Load Balancer Controller Ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- Elastic Load Balancing target groups for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Elastic Load Balancing Application Load Balancer health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS CLI wafv2 create-web-acl command reference: https://docs.aws.amazon.com/cli/latest/reference/wafv2/create-web-acl.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The HTTPS redirect example configured only an HTTPS listener while also setting `alb.ingress.kubernetes.io/ssl-redirect`. AWS Load Balancer Controller applies SSL redirect to HTTP listeners, so the Ingress now declares both HTTP 80 and HTTPS 443 listeners.
- The gRPC Ingress used `/healthz` and an HTTP 200 matcher for a gRPC target group. ALB gRPC target groups require gRPC health check paths and gRPC status-code matchers, so the example now uses `/grpc.health.v1.Health/Check` and success code `0`.
- The controller Helm install command used `serviceAccount.create=false`, which assumes the service account already exists. The surrounding text now states that the service account and IAM role must be created before running that command.

## Review Notes
- The Ingress resources use the current `networking.k8s.io/v1` API and `ingressClassName`.
- The WAFv2, access log, security group, inbound CIDR, backend protocol, backend protocol version, and load balancer attribute annotations match the AWS Load Balancer Controller documentation.
- The Route 53 command is structurally valid, but users must replace `ALB_HOSTED_ZONE_ID` with the canonical hosted zone ID for the created ALB.
