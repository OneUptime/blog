# How to Use .sops.yaml Configuration File with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secrets, SOPS, Configuration

Description: Learn how to configure the .sops.yaml file to define encryption rules for consistent secret management across your Flux CD repository.

---

The `.sops.yaml` configuration file is a powerful feature of SOPS that defines creation rules for automatic encryption. When placed in a Git repository managed by Flux CD, it ensures that all team members encrypt secrets consistently without needing to remember specific key identifiers or encryption flags. This guide covers the full range of `.sops.yaml` configuration options.

## What is .sops.yaml?

The `.sops.yaml` file is a SOPS configuration file that defines `creation_rules`. These rules determine which encryption keys and settings to use based on the file path. When you run `sops --encrypt` without specifying a key, SOPS looks for a `.sops.yaml` file in the current directory or any parent directory.

## Basic Configuration

A minimal `.sops.yaml` file with a single rule that applies to all encrypted files.

```yaml
# .sops.yaml - Basic configuration with Age encryption
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

With this file in place, encrypting becomes a one-step process.

```bash
# Encrypt without specifying any key or regex flags
sops --encrypt secret.yaml > secret.enc.yaml
```

## Understanding creation_rules

The `creation_rules` list is evaluated in order. The first rule whose `path_regex` matches the file being encrypted is used. This allows you to define different rules for different directories or file patterns.

### Path-Based Rules

Use `path_regex` to match files based on their path relative to the `.sops.yaml` location.

```yaml
# .sops.yaml - Path-based rules for different environments
creation_rules:
  # Production secrets use AWS KMS
  - path_regex: clusters/production/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/prod-key-id

  # Staging secrets use a different KMS key
  - path_regex: clusters/staging/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/staging-key-id

  # Development secrets use Age for simplicity
  - path_regex: clusters/dev/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1devkey...

  # Default rule for anything else
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1defaultkey...
```

### The encrypted_regex Field

The `encrypted_regex` field controls which top-level YAML keys get encrypted. For Kubernetes secrets, you typically want to encrypt only `data` and `stringData`.

```yaml
# .sops.yaml - Different encrypted_regex patterns
creation_rules:
  # Standard Kubernetes secrets - encrypt data and stringData
  - path_regex: .*secret.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1key...

  # ConfigMaps with sensitive data - encrypt the data field
  - path_regex: .*configmap.*\.enc\.yaml$
    encrypted_regex: ^(data)$
    age: age1key...

  # Encrypt everything (not recommended for Kubernetes manifests)
  - path_regex: .*\.enc\.json$
    age: age1key...
```

## Multiple Key Providers

You can specify multiple keys from different providers for a single rule, providing redundancy and supporting multi-team workflows.

```yaml
# .sops.yaml - Multiple recipients for the same files
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    # Age keys for individual developers
    age: >-
      age1alice...,
      age1bob...,
      age1serviceaccount...
    # AWS KMS key for the CI/CD pipeline
    kms: arn:aws:kms:us-east-1:123456789012:key/<key-id>
```

## Cloud KMS Configurations

### AWS KMS with Role Assumption

Configure AWS KMS with a specific role to assume.

```yaml
# .sops.yaml - AWS KMS with role assumption
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/<key-id>+arn:aws:iam::123456789012:role/sops-role
```

### Azure Key Vault

Configure Azure Key Vault keys.

```yaml
# .sops.yaml - Azure Key Vault
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    azure_keyvault: https://my-vault.vault.azure.net/keys/sops-key/version-id
```

### Google Cloud KMS

Configure Google Cloud KMS keys.

```yaml
# .sops.yaml - Google Cloud KMS
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    gcp_kms: projects/my-project/locations/global/keyRings/flux-sops/cryptoKeys/sops-key
```

### HashiCorp Vault Transit

Configure Vault Transit keys.

```yaml
# .sops.yaml - HashiCorp Vault Transit
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    hc_vault_transit_uri: https://vault.example.com/v1/transit/keys/flux-sops
```

## File Placement and Hierarchy

SOPS searches for `.sops.yaml` starting from the encrypted file's directory and walking up to the root. You can place multiple `.sops.yaml` files at different levels for hierarchical configuration.

```bash
# Repository layout with multiple .sops.yaml files
repo/
  .sops.yaml                    # Default rules (fallback)
  clusters/
    production/
      .sops.yaml                # Production-specific rules
      secrets/
        db-secret.enc.yaml      # Uses production rules
    staging/
      .sops.yaml                # Staging-specific rules
      secrets/
        db-secret.enc.yaml      # Uses staging rules
```

## Complete Multi-Environment Example

A comprehensive `.sops.yaml` for a multi-environment Flux CD repository.

```yaml
# .sops.yaml - Complete multi-environment configuration
creation_rules:
  # Production: AWS KMS + team lead Age key for emergency access
  - path_regex: clusters/production/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/prod-key
    age: age1teamlead...

  # Staging: AWS KMS with staging key
  - path_regex: clusters/staging/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/staging-key

  # Development: Age keys for all developers
  - path_regex: clusters/dev/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1dev1...,
      age1dev2...,
      age1dev3...

  # Catch-all rule to prevent unencrypted secrets
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1default...
```

## Validating Your Configuration

Test your `.sops.yaml` configuration by encrypting a test file and verifying the correct key was used.

```bash
# Create a test secret
cat > test-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: test
  namespace: default
type: Opaque
stringData:
  key: value
EOF

# Encrypt and verify the correct key was applied
sops --encrypt test-secret.yaml > test-secret.enc.yaml

# Check which keys were used for encryption
sops --decrypt --extract '["sops"]' test-secret.enc.yaml

# Clean up
rm test-secret.yaml test-secret.enc.yaml
```

## Best Practices

1. **Place `.sops.yaml` at the repository root** for a single source of truth.
2. **Use `encrypted_regex`** to keep metadata readable in Git diffs.
3. **Order rules from most specific to least specific** since the first match wins.
4. **Include a catch-all rule** at the end to prevent accidentally encrypting with the wrong key.
5. **Commit `.sops.yaml` to Git** so all team members share the same configuration.
6. **Use multiple recipients** so that secrets can be decrypted by both humans and automated systems.

A well-configured `.sops.yaml` file is the foundation of a smooth secrets management workflow with SOPS and Flux CD.
