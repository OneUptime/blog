# How to Configure Vault Seal Wrap for Extra Secret Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Security, Encryption, Seal Wrap, Kubernetes

Description: Learn how to implement HashiCorp Vault seal wrap functionality for enhanced secret protection, adding an extra layer of encryption for your most sensitive data in Kubernetes environments.

---

HashiCorp Vault seal wrap provides an additional layer of encryption protection for highly sensitive data. While Vault encrypts all data at rest using its barrier, seal wrap adds FIPS 140-2 compliant encryption using the seal mechanism itself. This creates defense-in-depth protection for your most critical secrets. This guide explains how to configure and use seal wrap in Kubernetes deployments.

## Understanding Seal Wrap

Vault normally encrypts data using its encryption barrier, which uses AES-256-GCM. When seal wrap is enabled for specific paths, Vault adds another encryption layer using the seal key before writing to storage. This means data protected by seal wrap requires both the encryption key and the seal key to decrypt.

The seal key never leaves the seal mechanism (HSM, cloud KMS, or auto-unseal provider). Even if an attacker compromises Vault's storage backend and encryption keys, they cannot decrypt seal-wrapped data without access to the seal.

Seal wrap is particularly valuable for compliance requirements like FIPS 140-2, PCI-DSS, and HIPAA, where regulations mandate hardware-backed encryption for sensitive data.

## Configuring Auto-Unseal for Seal Wrap

Seal wrap requires auto-unseal configuration. Here's how to set up auto-unseal with AWS KMS in Kubernetes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-config
  namespace: vault-system
data:
  vault.hcl: |
    ui = true

    listener "tcp" {
      address = "0.0.0.0:8200"
      tls_disable = 1
    }

    storage "raft" {
      path = "/vault/data"
      node_id = "vault-0"
    }

    seal "awskms" {
      region     = "us-east-1"
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123-def"
      endpoint   = "https://kms.us-east-1.amazonaws.com"
    }

    api_addr = "http://vault.vault-system.svc.cluster.local:8200"
    cluster_addr = "https://vault-0.vault.vault-system.svc.cluster.local:8201"
```

For Google Cloud KMS:

```hcl
seal "gcpckms" {
  project     = "my-gcp-project"
  region      = "us-east1"
  key_ring    = "vault-keyring"
  crypto_key  = "vault-key"
}
```

For Azure Key Vault:

```hcl
seal "azurekeyvault" {
  tenant_id      = "tenant-uuid"
  client_id      = "client-uuid"
  client_secret  = "client-secret"
  vault_name     = "my-keyvault"
  key_name       = "vault-key"
}
```

## Enabling Seal Wrap for KV Secrets

Enable seal wrap when mounting secrets engines:

```bash
# Enable KV v2 with seal wrap
vault secrets enable -path=sensitive-data kv-v2

# Enable seal wrap for specific paths
vault secrets tune -seal-wrap=true sensitive-data

# Verify seal wrap is enabled
vault secrets list -detailed
```

The output shows seal wrap status:

```
Path              Type    Seal Wrap
----              ----    ---------
sensitive-data/   kv      true
secret/           kv      false
```

## Configuring Seal Wrap for Transit Encryption

The Transit secrets engine benefits significantly from seal wrap:

```bash
# Enable Transit with seal wrap
vault secrets enable transit
vault secrets tune -seal-wrap=true transit

# Create encryption key with seal wrap
vault write transit/keys/payment-data \
    type=aes256-gcm96 \
    allow_plaintext_backup=false
```

All encryption keys in the Transit engine are now protected by seal wrap. This ensures private keys never exist unprotected in storage.

## Using Seal Wrap with PKI Secrets Engine

Protect certificate private keys with seal wrap:

```bash
# Enable PKI with seal wrap
vault secrets enable pki
vault secrets tune -seal-wrap=true pki

# Generate root CA
vault write pki/root/generate/internal \
    common_name="Example Root CA" \
    ttl=87600h

# Configure CA and CRL URLs
vault write pki/config/urls \
    issuing_certificates="http://vault.vault-system:8200/v1/pki/ca" \
    crl_distribution_points="http://vault.vault-system:8200/v1/pki/crl"

# Create role
vault write pki/roles/example-dot-com \
    allowed_domains=example.com \
    allow_subdomains=true \
    max_ttl=72h
```

Now all private keys for issued certificates are protected by seal wrap.

## Implementing Seal Wrap in Application Code

Applications don't need special code to benefit from seal wrap. Here's how to use seal-wrapped secrets:

```go
package main

import (
    "fmt"
    "github.com/hashicorp/vault/api"
)

func readSealWrappedSecret(vaultAddr, token, path string) (map[string]interface{}, error) {
    config := api.DefaultConfig()
    config.Address = vaultAddr

    client, err := api.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create client: %w", err)
    }

    client.SetToken(token)

    // Read secret (seal wrap is transparent)
    secret, err := client.Logical().Read(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read secret: %w", err)
    }

    if secret == nil || secret.Data == nil {
        return nil, fmt.Errorf("secret not found")
    }

    // For KV v2, data is nested
    data, ok := secret.Data["data"].(map[string]interface{})
    if !ok {
        // Might be KV v1 or other engine
        data = secret.Data
    }

    return data, nil
}

