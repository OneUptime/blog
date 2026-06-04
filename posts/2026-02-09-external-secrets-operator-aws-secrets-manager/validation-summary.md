# Validation Summary: How to Use External Secrets Operator to Sync AWS Secrets Manager with Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- External Secrets Operator
- AWS Secrets Manager
- AWS IAM
- Amazon EKS IRSA
- Helm
- AWS CLI
- Stakater Reloader

## Sources Consulted
- External Secrets Operator Getting Started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator AWS Access docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator AWS Secrets Manager provider docs: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator SecretStore docs: https://external-secrets.io/main/api/secretstore/
- AWS Secrets Manager service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssecretsmanager.html
- AWS CLI create-secret reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI rotate-secret reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/secretsmanager/rotate-secret.html
- AWS IAM create policy documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create-cli.html
- eksctl IRSA documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Kubernetes environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Stakater Reloader documentation: https://docs.stakater.com/reloader/main/architecture/how-it-works.html

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to the current `external-secrets.io/v1` API used by the latest ESO documentation.
- Corrected the IAM policy so `secretsmanager:ListSecrets` uses `Resource: "*"` because AWS Secrets Manager does not list a resource type for that action. Added the read actions ESO commonly needs on specific secret ARNs.
- Corrected the access-key authentication example so the `aws-credentials` Secret is created in the same namespace as the namespaced `SecretStore`; ESO docs state namespaced SecretStores cannot reference resources across namespaces.
- Corrected the IRSA SecretStore and ClusterSecretStore examples to use the AWS SDK default credential chain from the ESO controller pod identity instead of referencing a service account in another namespace.
- Updated the CRD verification output to say CRDs are included and added the current ESO CRDs installed by the chart.
- Fixed the Kubernetes Deployment example so `envFrom` is a container field alongside `env`, not nested inside the `env` list.

## Review Notes
- The AWS rotation command is valid, but `aws secretsmanager rotate-secret` starts rotation immediately by default when configuring rotation. The post's wording is still acceptable for a high-level tutorial.
- YAML snippets were parsed successfully after the fixes.
