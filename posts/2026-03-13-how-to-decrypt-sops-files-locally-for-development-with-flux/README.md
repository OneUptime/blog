# How to Decrypt SOPS Files Locally for Development with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Development, Local, Age

Description: Learn how to set up local SOPS decryption for developers working with Flux-managed encrypted secrets during development and debugging.

---

Developers working with a Flux GitOps repository need to view and edit encrypted secrets locally. Setting up SOPS for local decryption enables developers to inspect secret values, test configuration changes, and debug issues without deploying to a cluster. This guide covers the tools and workflows for local SOPS decryption.

## The Developer Challenge

In a Flux repository, secrets are encrypted with SOPS. Developers need to read encrypted values to understand application configuration, edit secrets when credentials change, create new encrypted secrets, and validate that encrypted manifests are correct. Without proper local setup, developers must decrypt files on a remote machine or ask someone with the key to do it.

## Prerequisites

Install the required tools:

```bash
# Install SOPS
brew install sops

# Install age
brew install age

# Verify installation
sops --version
age --version
```

## Setting Up Age Keys Locally

Obtain the private age key from your team's secure key distribution system (such as a password manager or vault). Place it in the default SOPS location:

```bash
mkdir -p ~/.config/sops/age
# Copy or paste the private key
cat > ~/.config/sops/age/keys.txt << 'EOF'
# created: 2026-03-13T10:00:00Z
# public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
AGE-SECRET-KEY-1QFZN...
EOF
chmod 600 ~/.config/sops/age/keys.txt
```

SOPS automatically looks for keys in `~/.config/sops/age/keys.txt`.

Alternatively, use an environment variable:

```bash
export SOPS_AGE_KEY_FILE=/path/to/my-age.key
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`) for persistence.

## Decrypting Files

With the key in place, decrypt any SOPS-encrypted file:

```bash
# Decrypt to stdout
sops --decrypt secrets/app-secret.yaml

# Decrypt to a file
sops --decrypt secrets/app-secret.yaml > /tmp/decrypted-secret.yaml

# Decrypt and extract a specific field
sops --decrypt --extract '["stringData"]["password"]' secrets/app-secret.yaml
```

## Editing Encrypted Files

SOPS integrates with your editor for seamless edit workflows:

```bash
# Opens the file decrypted in your $EDITOR
# Re-encrypts on save
sops secrets/app-secret.yaml
```

Set your preferred editor:

```bash
export EDITOR=vim
# or
export EDITOR="code --wait"  # VS Code
```

When you save and close the editor, SOPS re-encrypts the file with the same keys defined in `.sops.yaml`.

## Creating New Encrypted Files

Create a new secret and encrypt it:

```bash
# Method 1: Create plaintext, then encrypt in place
cat <<EOF > secrets/new-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: new-secret
  namespace: default
type: Opaque
stringData:
  api-key: my-new-api-key
EOF

sops --encrypt --in-place secrets/new-secret.yaml
```

```bash
# Method 2: Use sops to create and encrypt directly
sops secrets/new-secret.yaml
# SOPS opens the editor with an empty file
# Add your content, save, and it encrypts automatically
```

## Viewing Encrypted Files Without Full Decryption

Sometimes you just want to see the structure without full decryption:

```bash
# Show the file with encrypted values (as stored in Git)
cat secrets/app-secret.yaml

# Show file metadata (which keys are used)
sops --decrypt --extract '["sops"]' secrets/app-secret.yaml 2>/dev/null || \
  grep -A 20 "^sops:" secrets/app-secret.yaml
```

## Using a Development-Specific Key

For development environments, use a separate age key that only decrypts dev secrets:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: clusters/production/.*\.yaml$
    age: age1prodkey...
    encrypted_regex: ^(data|stringData)$

  - path_regex: clusters/dev/.*\.yaml$
    age: >-
      age1devkey...,
      age1devteamkey...
    encrypted_regex: ^(data|stringData)$
```

Developers receive only the `age1devteamkey` private key, granting access to development secrets but not production ones.

## Shell Aliases for Common Operations

Add convenience aliases to your shell profile:

```bash
# Decrypt a file to stdout
alias sdec='sops --decrypt'

# Edit an encrypted file
alias sedit='sops'

# Encrypt a file in place
alias senc='sops --encrypt --in-place'

# Decrypt and pipe through kubectl
alias sapply='f() { sops --decrypt "$1" | kubectl apply -f -; }; f'
```

## Local Testing with Decrypted Secrets

Apply decrypted secrets to a local development cluster:

```bash
# Decrypt and apply to a local kind/minikube cluster
sops --decrypt secrets/app-secret.yaml | kubectl apply -f -

# Or decrypt all secrets in a directory
for f in secrets/*.yaml; do
  if grep -q "sops:" "$f"; then
    sops --decrypt "$f" | kubectl apply -f -
  else
    kubectl apply -f "$f"
  fi
done
```

## VS Code Integration

For VS Code users, create a task to decrypt files:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "SOPS: Decrypt file",
      "type": "shell",
      "command": "sops --decrypt ${file} > /tmp/sops-decrypted.yaml && code /tmp/sops-decrypted.yaml"
    },
    {
      "label": "SOPS: Edit encrypted file",
      "type": "shell",
      "command": "sops ${file}"
    }
  ]
}
```

## Diff Encrypted Files

Configure Git to show decrypted diffs:

```bash
# .gitattributes
*.enc.yaml diff=sops

# .gitconfig or .git/config
[diff "sops"]
  textconv = sops --decrypt
```

Now `git diff` shows decrypted content for SOPS-encrypted files:

```bash
git diff secrets/app-secret.yaml
```

## Security Considerations

Never commit decrypted files to Git. Add safeguards:

```bash
# .gitignore
/tmp/decrypted-*
*.decrypted.yaml
```

Use a pre-commit hook to catch accidentally decrypted secrets (covered in a separate guide). Limit development key distribution to authorized team members. Use separate keys for development and production to enforce access boundaries.

## Conclusion

Setting up local SOPS decryption is essential for a productive developer experience with Flux. By distributing development keys securely and configuring SOPS in each developer's environment, your team can view, edit, and create encrypted secrets without friction. Combine this with editor integration and Git diff configuration for a seamless workflow.
