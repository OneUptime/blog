# How to Use SOPS with Age Encryption for Kubernetes Secrets in Git

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Encryption, GitOps

Description: Learn how to use Mozilla SOPS with Age encryption to securely store Kubernetes secrets in Git repositories, enabling GitOps workflows with encrypted configuration files.

---

Storing secrets in Git requires encryption, but managing PGP keys or cloud KMS services adds complexity. Age provides simple, modern encryption with small keys that are easy to manage, while SOPS handles the encryption and decryption of YAML files while preserving their structure.

Together, SOPS and Age enable secure secret storage in Git without complex key management infrastructure. You can encrypt entire Kubernetes manifests or just the secret values, commit them safely to Git, and decrypt them during deployment.

In this guide, you'll learn how to install SOPS and Age, encrypt Kubernetes secrets, integrate with GitOps tools, and manage encryption keys across teams and environments.

## Installing SOPS and Age

Install Age:

```bash
# macOS
brew install age

# Linux
wget https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-linux-amd64.tar.gz
tar xzf age-v1.1.1-linux-amd64.tar.gz
sudo mv age/age /usr/local/bin/
sudo mv age/age-keygen /usr/local/bin/

# Verify
age --version
```

Install SOPS:

```bash
# macOS
brew install sops

# Linux
wget https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
chmod +x sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops

# Verify
sops --version
```

## Generating Age Keys

Create an Age key pair:

```bash
# Generate key
age-keygen -o key.txt

# View the key
cat key.txt
```

Output:

```
# created: 2026-02-09T10:00:00Z
# public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
AGE-SECRET-KEY-1GFPYYYYY...
```

Save the public key for encryption:

```bash
export AGE_PUBLIC_KEY="age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p"
```

Store the private key securely (this decrypts your secrets):

```bash
# Move to secure location
mv key.txt ~/.config/sops/age/keys.txt
chmod 600 ~/.config/sops/age/keys.txt
```

## Creating and Encrypting a Kubernetes Secret

Create a regular Kubernetes Secret:

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: dbuser
  password: SuperSecurePassword123
  host: postgres.example.com
  port: "5432"
```

Encrypt it with SOPS:

```bash
# Encrypt the file
sops --encrypt \
  --age $AGE_PUBLIC_KEY \
  secret.yaml > secret.enc.yaml
```

The encrypted file:

```yaml
# secret.enc.yaml
apiVersion: v1
kind: Secret
metadata:
    name: database-credentials
    namespace: production
type: Opaque
stringData:
    username: ENC[AES256_GCM,data:abcdef...,tag:xyz...,type:str]
    password: ENC[AES256_GCM,data:ghijkl...,tag:uvw...,type:str]
    host: ENC[AES256_GCM,data:mnopqr...,tag:rst...,type:str]
    port: ENC[AES256_GCM,data:5432,tag:abc...,type:str]
sops:
    kms: []
    gcp_kms: []
    azure_kv: []
    hc_vault: []
    age:
        - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSB...
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2026-02-09T10:00:00Z"
    mac: ENC[AES256_GCM,data:...,tag:...,type:str]
    pgp: []
    version: 3.8.1
```

Notice that SOPS:
- Encrypts only the values, not the keys
- Preserves YAML structure
- Adds metadata about encryption method

Commit the encrypted file safely to Git:

```bash
git add secret.enc.yaml
git commit -m "Add encrypted database credentials"
git push
```

## Decrypting and Applying Secrets

Decrypt the secret:

```bash
# Decrypt to stdout
sops --decrypt secret.enc.yaml

# Decrypt to file
sops --decrypt secret.enc.yaml > secret.yaml

# Decrypt and apply directly
sops --decrypt secret.enc.yaml | kubectl apply -f -
```

SOPS automatically uses the private key from `~/.config/sops/age/keys.txt`.

## Using .sops.yaml for Configuration

Create `.sops.yaml` in your repository root to configure encryption rules:

```yaml
# .sops.yaml
creation_rules:
  # Encrypt all files in production with Age
  - path_regex: overlays/production/.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # Encrypt staging files with different key
  - path_regex: overlays/staging/.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # Encrypt specific files only
  - path_regex: .*secret.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # Encrypt only certain keys in any file
  - path_regex: .*\.yaml$
    encrypted_regex: ^(data|stringData|password|token|key)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Now you can encrypt without specifying the key:

```bash
# SOPS uses .sops.yaml automatically
sops --encrypt secret.yaml > secret.enc.yaml
```

## Editing Encrypted Files

Edit encrypted files directly with SOPS:

```bash
# Edit in your default editor
sops secret.enc.yaml
```

SOPS:
1. Decrypts the file
2. Opens it in your editor
3. Re-encrypts when you save and close

This is safer than decrypting, editing, and re-encrypting manually.

## Partial Encryption with encrypted_regex

Encrypt only sensitive fields:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: .*\.yaml$
    encrypted_regex: ^(password|apiKey|token|secret)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Original file:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-config
