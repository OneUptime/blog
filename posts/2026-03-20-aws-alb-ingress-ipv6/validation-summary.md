# Validation Summary: How to Configure AWS ALB Ingress Controller for IPv6

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Amazon EKS
- AWS Load Balancer Controller
- Application Load Balancer (ALB)
- Network Load Balancer (NLB)
- Kubernetes Ingress
- Kubernetes Service
- `eksctl`
- AWS CLI
- IPv6 networking

## Sources Consulted
- Amazon EKS: Deploying an Amazon EKS IPv6 cluster and managed Amazon Linux nodes - https://docs.aws.amazon.com/eks/latest/userguide/deploy-ipv6-cluster.html
- Amazon EKS: Learn about IPv6 addresses to clusters, Pods, and services - https://docs.aws.amazon.com/eks/latest/userguide/cni-ipv6.html
- `eksctl` User Guide: IPv6 Support - https://docs.aws.amazon.com/eks/latest/eksctl/vpc-ip-family.html
- AWS Load Balancer Controller: Installation Guide - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
- AWS Load Balancer Controller: Ingress annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller: Service annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Elastic Load Balancing: Update the IP address types for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-ip-address-type.html
- Elastic Load Balancing: Target groups for your Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Kubernetes: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The post described Amazon EKS IPv6 as "dual-stack pod networking" and suggested verifying both IPv4 and IPv6 pod CIDRs. I updated the introduction and prerequisite checks to reflect Amazon EKS's actual model: clusters are created with the `IPv6` IP family, Pods and Services are not dual-stacked, and verification should check Pod and Service IPv6 addresses.
- The `eksctl create cluster` example did not match the current `eksctl` guidance for IPv6 clusters and omitted required IPv6 cluster configuration. I replaced it with the documented config-file-based `eksctl` workflow using `kubernetesNetworkConfig.ipFamily: IPv6`, managed add-ons, OIDC, and a managed node group.
- The AWS Load Balancer Controller install snippet used `serviceAccount.create=false` without creating the IAM policy and IRSA-backed ServiceAccount required for that path. I added the missing IAM policy creation and `eksctl create iamserviceaccount` step before the Helm install.
- The target-group and NLB Service explanations implied dual-stack Pods or Services on EKS. I corrected the target-group notes to require `ip` target type for IPv6 Pods and changed the NLB Service example to a single-stack IPv6 Service with a dual-stack NLB frontend.
- The verification example used `aws elbv2 describe-listeners` to check for IPv6, but listener data does not expose the ALB IP address type. I replaced it with `aws elbv2 describe-load-balancers` querying `IpAddressType`.

## Review Notes
- The post is technically valid after the corrections above.
- The controller IAM policy download URL is version-pinned to the current upstream installation guide and should be refreshed if the post is revalidated against a newer controller release.
- The article focuses on controller configuration and does not walk through IPv6 route table or network ACL checks in detail; those AWS network prerequisites still need to be satisfied in production.