func writeSealWrappedSecret(vaultAddr, token, path string, data map[string]interface{}) error {
    config := api.DefaultConfig()
    config.Address = vaultAddr

    client, err := api.NewClient(config)
    if err != nil {
        return fmt.Errorf("failed to create client: %w", err)
    }

    client.SetToken(token)

    // Write secret (seal wrap is transparent)
    _, err = client.Logical().Write(path, map[string]interface{}{
        "data": data,
    })
    if err != nil {
        return fmt.Errorf("failed to write secret: %w", err)
    }

    return nil
}
```

## Configuring Seal Wrap Policies

Create policies that enforce seal wrap usage:

```hcl
# Policy requiring seal-wrapped storage
path "sensitive-data/data/*" {
  capabilities = ["create", "read", "update", "delete"]
  required_parameters = ["data"]
}

# Allow reading transit keys (seal-wrapped)
path "transit/keys/*" {
  capabilities = ["read"]
}

# Allow using transit encryption
path "transit/encrypt/*" {
  capabilities = ["update"]
}

path "transit/decrypt/*" {
  capabilities = ["update"]
}
```

Apply the policy:

```bash
vault policy write seal-wrap-policy policy.hcl

vault write auth/kubernetes/role/secure-app \
    bound_service_account_names=secure-app \
    bound_service_account_namespaces=production \
    policies=seal-wrap-policy \
    ttl=1h
```

## Migrating Existing Data to Seal Wrap

Enable seal wrap for existing mounts requires migration:

```bash
# First, enable seal wrap on the mount
vault secrets tune -seal-wrap=true secret/

# Force rewrap of all data
vault operator rekey -target=recovery -init
```

For KV v2, you can read and rewrite secrets to apply seal wrap:

```python
import hvac
import time

def migrate_to_seal_wrap(client, mount_path):
    # List all secrets
    secrets = client.secrets.kv.v2.list_secrets(path="", mount_point=mount_path)

    for secret_key in secrets['data']['keys']:
        try:
            # Read secret
            secret = client.secrets.kv.v2.read_secret_version(
                path=secret_key.rstrip('/'),
                mount_point=mount_path
            )

            # Rewrite secret (will be seal-wrapped)
            client.secrets.kv.v2.create_or_update_secret(
                path=secret_key.rstrip('/'),
                secret=secret['data']['data'],
                mount_point=mount_path
            )

            print(f"Migrated {secret_key}")
            time.sleep(0.1)  # Rate limiting

        except Exception as e:
            print(f"Failed to migrate {secret_key}: {e}")

# Usage
client = hvac.Client(url='http://vault:8200', token='root-token')
migrate_to_seal_wrap(client, 'sensitive-data')
```

## Monitoring Seal Wrap Operations

Track seal wrap operations with audit logs:

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Query seal wrap operations
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select(.request.mount_type != null and .request.seal_wrap == true)'
```

Set up Prometheus alerts for seal issues:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-vault-seal-alerts
  namespace: monitoring
data:
  seal-alerts.yaml: |
    groups:
    - name: vault-seal
      rules:
      - alert: VaultSealError
        expr: vault_core_unsealed == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vault is sealed"

      - alert: VaultAutoUnsealFailure
        expr: rate(vault_core_auto_unseal_failures_total[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Auto-unseal failing"
```

## Handling Seal Wrap in Disaster Recovery

Document seal wrap requirements for DR procedures:

```bash
# Backup must include seal configuration
vault operator raft snapshot save backup.snap

# When restoring, seal configuration must match
vault operator raft snapshot restore backup.snap

# If using different KMS, update seal configuration
vault seal migrate -config=/vault/config/new-seal.hcl
```

Create a disaster recovery runbook:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-dr-runbook
  namespace: vault-system
data:
  recovery-steps.md: |
    # Vault Seal Wrap DR Procedures

    ## Prerequisites
    - Access to KMS/HSM used for seal wrap
    - Vault root token or recovery keys
    - Current seal configuration

    ## Recovery Steps
    1. Verify KMS availability
    2. Deploy Vault with matching seal config
    3. Restore Raft snapshot
    4. Verify seal status: vault status
    5. Test seal-wrapped secret access

    ## Validation
    - Confirm all seal-wrapped mounts accessible
    - Verify auto-unseal functioning
    - Check audit logs for errors
```

## Performance Considerations

Seal wrap adds minimal overhead. Benchmark typical operations:

```bash
# Without seal wrap
vault secrets enable -path=normal kv-v2

# With seal wrap
vault secrets enable -path=wrapped kv-v2
vault secrets tune -seal-wrap=true wrapped

# Benchmark writes
time for i in {1..1000}; do
  vault kv put normal/test$i value=data
done

time for i in {1..1000}; do
  vault kv put wrapped/test$i value=data
done
```

Typical overhead is 5-10% for write operations and negligible for reads.

## Best Practices

Enable seal wrap for secrets engines storing sensitive data: KV paths with PII or credentials, Transit encryption keys, PKI private keys, and database root credentials.

Always use auto-unseal in production when using seal wrap. Manual unsealing defeats the purpose of seal wrap protection.

Document which paths use seal wrap in your organization's security policies. This ensures teams understand protection levels for different data.

Test disaster recovery procedures regularly. Ensure you can restore seal-wrapped data in failure scenarios.

Monitor KMS/HSM availability closely. If the seal provider is unavailable, Vault cannot access seal-wrapped data.

## Conclusion

Seal wrap provides defense-in-depth encryption for Vault's most sensitive data. By leveraging hardware-backed encryption through auto-unseal providers, you gain FIPS 140-2 compliance and protection against storage backend compromise. While seal wrap adds a small performance overhead, the security benefits make it essential for production deployments handling highly sensitive information.

Implement seal wrap for critical paths in your Vault deployment to meet compliance requirements and strengthen your overall security posture.
