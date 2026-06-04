# Validation Summary: How to Use cert-manager DNS-01 Challenge with Route53 for Wildcard Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- ACME DNS-01 challenges
- Let's Encrypt
- AWS Route53
- AWS IAM
- EKS IAM Roles for Service Accounts (IRSA)
- kubectl
- eksctl
- AWS CLI

## Sources Consulted
- cert-manager Route53 DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager DNS01 challenge provider documentation: https://cert-manager.io/docs/configuration/acme/dns01/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Let's Encrypt Challenge Types documentation: https://letsencrypt.org/docs/challenge-types/
- Amazon Route53 IAM service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html
- Amazon Route53 pricing: https://aws.amazon.com/route53/pricing/
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The introduction said a wildcard certificate secures all subdomains under a domain. Changed it to say it secures one level of subdomains, because `*.example.com` covers names such as `api.example.com` but not nested names such as `api.dev.example.com`.
- The Route53 solver comment described `region` as the AWS region where the hosted zone resides. Changed it to explain that Route53 is global and cert-manager uses the region as an AWS credential-scope/STS hint; with IRSA or EKS Pod Identity, the injected region normally takes precedence.
- The AWS access-key ClusterIssuer example created a Kubernetes Secret containing both access key ID and secret access key, but then hardcoded `accessKeyID` in the manifest. Changed it to `accessKeyIDSecretRef` so both credentials are read from the Secret, matching cert-manager's documented long-term access key example.
- The troubleshooting section suggested executing into the cert-manager pod and running the AWS CLI. The cert-manager controller image should not be assumed to contain the AWS CLI. Replaced it with a temporary `amazon/aws-cli` pod that uses the cert-manager service account.
- The first temporary AWS CLI pod command used a removed/deprecated `kubectl run --serviceaccount` style. Changed it to the supported `--overrides='{"spec":{"serviceAccountName":"cert-manager"}}'` form.
- The Route53 pricing bullets were overly broad. Updated them to mention the first-tier pricing scope: standard queries for the first 1 billion queries per month and hosted zones for the first 25 hosted zones.
- The TTL best-practice note referred to zone TTLs and implied lower TTLs always speed cert-manager DNS-01 validation. Changed it to refer to manually managed validation records and resolver caching delays.

## Review Notes
The cert-manager API examples use the current `cert-manager.io/v1` resources and valid Certificate, ClusterIssuer, and Ingress structures. For new EKS deployments, cert-manager's latest documentation also highlights EKS Pod Identity as a simpler ambient credential option than IRSA, but the post's IRSA-focused guidance remains technically valid.
