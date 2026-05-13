# Validation Summary: How to Configure Flux ECR Pull-Through Cache on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECR pull-through cache
- Amazon EKS
- AWS IAM and IRSA
- AWS CLI
- Kubernetes manifests
- Flux source-controller
- Flux image-reflector-controller and Image Automation
- OCI Helm repositories

## Sources Consulted
- Amazon ECR User Guide: Sync an upstream registry with an Amazon ECR private registry: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html
- Amazon ECR User Guide: Creating a pull through cache rule in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-rule.html
- Amazon ECR User Guide: IAM permissions required to sync an upstream registry with an Amazon ECR private registry: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-iam.html
- Amazon ECR User Guide: Pulling an image with a pull through cache rule in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-working-pulling.html
- Amazon ECR User Guide: Using Amazon ECR Images with Amazon EKS: https://docs.aws.amazon.com/en_us/AmazonECR/latest/userguide/ECR_on_EKS.html
- Amazon ECR Pricing: https://aws.amazon.com/ecr/pricing/
- Flux documentation: HelmRepository: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux documentation: ImageRepository: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux documentation: AWS integrations: https://fluxcd.io/flux/integrations/aws/
- Amazon EKS documentation: IAM roles for service accounts: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

## Issues Found
- Docker Hub and GitHub Container Registry pull-through cache rules were missing `--credential-arn`. AWS requires Secrets Manager credentials for these upstream registries, so the commands now include credential ARN placeholders and the text explains the `ecr-pullthroughcache/` secret-name requirement.
- The Flux HelmRepository example used a Docker Hub cache path for a Helm chart source. It now uses the GHCR cache prefix, which is the more appropriate upstream for an OCI chart example.
- The post described `provider: aws` as using the AWS ECR credential helper. Flux uses AWS authentication from the controller pod through node IAM or IRSA, so the explanation was corrected.
- The ECR authentication section used a CronJob based on `amazon/aws-cli` to create a Docker registry Secret. That example was incomplete because the image does not provide `kubectl`, no RBAC was defined, and the Secret was not referenced by Flux resources. It was replaced with IRSA patches for `source-controller` and `image-reflector-controller`, matching Flux's AWS provider model.
- The post implied Flux-managed workload image pulls need Flux-managed ECR credentials. Standard Kubernetes image pulls on EKS are handled by the EKS node role or Fargate pod execution role, so that note was corrected.

## Review Notes
- Flux's HelmRepository `type: oci` remains supported, but Flux documentation notes it is in maintenance mode and recommends OCIRepository for improved OCI Helm chart support in new designs.
- The lifecycle policy example assumes the cached repository already exists. Pulling the image once or otherwise creating the repository is required before applying a repository lifecycle policy.
