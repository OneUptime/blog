# Validation Summary: How to Deploy AWS Load Balancer Controller with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS Load Balancer Controller
- AWS IAM and IRSA
- AWS CLI
- Flux
- HelmRelease and HelmRepository
- Kubernetes Kustomization
- Kubernetes ServiceAccount, Ingress, and Service resources
- Application Load Balancers and Network Load Balancers

## Sources Consulted
- Amazon EKS documentation: Install AWS Load Balancer Controller with Helm: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS documentation: Route application and HTTP traffic with Application Load Balancers: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- Amazon EKS documentation: Route TCP and UDP traffic with Network Load Balancers: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- AWS Load Balancer Controller documentation: IngressClass: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/
- AWS Load Balancer Controller documentation: Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- AWS Load Balancer Controller documentation: Subnet auto-discovery: https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/main/docs/deploy/subnet_discovery.md
- AWS EKS Helm chart repository index: https://aws.github.io/eks-charts/index.yaml
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The IAM policy download used the moving `main` branch. Changed it to the current AWS Load Balancer Controller release tag, `v3.3.0`, so the policy matches the controller version being installed and does not change unexpectedly.
- The HelmRelease chart constraint used `1.7.x`, which installs the older v2.7 controller line. Changed it to `3.3.x`, matching the current AWS EKS chart repository release line available on 2026-05-13.
- The sample Ingress used the legacy `kubernetes.io/ingress.class` annotation. Changed it to `spec.ingressClassName: alb`, which is the current Kubernetes Ingress class field and is supported by AWS Load Balancer Controller when the chart-created `alb` IngressClass is present.

## Review Notes
- The AWS EKS install page still shows an example for controller v2.14.1 and chart 1.14.0, while the AWS EKS Helm chart repository currently lists chart 3.3.0 for controller v3.3.0. The post now follows the current chart repository release.
- The subnet role tags shown in the post remain valid and are still recommended for predictable subnet selection, even though newer controller versions can infer subnet reachability in some cases.
- The NLB Service annotations remain valid for AWS Load Balancer Controller-managed Network Load Balancers.
