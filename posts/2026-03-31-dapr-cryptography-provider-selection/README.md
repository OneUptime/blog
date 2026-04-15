# How to Choose the Right Cryptography Provider for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Key Vault, Comparison, Security, Architecture, Provider

Description: Compare Dapr Cryptography providers including Azure Key Vault, Kubernetes Secrets, JWKS, and local storage to choose the right one for your security and operational requirements.

---

## Dapr Cryptography Providers Overview

Dapr Cryptography decouples your application's encryption logic from the key management backend. You choose a provider based on your environment, security requirements, compliance needs, and operational preferences. The application code remains identical regardless of which provider you choose.

## Available Providers

| Provider | Type | Best For |
|----------|------|----------|
| `crypto.dapr.localstorage` | Local filesystem | Development, local testing |
| `crypto.dapr.kubernetes.secrets` | Kubernetes etcd | Dev/staging, in-cluster only |
| `crypto.azure.keyvault` | Azure managed service | Azure production workloads |
| `crypto.dapr.jwks` | JWKS endpoint or file | Token signing, multi-service key sharing |

## Local Storage

```yaml
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
  - name: path
    value: ./keys
```

**Pros:**
- No external dependencies
- Zero configuration
- Instant key creation

**Cons:**
- Keys are unprotected files on disk
- Not suitable for production
- No access control, auditing, or rotation

**Use when:** Running locally or in CI/CD pipelines for testing.

## Kubernetes Secrets

```yaml
spec:
  type: crypto.dapr.kubernetes.secrets
  version: v1
  metadata:
  - name: defaultNamespace
    value: default
```

**Pros:**
- No external service required
- Works in any Kubernetes cluster
- Integrates with RBAC

**Cons:**
- Secrets stored in etcd (need etcd encryption at rest configured)
- No built-in key rotation
- Manual key management
- Not HSM-backed

**Use when:** Staging environments, simple production workloads without strict compliance requirements. Enable etcd encryption at rest and use RBAC to restrict access.

## Azure Key Vault

```yaml
spec:
  type: crypto.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-vault"
  - name: azureClientId
    value: "<managed-identity-id>"
```

**Pros:**
- HSM-backed key storage (Premium SKU)
- Automatic key rotation support
- Full audit logging
- Fine-grained access policies
- Compliance certifications (FIPS 140-2 Level 2; Level 3 with Managed HSM)
- Managed by Azure SLA

**Cons:**
- Azure-specific (lock-in)
- Adds network latency for key operations
- Cost per operation at scale

**Use when:** Azure production workloads, regulated industries (HIPAA, PCI-DSS, SOC 2).

## JWKS Provider

```yaml
spec:
  type: crypto.dapr.jwks
  version: v1
  metadata:
  - name: jwks
    value: "https://your-jwks-server/.well-known/jwks.json"
  - name: minRefreshInterval
    value: "1h"
```

**Pros:**
- Standards-based (RFC 7517)
- Works with existing identity providers (Auth0, Okta, Keycloak)
- Multi-provider key distribution
- Keys can be served from any HTTPS endpoint

**Cons:**
- Public keys only (cannot use for symmetric encryption)
- Dependent on JWKS endpoint availability
- Cache TTL affects key rotation propagation time

**Use when:** Verifying signatures from external parties, integrating with identity providers, or distributing public keys across services.

## Decision Framework

```text
Is this for development or CI testing?
  YES -> Use local storage

Is this for a Kubernetes staging environment?
  YES -> Use Kubernetes secrets with etcd encryption enabled

Are you on Azure?
  YES -> Use Azure Key Vault
    Do you need HSM? -> Premium SKU
    Is this regulated data? -> Premium SKU + access policies

Do you need to verify external signatures or share public keys?
  YES -> Use JWKS

Are you on AWS?
  -> Use AWS KMS via Dapr (community component)

Are you on GCP?
  -> Use GCP Cloud KMS via Dapr (community component)
```

## Switching Providers Without Code Changes

The power of Dapr's abstraction is that you can start with local storage and promote to Azure Key Vault by only changing the component YAML:

```bash
# Development
cp components/dev/crypto-local.yaml components/active/crypto.yaml

# Staging
cp components/staging/crypto-k8s.yaml components/active/crypto.yaml

# Production
cp components/production/crypto-akv.yaml components/active/crypto.yaml
```

Application code calls the same component name (`my-crypto`) in all environments.

## Security Hardening Checklist

```text
- [ ] Production uses HSM-backed provider (Azure Key Vault Premium)
- [ ] Keys are rotated at least annually
- [ ] Key access is restricted to the application's identity only
- [ ] Audit logging is enabled on the key vault
- [ ] etcd encryption is enabled (for Kubernetes secrets provider)
- [ ] Component YAML does not contain credentials (use secret references)
- [ ] Separate keys for different data sensitivity levels
```

## Summary

Choose the Dapr Cryptography provider based on environment and compliance requirements: local storage for development, Kubernetes Secrets for simple staging, and Azure Key Vault (or equivalent cloud KMS) for production regulated workloads. The JWKS provider fills a distinct niche for signature verification and external key distribution. All providers share the same API, making provider upgrades a configuration change rather than a code change.
