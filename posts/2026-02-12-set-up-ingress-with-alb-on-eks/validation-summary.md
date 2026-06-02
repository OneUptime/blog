# Validation Summary: How to Set Up Ingress with ALB on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS Load Balancer Controller
- Kubernetes Ingress and Services
- AWS Application Load Balancer
- IAM Roles for Service Accounts
- Helm
- AWS Certificate Manager
- AWS WAFv2

## Sources Consulted
- Amazon EKS User Guide: Install AWS Load Balancer Controller with Helm: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS User Guide: Route application and HTTP traffic with Application Load Balancers: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- AWS Load Balancer Controller documentation: Ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller documentation: SSL Redirect: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.7/guide/tasks/ssl_redirect/
- Kubernetes documentation: Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The controller behavior description said pod IPs are always registered as targets. Updated it to explain that the controller registers nodes or pod IPs depending on the target type.
- The IP target mode description claimed it is generally recommended for lower latency. Updated it to the documented behavior: it routes directly to pod IPs and is required for Fargate, without making an unsupported latency claim.
- The IAM policy URL used AWS Load Balancer Controller v2.7.1 while current Amazon EKS documentation uses v2.14.1 and recommends controller v2.7.2 or later for ALB ingress. Updated the policy URL and matching file name to v2.14.1.
- The Helm install example did not pin the chart version corresponding to the documented v2.14.1 controller install. Added `--version 1.14.0`.
- The Ingress examples used the deprecated `kubernetes.io/ingress.class` annotation. Updated them to use `spec.ingressClassName: alb`.
- The HTTPS example enabled `alb.ingress.kubernetes.io/ssl-redirect` but only configured an HTTPS listener. Added the HTTP listener because SSL redirect requires both HTTP and HTTPS listeners and the redirect port must be an HTTPS listener.
- The WAF example used `alb.ingress.kubernetes.io/waf-acl-id`, which is for WAF Classic. Updated it to `alb.ingress.kubernetes.io/wafv2-acl-arn` for modern AWS WAF WebACLs.
- The closing paragraph used the old "ALB Ingress Controller" name. Updated it to "AWS Load Balancer Controller."

## Review Notes
The Kubernetes manifests were checked for YAML syntax after the edits. The article remains a practical tutorial and is technically valid for current AWS Load Balancer Controller guidance, though AWS EKS Auto Mode may be worth mentioning in a future broader update for users who do not need to install the controller manually.
