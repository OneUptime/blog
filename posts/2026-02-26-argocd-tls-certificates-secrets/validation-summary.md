# Validation Summary: How to Manage TLS Certificates as Secrets with ArgoCD

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets and Ingress
- TLS certificates
- cert-manager
- Bitnami Sealed Secrets and kubeseal
- External Secrets Operator
- HashiCorp Vault KV and PKI secrets engines
- Prometheus Operator alerting

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Ingress TLS documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.15-docs/devops-tips/prometheus-metrics/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator templating documentation: https://external-secrets.io/latest/guides/templating/
- External Secrets Operator VaultDynamicSecret generator documentation: https://external-secrets.io/latest/api/generator/vault/
- HashiCorp Vault PKI setup documentation: https://developer.hashicorp.com/vault/docs/secrets/pki/setup
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki

## Issues Found
- The post referred to AWS Certificate Manager as an External Secrets source. External Secrets Operator integrates with AWS Secrets Manager, not ACM as a direct provider, so this was changed to AWS Secrets Manager.
- The ExternalSecret examples used `external-secrets.io/v1beta1`. Current ESO documentation uses the stable `external-secrets.io/v1` API, so the examples were updated.
- The Vault KV example used `secret/data/tls/wildcard` as the `remoteRef.key`. With ESO's Vault provider configured for KV v2 at the `secret` mount, the documented key is the logical secret path, so it was changed to `tls/wildcard`.
- The ESO template examples omitted `engineVersion: v2`. Current ESO templating examples specify v2 for Go template syntax, so this was added.
- The Vault PKI ESO example tried to read `pki/issue/internal-services` with plain `remoteRef` entries. Vault PKI issuance requires a write request with parameters such as `common_name`, so the example was replaced with the documented `VaultDynamicSecret` generator pattern and an ExternalSecret that consumes it with `dataFrom`.

## Review Notes
The rest of the post is technically consistent with the consulted documentation. The cert-manager Helm example pins `v1.14.0`, which is old by the validation date but still valid for the fields shown. In a future content refresh, consider updating the pinned cert-manager chart version and adding a note that Argo CD sync waves only wait for certificate readiness if Argo CD has an appropriate health check for `cert-manager.io/Certificate`.
