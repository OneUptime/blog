# Validation Summary: How to Move Kubernetes Secrets from Native Secrets to External Secrets Operator

## Status
validated

## Post Type
Technical tutorial / migration guide

## Technologies Covered
- Kubernetes Secrets
- External Secrets Operator
- Helm
- AWS Secrets Manager and IRSA
- HashiCorp Vault Kubernetes auth
- Azure Key Vault
- Google Secret Manager
- Prometheus Operator ServiceMonitor and PrometheusRule
- Bash, jq, Python, PyYAML

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- External Secrets Operator getting started and Helm installation docs: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator AWS access provider docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator Google Secret Manager provider docs: https://external-secrets.io/latest/provider/google-secrets-manager/
- External Secrets Operator v1 API specification: https://external-secrets.io/v1.0.0/api/spec/
- External Secrets Operator metrics docs: https://external-secrets.io/v0.5.9/guides-metrics/
- HashiCorp Vault Kubernetes auth docs: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- AWS CLI Secrets Manager create-secret reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- Azure CLI Key Vault secret reference: https://learn.microsoft.com/cli/azure/keyvault/secret
- Google Cloud CLI secrets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create

## Issues Found
- The External Secrets Operator manifests and generated Python YAML used `external-secrets.io/v1beta1`. Updated them to `external-secrets.io/v1` to match current ESO documentation and API examples.
- The AWS IAM examples used a 9-digit placeholder account ID. Updated the examples to use a valid 12-digit placeholder account ID.
- The introduction said External Secrets Operator "solves" Kubernetes Secret storage problems. Clarified that ESO helps address those problems while workloads still consume native Kubernetes Secrets.
- The Vault setup used Kubernetes service account file paths without context. Added a short note that the command must be run from a pod with those files mounted or with equivalent cluster values supplied.
- The Prometheus alert used `externalsecret_sync_calls_error > 0` against a counter, which would keep firing after any previous error. Changed it to `increase(externalsecret_sync_calls_error[5m]) > 0`.
- The conclusion implied ESO itself enables rotation and audit trails. Reworded it to say ESO integrates with providers that support rotation and audit trails.

## Review Notes
The migration scripts assume text secret values that can be decoded as UTF-8 and stored as AWS Secrets Manager `SecretString` values. That is common for application credentials, but binary Kubernetes Secret data would need separate handling with provider-specific binary secret support.
