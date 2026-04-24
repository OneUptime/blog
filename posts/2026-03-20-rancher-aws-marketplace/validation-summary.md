# Validation Summary: How to Use Rancher with AWS Marketplace

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Amazon EKS
- AWS Marketplace
- `eksctl`
- AWS CLI
- Helm
- Route 53
- ingress-nginx

## Sources Consulted
- Rancher Prime AWS Marketplace Quick Start: https://ranchermanager.docs.rancher.com/getting-started/quick-start-guides/deploy-rancher-manager/aws-marketplace
- Rancher Prime in AWS: Usage Instructions: https://suse-enceladus.github.io/marketplace-docs/rancher-prime/aws/?chart_version=0.1.11&repository=rancher-payg-billing-adapter-lto-llc
- Installing Rancher on Amazon EKS: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rancher-on-amazon-eks
- AWS Marketplace Integration prerequisites: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/cloud-marketplace/aws-cloud-marketplace/adapter-requirements
- Installing the AWS Marketplace adapter: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/cloud-marketplace/aws-cloud-marketplace/install-adapter
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- `eksctl` nodegroup scaling reference: https://docs.aws.amazon.com/eks/latest/eksctl/general-nodegroups.html
- Helm OCI registries: https://helm.sh/docs/v3/topics/registries/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/

## Issues Found
- The original AWS Marketplace listing URL was not the current documented listing for the Rancher Marketplace quick-start flow. I replaced it with the listing linked from Rancher’s official AWS Marketplace quick-start page.
- The original deployment steps used the standard `charts.rancher.com` Helm chart, manual `cert-manager` installation, Let’s Encrypt flags, and a deprecated PSP-related setting. That does not match the documented AWS Marketplace PAYG installation flow. I replaced those steps with the Marketplace OCI chart deployment from AWS Marketplace ECR.
- The post omitted the required OIDC and IAM setup for AWS Marketplace metering. I added the OIDC provider check/association flow and the `eksctl create iamserviceaccount --role-only` command with `AWSMarketplaceMeteringFullAccess`, matching the official Marketplace install flow.
- The original guide installed the AWS Load Balancer Controller and implied that was the ingress path for the Marketplace deployment. The Marketplace usage instructions instead assume an ingress class named `nginx`, so I replaced that section with `ingress-nginx` installation plus Route 53 DNS configuration.
- The original post claimed a separate subscription activation step inside the Rancher UI and suggested billing could be monitored by counting Kubernetes nodes. That is not how the documented Marketplace PAYG flow works. I replaced it with login instructions and deployment-level verification of the Marketplace billing adapter components.
- The original shell snippets contained several non-executable angle-bracket placeholders and a hardcoded Kubernetes version. I converted those to shell-safe variables or example values and changed the EKS version guidance to use a Rancher-supported EKS version rather than pinning an outdated value.
- The original Helm OCI flow would likely have required `HELM_EXPERIMENTAL_OCI` only on older Helm releases. I used the current `helm registry login` flow without that flag because OCI support is GA in current Helm 3 releases.

## Review Notes
- The current Rancher Marketplace usage instructions still assume an ingress class named `nginx`. That makes the corrected post accurate to the published Marketplace flow, but `ingress-nginx` reached retirement in March 2026. This post should be revisited if SUSE updates the Marketplace installation path to use Traefik or another ingress controller.
- The Marketplace repository name and chart version come from the offer’s Usage Information and can vary by offer or region, so the post intentionally leaves them as variables instead of hardcoding values.
