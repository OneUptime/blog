# Validation Summary: How to Set Up External DNS on EKS with Route 53

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- Kubernetes Ingress and Service resources
- ExternalDNS
- Amazon Route 53
- IAM Roles for Service Accounts (IRSA)
- eksctl
- Helm
- AWS CLI
- AWS Load Balancer Controller

## Sources Consulted
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon Route 53 Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html
- AWS Load Balancer Controller IngressClass documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/
- Amazon EKS Application Load Balancer ingress documentation: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html

## Issues Found
- The IAM policy used `route53:ListTagsForResource`. ExternalDNS's current AWS tutorial grants `route53:ListTagsForResources`, so the policy was updated to match the permission ExternalDNS expects for Route 53 tag listing. The hosted-zone-scoped Route 53 actions were also grouped under the hosted zone ARN, leaving only `route53:ListHostedZones` with `Resource: "*"`.
- The Helm values used the legacy top-level `provider: aws` value. The current ExternalDNS Helm chart marks that legacy provider setting as deprecated, so it was changed to `provider.name: aws`.
- The Ingress example used the deprecated `kubernetes.io/ingress.class: alb` annotation. It was replaced with `spec.ingressClassName: alb`, which is the current Kubernetes/AWS Load Balancer Controller pattern.
- The TXT ownership example showed an `_externaldns.`-prefixed TXT record even though the post's Helm values do not set `txtPrefix`. It was changed to show the default TXT record name at the managed hostname.

## Review Notes
The remaining examples and commands are technically sound for a current EKS setup using ExternalDNS with Route 53 and IRSA. The `sync` policy is intentionally more aggressive than the chart default `upsert-only`, but the post accurately explains that it enables deletions.
