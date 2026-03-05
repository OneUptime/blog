# How to Set Up SOPS with Age for Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, SOPS, Age, Secrets Management, GitOps, Encryption

Description: A practical guide to using Mozilla SOPS with Age encryption for managing Kubernetes secrets on Talos Linux clusters.

---

SOPS (Secrets OPerationS) is a tool created by Mozilla for encrypting files while keeping the structure readable. When paired with Age, a modern and simple encryption tool, it becomes a powerful way to manage secrets in GitOps workflows. Unlike Sealed Secrets which creates a custom resource type, SOPS encrypts standard YAML or JSON files in place, making it versatile and easy to integrate with existing tooling.

For Talos Linux users who rely on declarative configurations and Git repositories for cluster management, SOPS with Age provides a clean way to encrypt sensitive values in your manifests while keeping the file structure and non-sensitive keys visible. This guide covers the full setup process.

## Why SOPS with Age

There are several encryption backends that SOPS supports, including PGP, AWS KMS, GCP KMS, Azure Key Vault, and Age. Age stands out for a few reasons:

- It is simple to use with no complex key management infrastructure
- It has a small, auditable codebase
- Key generation is a single command
- No need for cloud provider accounts or external services
- Works great for teams that want local encryption without cloud dependencies

For Talos Linux clusters that might be running on-premises or in environments where cloud KMS is not available, Age is a perfect fit.

## Installing SOPS and Age

Install both tools on your local machine.

```bash
# Install SOPS on macOS
brew install sops

# Install Age on macOS
brew install age

# On Linux, download SOPS binary
SOPS_VERSION=$(curl -s https://api.github.com/repos/getsops/sops/releases/latest | grep tag_name | cut -d '"' -f4)
wget "https://github.com/getsops/sops/releases/download/${SOPS_VERSION}/sops-${SOPS_VERSION}.linux.amd64"
sudo mv sops-${SOPS_VERSION}.linux.amd64 /usr/local/bin/sops
sudo chmod +x /usr/local/bin/sops

# Install Age on Linux
AGE_VERSION=$(curl -s https://api.github.com/repos/FiloSottile/age/releases/latest | grep tag_name | cut -d '"' -f4)
wget "https://github.com/FiloSottile/age/releases/download/${AGE_VERSION}/age-${AGE_VERSION}-linux-amd64.tar.gz"
tar -xzf age-${AGE_VERSION}-linux-amd64.tar.gz
sudo mv age/age /usr/local/bin/
sudo mv age/age-keygen /usr/local/bin/
```

Verify the installations.

```bash
# Check SOPS version
sops --version

# Check Age version
age --version
```

## Generating Age Keys

Generate a key pair for encrypting and decrypting secrets.

```bash
# Generate an Age key pair
age-keygen -o age-key.txt

# View the key file
cat age-key.txt
# Output:
# # created: 2024-01-15T10:30:00Z
# # public key: age1qy3rz5mvad7dp7qcyp5hpnwhxlgp68n6ycxjaa7n4dp6qfkyx9s3tvr4t
# AGE-SECRET-KEY-1QKZLHR8...
```

The file contains both the public key (which you share) and the secret key (which you keep private). Store the secret key securely.

```bash
# Set up the Age key for SOPS to find automatically
mkdir -p ~/.config/sops/age/
cp age-key.txt ~/.config/sops/age/keys.txt

# Or set the environment variable
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
```

## Configuring SOPS

Create a `.sops.yaml` configuration file in your repository root. This tells SOPS which files to encrypt and which Age keys to use.

```yaml
# .sops.yaml
creation_rules:
  # Encrypt all files matching this pattern with the specified Age key
  - path_regex: .*secrets.*\.yaml$
    age: age1qy3rz5mvad7dp7qcyp5hpnwhxlgp68n6ycxjaa7n4dp6qfkyx9s3tvr4t

  # You can have different rules for different paths
  - path_regex: environments/production/.*\.yaml$
    age: age1qy3rz5mvad7dp7qcyp5hpnwhxlgp68n6ycxjaa7n4dp6qfkyx9s3tvr4t

  # Encrypt only specific keys in the YAML
  - path_regex: .*\.enc\.yaml$
    age: age1qy3rz5mvad7dp7qcyp5hpnwhxlgp68n6ycxjaa7n4dp6qfkyx9s3tvr4t
    encrypted_regex: "^(data|stringData)$"
```

The `encrypted_regex` setting is particularly useful for Kubernetes Secrets because it only encrypts the `data` and `stringData` fields while leaving metadata, labels, and other non-sensitive fields readable.

## Encrypting Kubernetes Secrets

