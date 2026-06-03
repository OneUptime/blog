# How to Configure Vault Seal Wrap for Extra Secret Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Security, Encryption, Seal Wrap, Kubernetes

Description: Learn how to implement HashiCorp Vault seal wrap functionality for enhanced secret protection, adding an extra layer of encryption for your most sensitive data in Kubernetes environments.

---

HashiCorp Vault Enterprise and HCP Vault Dedicated seal wrap provides an additional layer of encryption protection for highly sensitive data. While Vault encrypts all data at rest using its barrier, seal wrap can add FIPS 140-2/3-aligned encryption using a supported seal mechanism. This creates defense-in-depth protection for your most critical secrets. This guide explains how to configure and use seal wrap in Kubernetes deployments.

## Understanding Seal Wrap

Vault normally encrypts data using its encryption barrier, which uses AES-256-GCM. When seal wrap is enabled for a mount, Vault adds another encryption layer using the seal mechanism before writing selected values to storage. This means data protected by seal wrap requires both Vault's barrier key material and access to the configured seal to decrypt.

The seal key material is managed by the seal mechanism (HSM, cloud KMS, or auto-unseal provider). Even if an attacker compromises Vault's storage backend and barrier keys, they cannot decrypt seal-wrapped data without access to the seal.

Seal wrap is particularly valuable for compliance requirements like FIPS 140-2/3, PCI-DSS, and HIPAA, especially when your deployment requires a FIPS-certified HSM or a supported cloud KMS for sensitive data.

## Configuring Auto-Unseal for Seal Wrap

Seal wrap requires Vault Enterprise or HCP Vault Dedicated and a supported auto seal. Here's how to set up auto-unseal with AWS KMS in Kubernetes:

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
# Enable KV v2 with seal wrap at mount time
vault secrets enable -path=sensitive-data -seal-wrap kv-v2

# Verify seal wrap is enabled
vault secrets list -detailed
```

The output shows seal wrap status:

```text
Path              Type    Seal Wrap
----              ----    ---------
sensitive-data/   kv      true
secret/           kv      false
```

## Configuring Seal Wrap for Transit Encryption

The Transit secrets engine benefits significantly from seal wrap:

```bash
# Enable Transit with seal wrap
vault secrets enable -seal-wrap transit

# Create encryption key with seal wrap
vault write transit/keys/payment-data \
    type=aes256-gcm96 \
    allow_plaintext_backup=false
```

Transit key material and policy data stored by the engine are now protected by seal wrap. This ensures encryption keys do not exist unprotected in storage.

## Using Seal Wrap with PKI Secrets Engine

Protect CA private keys with seal wrap:

```bash
# Enable PKI with seal wrap
vault secrets enable -seal-wrap pki

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

Now CA issuer keys stored by the PKI engine are protected by seal wrap. Leaf certificate private keys generated through `pki/issue/*` are returned to the client and are not stored by Vault.

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

## Configuring Access Policies

Create policies that restrict access to seal-wrapped mounts:

```hcl
# Policy for the seal-wrapped KV v2 mount
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

Seal wrap must be enabled when a secrets engine is mounted, so existing unwrapped mounts require migration to a new seal-wrapped mount:

```bash
# Enable a new seal-wrapped mount
vault secrets enable -path=sensitive-data -seal-wrap kv-v2

# Copy data from the old mount to the new mount
vault kv get -format=json secret/app | \
    jq '.data.data' > app.json
vault kv put sensitive-data/app @app.json
```

For KV v2, you can recursively copy secrets from an existing mount into the new seal-wrapped mount:

```python
import hvac
import time

def migrate_to_seal_wrap(client, source_mount, destination_mount, path=""):
    # List all secrets under the current prefix
    secrets = client.secrets.kv.v2.list_secrets(path=path, mount_point=source_mount)

    for secret_key in secrets["data"]["keys"]:
        full_path = f"{path}{secret_key}"
        if secret_key.endswith("/"):
            migrate_to_seal_wrap(client, source_mount, destination_mount, full_path)
            continue

        try:
            # Read secret
            secret = client.secrets.kv.v2.read_secret_version(
                path=full_path,
                mount_point=source_mount
            )

            # Write to the seal-wrapped destination mount
            client.secrets.kv.v2.create_or_update_secret(
                path=full_path,
                secret=secret["data"]["data"],
                mount_point=destination_mount
            )

            print(f"Migrated {full_path}")
            time.sleep(0.1)  # Rate limiting

        except Exception as e:
            print(f"Failed to migrate {full_path}: {e}")

# Usage
client = hvac.Client(url="http://vault:8200", token="root-token")
migrate_to_seal_wrap(client, "secret", "sensitive-data")
```

## Monitoring Seal Wrap Operations

Track access to seal-wrapped mounts with audit logs:

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Query requests to known seal-wrapped mounts
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select((.request.path? // "") as $p | ($p | startswith("sensitive-data/")) or ($p | startswith("transit/")) or ($p | startswith("pki/")))'
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

      - alert: VaultMetricsMissing
        expr: absent(vault_core_unsealed)
        labels:
          severity: critical
        annotations:
          summary: "Vault telemetry is unavailable"
```

## Handling Seal Wrap in Disaster Recovery

Document seal wrap requirements for DR procedures:

```bash
# Back up Vault storage
vault operator raft snapshot save backup.snap

# Store the seal configuration securely outside the snapshot
kubectl get configmap vault-config -n vault-system -o yaml > vault-config-backup.yaml

# When restoring, the seal configuration must match
vault operator raft snapshot restore backup.snap

# If changing KMS or seal types, update the seal stanza and follow the seal migration procedure
vault operator unseal -migrate
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

Seal wrap adds backend-dependent overhead. Benchmark typical operations:

```bash
# Without seal wrap
vault secrets enable -path=normal kv-v2

# With seal wrap
vault secrets enable -path=wrapped -seal-wrap kv-v2

# Benchmark writes
time for i in {1..1000}; do
  vault kv put normal/test$i value=data
done

time for i in {1..1000}; do
  vault kv put wrapped/test$i value=data
done
```

The overhead depends on the seal backend and latency to the HSM or KMS. Remote seals can be much slower for values that must be wrapped or unwrapped, although Vault caches unwrapped values in memory while they remain protected by the encryption barrier.

## Best Practices

Enable seal wrap for secrets engines storing sensitive data: KV paths with PII or credentials, Transit encryption keys, PKI CA private keys, and database root credentials.

Always use a supported auto seal in production when using seal wrap. Shamir seals do not support seal wrap.

Document which paths use seal wrap in your organization's security policies. This ensures teams understand protection levels for different data.

Test disaster recovery procedures regularly. Ensure you can restore seal-wrapped data in failure scenarios.

Monitor KMS/HSM availability closely. If the seal provider is unavailable, Vault cannot access seal-wrapped data.

## Conclusion

Seal wrap provides defense-in-depth encryption for Vault's most sensitive data. By leveraging supported auto-unseal providers, you can meet FIPS 140-2/3-oriented requirements and improve protection against storage backend compromise. While seal wrap adds performance overhead that depends on the seal backend, the security benefits make it important for production deployments handling highly sensitive information.

Implement seal wrap for critical paths in your Vault deployment to meet compliance requirements and strengthen your overall security posture.
