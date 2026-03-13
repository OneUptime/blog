# How to Configure SOPS Creation Rules in .sops.yaml for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Configuration, Age

Description: A comprehensive guide to configuring SOPS creation rules in .sops.yaml to control how secrets are encrypted across your Flux GitOps repository.

---

The `.sops.yaml` configuration file is central to how SOPS encrypts and manages secrets in your repository. Creation rules define which encryption keys, algorithms, and settings apply to which files. Getting this configuration right is essential for a well-organized Flux GitOps workflow. This guide covers everything you need to know about SOPS creation rules.

## What Are Creation Rules

Creation rules in `.sops.yaml` tell SOPS how to encrypt files. When you run `sops --encrypt`, it checks the creation rules to determine which encryption keys and settings to use based on the file path. Rules are evaluated in order, and the first matching rule is applied.

## Basic .sops.yaml Structure

A minimal `.sops.yaml` file looks like this:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

This single rule applies age encryption to every YAML file in the repository.

## Rule Matching Order

Rules are evaluated from top to bottom. The first rule whose `path_regex` matches the file path is used. Place more specific rules before general ones:

```yaml
creation_rules:
  # Most specific: production database secrets
  - path_regex: clusters/production/database/.*\.yaml$
    age: age1proddbkey...

  # Specific: all production secrets
  - path_regex: clusters/production/.*\.yaml$
    age: age1prodkey...

  # General: everything else
  - path_regex: .*\.yaml$
    age: age1devkey...
```

If a file at `clusters/production/database/creds.yaml` is encrypted, the first rule matches and `age1proddbkey` is used. A file at `clusters/production/app.yaml` matches the second rule.

## Specifying Encrypted Keys

By default, SOPS encrypts all values in a YAML file. You can use `encrypted_regex` or `encrypted_suffix` to control which keys get encrypted:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1key...
    encrypted_regex: ^(data|stringData)$
```

This tells SOPS to only encrypt values under the `data` or `stringData` keys, which is ideal for Kubernetes Secrets where you want metadata to remain readable.

You can also use `encrypted_suffix`:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1key...
    encrypted_suffix: _encrypted
```

With this setting, only keys ending with `_encrypted` will have their values encrypted.

## Unencrypted Suffixes and Regex

The inverse approach uses `unencrypted_suffix` or `unencrypted_regex` to specify which keys should remain in plaintext:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1key...
    unencrypted_suffix: _unencrypted
```

Keys ending with `_unencrypted` will remain as plaintext, while everything else gets encrypted.

## Multiple Encryption Providers

You can mix encryption providers within a single rule:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1key1...,age1key2...
    kms: arn:aws:kms:us-east-1:123456789:key/abcd-1234
    gcp_kms: projects/myproject/locations/global/keyRings/myring/cryptoKeys/mykey
```

SOPS encrypts the data key for each provider, so any one of them can decrypt the file.

## Setting MAC Algorithm

You can specify the MAC (Message Authentication Code) algorithm:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1key...
    mac_only_encrypted: true
```

When `mac_only_encrypted` is true, the MAC is computed only over the encrypted values rather than the entire file. This is useful when non-sensitive metadata changes should not affect the MAC.

## Environment-Specific Rules

A practical pattern for Flux multi-cluster setups:

```yaml
creation_rules:
  # Development cluster
  - path_regex: clusters/dev/.*secrets.*\.yaml$
    age: age1devkey...
    encrypted_regex: ^(data|stringData)$

  # Staging cluster
  - path_regex: clusters/staging/.*secrets.*\.yaml$
    age: age1stagingkey...
    encrypted_regex: ^(data|stringData)$

  # Production cluster
  - path_regex: clusters/production/.*secrets.*\.yaml$
    age: age1prodkey1...,age1prodkey2...
    encrypted_regex: ^(data|stringData)$

  # Shared secrets
  - path_regex: base/.*secrets.*\.yaml$
    age: age1sharedkey...
    encrypted_regex: ^(data|stringData)$
```

## Placing .sops.yaml in Your Repository

The `.sops.yaml` file should be placed at the root of your Git repository. SOPS searches for it starting from the file being encrypted and walking up the directory tree. You can also place `.sops.yaml` files in subdirectories to override the root configuration for specific paths.

```
flux-repo/
  .sops.yaml           # Root configuration
  clusters/
    production/
      .sops.yaml        # Override for production
      secrets/
        app-secret.yaml
    staging/
      secrets/
        app-secret.yaml  # Uses root .sops.yaml
```

## Validating Your Configuration

Test that your creation rules work correctly before committing:

```bash
# Dry run to see which rule matches
sops --encrypt --verbose test-secret.yaml 2>&1 | head -20

# Encrypt and then decrypt to verify round-trip
sops --encrypt test-secret.yaml > encrypted.yaml
sops --decrypt encrypted.yaml
```

## Common Mistakes

Avoid these common pitfalls. Placing a general catch-all rule before specific rules causes the specific rules to never match. Forgetting `encrypted_regex` means SOPS encrypts the entire file including metadata, making it hard to review in pull requests. Using inconsistent path patterns between `.sops.yaml` and your actual directory structure leads to encryption failures.

## Conclusion

Properly configured creation rules in `.sops.yaml` are the foundation of secret management in a Flux GitOps repository. By carefully ordering rules, selecting appropriate encryption scopes, and matching file paths to environments, you create a maintainable and secure secrets workflow. Take the time to plan your rule hierarchy before scaling your Flux deployment.
