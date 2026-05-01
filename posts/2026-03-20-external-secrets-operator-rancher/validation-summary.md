# Validation Summary: How to Configure External Secrets Operator in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- kubectl
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets

## Sources Consulted
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator SecretStore docs: https://external-secrets.io/main/api/secretstore/
- External Secrets Operator AWS access docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator AWS Secrets Manager provider docs: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator HashiCorp Vault provider docs: https://external-secrets.io/latest/provider/hashicorp-vault/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Helm install reference: https://docs.helm.sh/docs/helm/helm_install/
- AWS Secrets Manager secret structure docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html
- Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes

## Issues Found
- The post used older `external-secrets.io/v1beta1` manifests for `ClusterSecretStore` and `ExternalSecret`. I updated them to `external-secrets.io/v1` to match the current official ESO API examples.
- The introduction said etcd encryption is "often disabled." I changed this to the precise Kubernetes behavior: Secrets are stored unencrypted in etcd by default unless encryption at rest is enabled.
- The AWS setup text said "Create an IAM role or user..." even though the example uses static AWS credentials from a Kubernetes `Secret`. I adjusted the wording so the prose matches the implementation shown.
- The AWS `remoteRef.key` comment described the value as a "Path in AWS Secrets Manager." I corrected it to "Secret name in AWS Secrets Manager" because AWS Secrets Manager identifies secrets by name/ARN, even if names include `/`.
- The Vault Kubernetes auth example did not include a token audience. I added `serviceAccountRef.audiences: [vault]` to match current ESO/Vault guidance for Vault 1.21+.
- The Vault setup step showed the manifest but did not apply it. I added `kubectl apply -f vault-secretstore.yaml` so the step is operationally complete.

## Review Notes
- `helm install ... --set installCRDs=true` remains valid, but current ESO documentation states CRDs are installed and managed by default; the flag is therefore redundant rather than incorrect.
- The Vault example assumes the Vault Kubernetes auth backend itself is already configured consistently with the service account, role, and audience settings used in the `ClusterSecretStore`.
