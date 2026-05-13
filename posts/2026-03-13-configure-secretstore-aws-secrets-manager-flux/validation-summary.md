# Validation Summary: How to Configure SecretStore for AWS Secrets Manager with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Secrets and ServiceAccounts
- External Secrets Operator SecretStore and ExternalSecret
- AWS Secrets Manager
- Amazon EKS IRSA
- IAM policies

## Sources Consulted
- External Secrets Operator AWS provider authentication docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator SecretStore docs: https://external-secrets.io/main/api/secretstore/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Amazon EKS IRSA docs: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service account role annotation docs: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS Secrets Manager GetSecretValue API docs: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
- AWS Secrets Manager IAM policy examples: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples.html
- AWS Secrets Manager CloudTrail logging docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html

## Issues Found
- The post used `external-secrets.io/v1beta1` for `SecretStore` and `ExternalSecret` examples. Updated the snippets to `external-secrets.io/v1`, which is the current API version shown in the official ESO docs.
- The IRSA example created the referenced ServiceAccount in the `external-secrets` namespace while the `SecretStore` was in `default`. ESO documents that namespaced `SecretStore` resources cannot reference resources across namespaces. Updated the ServiceAccount to live in `default` and removed the cross-namespace reference.
- The static credential Secret was created in `external-secrets` while the namespaced `SecretStore` was in `default`. Updated the Secret namespace to `default` so the `secretRef` works with a namespaced `SecretStore`.
- The verification command claimed `kubectl describe secretstore` shows a last sync time. Updated the wording to say it shows detailed status, conditions, and events.

## Review Notes
The IAM policy, Secrets Manager ARN prefix pattern, Flux `dependsOn` usage, kubectl commands, and `ExternalSecret` `remoteRef.property` usage are consistent with the referenced official documentation. In a production setup, dependent `ExternalSecret` resources should be managed by a Flux Kustomization that waits on the SecretStore readiness through health checks or health check expressions.