Create a Kubernetes Secret manifest.

```yaml
# my-app-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: default
type: Opaque
stringData:
  database-url: "postgresql://admin:secretpass@db.example.com:5432/myapp"
  api-key: "sk_live_abc123def456ghi789"
  redis-password: "r3d1s_p@ssw0rd"
```

Encrypt it with SOPS.

```bash
# Encrypt the file in place
sops --encrypt --in-place my-app-secrets.yaml

# Or encrypt to a new file
sops --encrypt my-app-secrets.yaml > my-app-secrets.enc.yaml
```

The encrypted file preserves the YAML structure but the sensitive values are replaced with encrypted data.

```yaml
# Encrypted output (simplified)
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: default
type: Opaque
stringData:
  database-url: ENC[AES256_GCM,data:wNiGh7rB4K...,type:str]
  api-key: ENC[AES256_GCM,data:q1MdRpN...,type:str]
  redis-password: ENC[AES256_GCM,data:kRl77v...,type:str]
sops:
  age:
    - recipient: age1qy3rz5mvad7dp7qcyp5hpnwhxlgp68n6ycxjaa7n4dp6qfkyx9s3tvr4t
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2024-01-15T10:45:00Z"
  version: 3.8.1
```

## Decrypting and Applying Secrets

To apply the encrypted secret to your Talos Linux cluster, decrypt and pipe it to kubectl.

```bash
# Decrypt and apply in one step
sops --decrypt my-app-secrets.yaml | kubectl apply -f -

# Or decrypt to see the contents
sops --decrypt my-app-secrets.yaml
```

To edit an encrypted file, SOPS opens it in your editor with the values decrypted, then re-encrypts when you save.

```bash
# Edit an encrypted file (opens in $EDITOR)
sops my-app-secrets.yaml
```

## Integrating with Flux on Talos Linux

Flux has native SOPS support, making it straightforward to use encrypted secrets in a GitOps workflow on Talos Linux.

First, create a Kubernetes secret containing the Age private key for Flux to use.

```bash
# Create the decryption secret for Flux
kubectl create secret generic sops-age \
  --namespace flux-system \
  --from-file=age.agekey=age-key.txt
```

Configure your Flux Kustomization to use SOPS decryption.

```yaml
# flux-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-repo
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Now you can commit encrypted secret files to your Git repository. When Flux syncs, it will automatically decrypt them before applying to the cluster.

## Integrating with ArgoCD on Talos Linux

For ArgoCD users, you need to install the SOPS plugin.

```yaml
# argocd-cm configmap patch
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  configManagementPlugins: |
    - name: sops
      generate:
        command: ["bash", "-c"]
        args:
          - |
            for f in *.yaml; do
              if grep -q "sops:" "$f"; then
                sops --decrypt "$f"
              else
                cat "$f"
              fi
            done
```

You also need to make the Age key available to ArgoCD by mounting it as a secret into the repo-server pods.

## Working with Multiple Keys

For team environments, you might want to encrypt secrets with multiple Age keys so that different team members can decrypt them.

```bash
# Generate keys for each team member
age-keygen -o alice-key.txt  # Alice's key
age-keygen -o bob-key.txt    # Bob's key

# Update .sops.yaml with multiple recipients
```

```yaml
# .sops.yaml with multiple recipients
creation_rules:
  - path_regex: .*secrets.*\.yaml$
    age: >-
      age1qy3rz5mvad7dp7qcyp5hpnwhxlgp68n6ycxjaa7n4dp6qfkyx9s3tvr4t,
      age1rl8j6mv9hmc5cjhm67z4hp0afrfkgnpml8sktdq5z0waqxy3p8q2n7p2s
```

Any of the listed key holders can decrypt the files.

## Key Rotation

To rotate your Age keys, generate a new key pair and update the SOPS configuration.

```bash
# Generate a new key
age-keygen -o new-age-key.txt

# Update .sops.yaml with the new public key
# Then rotate all encrypted files
find . -name "*.enc.yaml" -o -name "*secrets*.yaml" | while read f; do
  if grep -q "sops:" "$f"; then
    sops updatekeys "$f" --yes
  fi
done
```

## Wrapping Up

SOPS with Age gives you a lightweight but powerful approach to secrets management for Talos Linux clusters. It works well in both GitOps and manual workflows, does not require any in-cluster components for the encryption itself, and integrates natively with tools like Flux. The combination of SOPS for structured encryption and Age for simple key management removes much of the complexity typically associated with secret handling. For Talos Linux users who value simplicity and security, this is one of the most practical approaches to keeping sensitive data safe in your deployment pipelines.
