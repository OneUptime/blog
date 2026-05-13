# Validation Summary: How to Configure Flux OCI Secret with AWS ECR Login Token

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Source Controller
- OCIRepository
- HelmRepository
- AWS Elastic Container Registry (ECR)
- AWS CLI
- IAM Roles for Service Accounts (IRSA)
- Kubernetes Secrets and CronJobs

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI Docker image documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html

## Issues Found
- The prerequisite "Kubernetes cluster (v1.20 or later)" was outdated for current Flux releases. Changed it to require a Kubernetes version supported by the installed Flux release.
- The HelmRepository OCI URL example pointed only at the ECR registry host. Flux documentation expects OCI HelmRepository URLs to point at a registry repository path, so the example now includes `/charts`.
- The CronJob example used `amazon/aws-cli:latest` while also running `kubectl`. AWS documents the official AWS CLI image as supporting only the AWS CLI, so the example now says to use an image that includes both AWS CLI and `kubectl`.

## Review Notes
- The main `OCIRepository` examples using `apiVersion: source.toolkit.fluxcd.io/v1`, `provider: aws`, and `secretRef` match the current Flux source-controller API.
- ECR authorization tokens are correctly described as valid for 12 hours, and the `aws ecr get-login-password` usage is consistent with AWS documentation.
- Flux now notes that HelmRepository `type: oci` is in maintenance mode and recommends OCIRepository for improved OCI Helm chart support. The existing HelmRepository example remains technically valid.