type: Opaque
stringData:
  database_host: postgres.example.com
  database_port: "5432"
  database_password: SecurePassword123
  api_key: secret-api-key
```

After encryption:

```yaml
apiVersion: v1
kind: Secret
metadata:
    name: app-config
type: Opaque
stringData:
    database_host: postgres.example.com  # Not encrypted
    database_port: "5432"                # Not encrypted
    database_password: ENC[AES256_GCM,data:...,type:str]  # Encrypted
    api_key: ENC[AES256_GCM,data:...,type:str]           # Encrypted
sops:
    # ... metadata
```

This makes it easier to review non-sensitive changes in Git diffs.

## Integrating with ArgoCD

Install SOPS plugin for ArgoCD:

```yaml
# argocd-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  kustomize.buildOptions: --enable-alpha-plugins --enable-exec
```

Create Age secret in ArgoCD namespace:

```bash
kubectl create secret generic sops-age \
  --namespace argocd \
  --from-file=keys.txt=$HOME/.config/sops/age/keys.txt
```

Configure ArgoCD to use SOPS:

```yaml
# argocd-repo-server patch
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      volumes:
      - name: sops-age
        secret:
          secretName: sops-age
      initContainers:
      - name: install-sops
        image: alpine:latest
        command:
        - sh
        - -c
        - |
          wget -O /custom-tools/sops https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
          chmod +x /custom-tools/sops
        volumeMounts:
        - name: custom-tools
          mountPath: /custom-tools
      containers:
      - name: argocd-repo-server
        volumeMounts:
        - name: custom-tools
          mountPath: /usr/local/bin/sops
          subPath: sops
        - name: sops-age
          mountPath: /home/argocd/.config/sops/age
        env:
        - name: SOPS_AGE_KEY_FILE
          value: /home/argocd/.config/sops/age/keys.txt
```

Use a custom plugin or use ksops with Kustomize.

## Using KSOPS with Kustomize

Install KSOPS (Kustomize SOPS plugin):

```bash
# Install as Kustomize plugin
mkdir -p $HOME/.config/kustomize/plugin/viaduct.ai/v1/ksops
wget https://github.com/viaduct-ai/kustomize-sops/releases/download/v4.3.1/ksops_4.3.1_Linux_x86_64.tar.gz
tar -xzf ksops_4.3.1_Linux_x86_64.tar.gz -C $HOME/.config/kustomize/plugin/viaduct.ai/v1/ksops
```

Create Kustomize configuration:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

generators:
  - secret-generator.yaml

resources:
  - deployment.yaml
```

Create KSOPS generator:

```yaml
# secret-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: secret-generator
files:
  - secret.enc.yaml
```

Build with Kustomize:

```bash
kustomize build --enable-alpha-plugins .
```

KSOPS automatically decrypts SOPS-encrypted files during build.

## Multi-Key Encryption for Teams

Encrypt files for multiple team members:

```bash
# Team members generate their own Age keys
# Alice: age1alice...
# Bob: age1bob...
# Charlie: age1charlie...

# Encrypt for all team members
sops --encrypt \
  --age age1alice...,age1bob...,age1charlie... \
  secret.yaml > secret.enc.yaml
```

Anyone with their private key can decrypt:

```bash
# Alice decrypts with her key
export SOPS_AGE_KEY=$(cat ~/.config/sops/age/alice-key.txt)
sops --decrypt secret.enc.yaml
```

Configure in `.sops.yaml`:

```yaml
creation_rules:
  - path_regex: .*secret.*\.yaml$
    age: >-
      age1alice...,
      age1bob...,
      age1charlie...
```

## Key Rotation

Rotate to new Age keys:

```bash
# Generate new key
age-keygen -o new-key.txt
export NEW_AGE_PUBLIC_KEY="age1new..."

# Rotate all encrypted files
find . -name "*.enc.yaml" | while read file; do
  echo "Rotating $file..."
  sops --rotate \
    --add-age $NEW_AGE_PUBLIC_KEY \
    --rm-age $OLD_AGE_PUBLIC_KEY \
    --in-place $file
done

# Update .sops.yaml with new key
# Commit changes
git add .
git commit -m "Rotate Age encryption keys"
git push
```

## Best Practices

1. **Never commit unencrypted secrets**: Always encrypt before adding to Git.

2. **Use `.sops.yaml`**: Configure encryption rules centrally instead of specifying on command line.

3. **Encrypt only sensitive values**: Use `encrypted_regex` to leave non-sensitive data readable.

4. **Back up private keys**: Store Age private keys securely outside Git (password manager, vault).

5. **Use separate keys per environment**: Don't share keys between production and non-production.

6. **Rotate keys periodically**: Plan for key rotation and automate the process.

7. **Add `.sops.yaml` to Git**: This documents encryption rules and makes team onboarding easier.

8. **Use key management for CI/CD**: Store Age private keys in CI/CD secret managers.

SOPS with Age encryption provides a simple, secure way to store Kubernetes secrets in Git. The combination of Age's modern encryption and SOPS's structured data handling creates a powerful GitOps-friendly secret management solution without complex infrastructure dependencies.
