# How to Configure SOPS with Key Groups for Quorum-Based Decryption in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Key Groups, Quorum, Security

Description: Learn how to configure SOPS key groups in Flux to require multiple keys for decryption, implementing quorum-based secret access for enhanced security.

---

SOPS supports key groups, a feature that lets you require multiple keys from different groups to decrypt a secret. Instead of any single key being sufficient, you can enforce that a minimum number of key groups must participate in decryption. This is a powerful security pattern for high-sensitivity environments. This guide explains how to set up quorum-based decryption with SOPS and Flux.

## Understanding Key Groups

In standard SOPS configuration, all keys are placed in a single group, and any one key can decrypt the data. With key groups, you organize keys into separate groups and set a threshold (called `shamir_threshold`) that defines how many groups must contribute a key for decryption to succeed.

For example, with three key groups and a threshold of two, at least one key from two different groups must be available to decrypt the secret.

## Prerequisites

Make sure you have the following ready:

- A Kubernetes cluster with Flux installed
- The `sops` CLI tool version 3.7 or later
- The `age` key generation tool
- `kubectl` access to your cluster

## Generating Keys for Each Group

Create keys for three distinct groups representing different organizational roles:

```bash
# Security team keys
age-keygen -o security-team-1.agekey
age-keygen -o security-team-2.agekey

# Operations team keys
age-keygen -o ops-team-1.agekey

# Platform team keys
age-keygen -o platform-team-1.agekey
```

Record the public keys from each command output. You will use them in the SOPS configuration.

## Configuring Key Groups in .sops.yaml

Define key groups in your `.sops.yaml` file with a `shamir_threshold`:

```yaml
creation_rules:
  - path_regex: secrets/.*\.yaml$
    shamir_threshold: 2
    key_groups:
      - age:
          - age1securityteam1...
          - age1securityteam2...
      - age:
          - age1opsteam1...
      - age:
          - age1platformteam1...
```

This configuration creates three key groups. The `shamir_threshold` of 2 means that keys from at least two of the three groups are required to decrypt the file.

## Encrypting Secrets with Key Groups

Create and encrypt a secret:

```bash
cat <<EOF > secrets/database-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  db-host: db.example.com
  db-user: appuser
  db-password: complexpassword123
EOF

sops --encrypt --in-place secrets/database-credentials.yaml
```

SOPS splits the data key using Shamir's Secret Sharing and encrypts each share with the keys in the corresponding group.

## Inspecting Key Group Metadata

After encryption, examine the SOPS metadata to confirm key groups are configured:

```bash
cat secrets/database-credentials.yaml | grep -A 50 "sops:"
```

You will see separate key entries organized by group index, confirming that Shamir secret sharing is in use.

## Configuring Flux for Quorum Decryption

For Flux to decrypt secrets with key groups, you must provide private keys from enough groups to meet the threshold. Create a Kubernetes secret containing keys from at least two groups:

```bash
# Combine keys from two groups into a single file
cat security-team-1.agekey ops-team-1.agekey > combined-keys.agekey

kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=combined-keys.agekey
```

Configure the Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Testing Quorum Decryption Locally

Verify that a single group key cannot decrypt the file:

```bash
# This should fail - only one group represented
SOPS_AGE_KEY_FILE=security-team-1.agekey sops --decrypt secrets/database-credentials.yaml
# Error: could not decrypt data key

# This should succeed - two groups represented
SOPS_AGE_KEY_FILE=combined-keys.agekey sops --decrypt secrets/database-credentials.yaml
```

The first command fails because it only satisfies one key group. The second command succeeds because keys from two groups are present, meeting the `shamir_threshold` of 2.

## Practical Use Cases

Quorum-based decryption works well for separation of duties. You can require both the security team and operations team to participate in accessing production secrets. It also provides protection against insider threats, as no single team can independently access sensitive data.

A common pattern is to use a threshold of 2 with 3 groups:

```yaml
creation_rules:
  - path_regex: production/.*\.yaml$
    shamir_threshold: 2
    key_groups:
      - age:
          - age1securityteam...
      - age:
          - age1opsteam...
      - age:
          - age1management...
```

This ensures that any two of the three teams can collaborate to access secrets, while no single team can do so alone.

## Key Rotation with Key Groups

When rotating keys in a key group, update the `.sops.yaml` file and re-encrypt:

```bash
sops updatekeys secrets/database-credentials.yaml
```

This command re-encrypts the data key shares for the updated key groups without changing the underlying secret values.

## Best Practices

Set the threshold to balance security with operational practicality. A threshold equal to the total number of groups provides maximum security but requires all groups to participate. Document which keys belong to which groups and ensure each group has a secure key backup process. Test decryption with different key combinations to verify the threshold behavior before deploying to production.

## Conclusion

Key groups with quorum-based decryption add a layer of organizational security to your SOPS-managed secrets in Flux. By requiring keys from multiple groups, you implement separation of duties and reduce the risk of unauthorized access. Flux handles the decryption transparently as long as the cluster has access to keys from enough groups to meet the threshold.
