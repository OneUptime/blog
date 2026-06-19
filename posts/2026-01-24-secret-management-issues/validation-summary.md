# Validation Summary: How to Fix 'Secret Management' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Secrets
- kubectl
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault and Vault Agent Injector
- Kubernetes encryption at rest
- Sealed Secrets
- GitHub Actions
- Gitleaks
- TruffleHog
- Stakater Reloader
- Kubernetes audit policy
- PrometheusRule alerts

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secrets good practices: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator SecretStore API: https://external-secrets.io/latest/api/secretstore/
- External Secrets Operator AWS provider authentication: https://external-secrets.io/latest/provider/aws-access/
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- Stakater Reloader documentation: https://github.com/stakater/Reloader
- Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Gitleaks Action v3 migration notice: https://github.com/gitleaks/gitleaks-action/issues/218
- TruffleHog GitHub Action documentation: https://github.com/trufflesecurity/trufflehog

## Issues Found
- External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated the `SecretStore` and `ExternalSecret` snippets to `external-secrets.io/v1`, which is the current API version in the official documentation.
- The Vault Agent injection example used `source` with `/bin/sh`. Replaced it with the POSIX-compatible `.` command so the snippet works with standard `/bin/sh` implementations.
- The stale-secret detection command described `metadata.creationTimestamp` as the last modified time. Changed the text and command to show creation time plus `resourceVersion`, because `creationTimestamp` is not updated when a Secret changes.
- The Kubernetes encryption section said Secrets are "base64 encoded, not encrypted" without the default-storage caveat. Updated the wording to state that Secret values are base64 encoded and stored unencrypted in etcd by default.
- The Gitleaks GitHub Action example used `gitleaks/gitleaks-action@v2`, which is being superseded by v3. Updated it to `@v3`.
- The TruffleHog GitHub Action example used `--only-verified`. Updated it to the current documented `--results=verified` flag.

## Review Notes
The examples are still intentionally simplified. In production, prefer workload identity or short-lived credentials over static AWS access keys, avoid printing decoded secrets in shared terminals or logs, and consider pinning third-party GitHub Actions to immutable versions or SHAs.
