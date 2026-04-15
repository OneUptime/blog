# How to Choose the Right Secret Store for Dapr in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Architecture, Production, Best Practice

Description: A decision framework for selecting the right Dapr secret store backend for production workloads based on your cloud provider, compliance requirements, and operational model.

---

Dapr supports over a dozen secret store backends. Choosing the right one for production depends on your cloud provider, existing infrastructure, compliance requirements, and team expertise. This guide provides a decision framework to help you make the right choice.

## Decision Criteria

Before comparing options, define your requirements:

1. **Cloud provider** - Are you on AWS, Azure, GCP, Alibaba, or on-prem?
2. **Compliance** - Do you need FIPS 140-2 compliance, audit logging, or HSM-backed keys?
3. **Existing tooling** - Is Vault already deployed in your organization?
4. **Secret rotation** - Do you need automatic rotation?
5. **Team expertise** - Is the team comfortable operating Vault, or would a managed service be better?

## Cloud-Native Options (Recommended for Cloud Deployments)

| Cloud | Recommended Store | Dapr Component Type |
|-------|------------------|---------------------|
| AWS | AWS Secrets Manager | `secretstores.aws.secretmanager` |
| AWS | AWS SSM Parameter Store | `secretstores.aws.parameterstore` |
| Azure | Azure Key Vault | `secretstores.azure.keyvault` |
| GCP | GCP Secret Manager | `secretstores.gcp.secretmanager` |

Use cloud-native stores when you want managed infrastructure, native IAM integration, and pay-per-use pricing.

## HashiCorp Vault / OpenBao (Best for Multi-Cloud and On-Prem)

Use Vault or OpenBao when:
- You run on multiple cloud providers and need a single secret store
- You have on-premises workloads alongside cloud workloads
- You need dynamic secrets (Vault can generate short-lived database credentials)
- You require detailed audit logging and policy enforcement

```yaml
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.internal:8200"
    - name: vaultTokenMountPath
      value: "/var/run/secrets/vault/token"
```

## Kubernetes Secrets (Simple but Limited)

Use Kubernetes secrets when:
- You are in a single Kubernetes cluster with no multi-cloud requirements
- You have existing secrets in Kubernetes and do not want to migrate yet
- You use a secrets encryption provider (KMS) with Kubernetes

```yaml
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

Do not use Kubernetes secrets if you need cross-cluster secret sharing or fine-grained access policies beyond RBAC.

## Local Stores (Development Only)

For development and testing:

```yaml
# Local file - great for dev
spec:
  type: secretstores.local.file

# Local env vars - great for CI
spec:
  type: secretstores.local.env
```

## Cost Comparison

A rough monthly cost comparison for 10,000 secret reads per day:

- **AWS Secrets Manager**: ~$0.40/month per secret + $0.05 per 10,000 API calls
- **AWS SSM Parameter Store**: Free for standard parameters, $0.05/month for advanced
- **Azure Key Vault**: $0.03 per 10,000 operations
- **GCP Secret Manager**: $0.03 per 10,000 access operations
- **HashiCorp Vault (self-hosted)**: Infrastructure cost only
- **OpenBao**: Infrastructure cost only (open source)

## Recommended Decision Tree

```text
Running on a single cloud?
  YES -> Use the cloud-native managed service
    - AWS -> AWS Secrets Manager or SSM
    - Azure -> Azure Key Vault
    - GCP -> GCP Secret Manager

  NO (multi-cloud or on-prem)?
    -> Use HashiCorp Vault or OpenBao

Development only?
  -> Use local file or env var store

Need Vault but want open-source license?
  -> Use OpenBao (Vault-compatible)
```

## Summary

For production Dapr deployments, cloud-native secret stores are the best choice when you commit to a single cloud provider because they require no operational overhead and integrate natively with cloud IAM. HashiCorp Vault or OpenBao is the right choice for multi-cloud or on-premises environments where a single control plane for secrets is required. Local file and environment variable stores should be reserved for development and CI.
