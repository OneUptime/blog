# Validation Summary: How to Configure Flux CD with AWS Load Balancer Controller

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- AWS Load Balancer Controller
- Amazon EKS
- Kubernetes Ingress and Service resources
- Helm and Flux HelmRelease
- AWS IAM Roles for Service Accounts (IRSA)
- AWS CLI
- ALB, NLB, WAFv2, and Shield

## Sources Consulted
- Amazon EKS documentation: Install AWS Load Balancer Controller with Helm - https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS documentation: Kubernetes version lifecycle on EKS - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS Load Balancer Controller documentation: Installation guide - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
- AWS Load Balancer Controller documentation: Subnet auto discovery - https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/deploy/subnet_discovery/
- AWS Load Balancer Controller documentation: Ingress annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller documentation: Service annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.4/guide/service/annotations/
- AWS Load Balancer Controller documentation: Security group management - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/security_groups/
- Flux documentation: Manage Helm releases - https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/
- Kubernetes documentation: Ingress - https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The introduction said the controller provisions load balancers when any Kubernetes Service is created. Updated it to specify Services of type LoadBalancer.
- The prerequisite listed Kubernetes 1.25 or later. Updated it to require a supported EKS Kubernetes version because EKS 1.25 is no longer in current support.
- The IAM policy URL referenced AWS Load Balancer Controller v2.7.1. Updated it to v2.14.1 to match current Amazon EKS installation documentation.
- The HelmRelease chart version used `1.7.x`. Updated it to `1.14.x`, matching the current AWS-documented chart line for AWS Load Balancer Controller v2.14.1.
- The Ingress examples used the legacy `kubernetes.io/ingress.class` annotation while also setting `spec.ingressClassName`. Removed the legacy annotation and made the chart's IngressClass creation explicit.
- The HTTPS redirect example only configured an HTTPS listener, so there was no HTTP listener to redirect. Updated `listen-ports` to include both HTTP 80 and HTTPS 443.
- The ALB example specified a custom frontend security group without enabling controller-managed backend security group rules. Added `alb.ingress.kubernetes.io/manage-backend-security-group-rules: "true"` so backend access is managed as described.

## Review Notes
The remaining examples are technically valid as illustrative manifests, but production deployments should pin exact chart versions after testing and review controller release notes before upgrading.
