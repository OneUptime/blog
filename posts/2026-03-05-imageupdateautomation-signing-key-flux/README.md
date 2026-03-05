# How to Configure ImageUpdateAutomation Signing Key in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, ImageUpdateAutomation, Image Automation, GPG Signing, Git Security

Description: Learn how to configure GPG commit signing for Flux CD's ImageUpdateAutomation to ensure automated commits are cryptographically verified.

---

Many organizations require all Git commits to be cryptographically signed for security and compliance. Flux CD's ImageUpdateAutomation controller supports GPG signing of the automated commits it creates. This guide covers generating GPG keys, creating Kubernetes secrets, and configuring the signing key in your ImageUpdateAutomation resource.

## Why Sign Automated Commits

Commit signing serves several purposes:

- **Verification**: Signed commits prove the commit was created by the holder of the private key, not an impersonator.
- **Branch protection**: GitHub, GitLab, and Bitbucket can enforce that all commits on protected branches are signed.
- **Compliance**: Some regulatory frameworks require cryptographic proof of authorship for all code changes.
- **Audit trails**: Signed commits provide a stronger audit trail than unsigned commits.

## Generating a GPG Key

First, generate a GPG key pair dedicated to the Flux automation. Do not reuse personal keys.

```bash
# Generate a new GPG key
gpg --batch --gen-key <<EOF
%no-protection
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: Flux Bot
Name-Email: flux@example.com
Expire-Date: 2y
%commit
EOF
```

List the key to find its ID:

```bash
gpg --list-secret-keys --keyid-format long flux@example.com
```

The output will show something like:

```
sec   rsa4096/ABCDEF1234567890 2026-03-05 [SC] [expires: 2028-03-05]
      1234567890ABCDEF1234567890ABCDEF12345678
uid                 [ultimate] Flux Bot <flux@example.com>
ssb   rsa4096/0987654321FEDCBA 2026-03-05 [E] [expires: 2028-03-05]
```

Export the private key in ASCII armor format:

```bash
gpg --export-secret-keys --armor flux@example.com > flux-signing-key.asc
```

## Creating the Kubernetes Secret

The signing key must be stored in a Kubernetes secret in the same namespace as the ImageUpdateAutomation resource. The key must be in the `git.asc` field:

```bash
kubectl create secret generic signing-key \
  --namespace=flux-system \
  --from-file=git.asc=flux-signing-key.asc
```

After creating the secret, securely delete the exported key file:

```bash
rm flux-signing-key.asc
```

## Configuring ImageUpdateAutomation with Signing

Reference the signing key secret in the `spec.git.commit.signingKey` field:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        Automated image update

        Automation: {{ .AutomationObject }}

        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}
      signingKey:
        secretRef:
          name: signing-key
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

The `author.email` should match the email used when generating the GPG key. This ensures consistency between the commit author and the signing identity.

## Uploading the Public Key to Your Git Platform

For Git platforms to show commits as verified, you need to upload the public key.

Export the public key:

```bash
gpg --export --armor flux@example.com > flux-public-key.asc
```

### GitHub

Go to the bot account's Settings, then SSH and GPG keys, and add a new GPG key with the contents of `flux-public-key.asc`.

Alternatively, use the GitHub API:

```bash
gh api user/gpg_keys -f armored_public_key="$(cat flux-public-key.asc)"
```

### GitLab

Navigate to the bot account's Preferences, then GPG Keys, and paste the public key.

### Bitbucket

Bitbucket supports GPG key verification in Bitbucket Server. Upload the public key through the user account settings.

## Verifying Signed Commits

After the automation creates a commit, verify the signature:

```bash
# Pull the latest changes
git pull

# Check the signature on the latest commit
git log --show-signature -1
```

You should see output like:

```
commit abc123...
gpg: Signature made Thu Mar 05 14:30:22 2026 UTC
gpg:                using RSA key 1234567890ABCDEF1234567890ABCDEF12345678
gpg: Good signature from "Flux Bot <flux@example.com>"
Author: Flux Bot <flux@example.com>
Date:   Thu Mar 5 14:30:22 2026 +0000

    Automated image update
```

## Key Rotation

GPG keys should be rotated periodically. To rotate the signing key:

1. Generate a new GPG key pair
2. Upload the new public key to your Git platform
3. Update the Kubernetes secret:

```bash
gpg --export-secret-keys --armor flux-new@example.com > new-signing-key.asc

kubectl create secret generic signing-key \
  --namespace=flux-system \
  --from-file=git.asc=new-signing-key.asc \
  --dry-run=client -o yaml | kubectl apply -f -

rm new-signing-key.asc
```

4. Keep the old public key on the Git platform until all commits signed with it are no longer relevant.

## Using a Passphrase-Protected Key

The ImageUpdateAutomation controller expects the GPG key to have no passphrase. If your key has a passphrase, you need to remove it before creating the secret:

```bash
gpg --edit-key flux@example.com
# At the gpg> prompt, type: passwd
# Enter the old passphrase, then press Enter for an empty new passphrase
# Type: save
```

Alternatively, generate the key without a passphrase from the start using `%no-protection` in the batch generation parameters.

## Troubleshooting

**Commits not signed**: Verify the secret exists in the correct namespace and contains the `git.asc` key. Check controller logs:

```bash
kubectl -n flux-system logs deployment/image-automation-controller --tail=20
```

**Commits signed but not verified on GitHub**: Ensure the public key is uploaded to the GitHub account that matches the commit author email. The email in the GPG key UID must match the email in `spec.git.commit.author.email`.

**Secret not found errors**: Confirm the secret name in `signingKey.secretRef.name` matches the actual secret name, and both are in the `flux-system` namespace.

**Expired key errors**: Check the key expiration date with `gpg --list-keys flux@example.com`. If expired, generate a new key and update the secret.

Commit signing adds a layer of trust to your automated GitOps pipeline. By verifying that every commit was created by the authorized Flux automation, you can confidently enforce branch protection rules and maintain a tamper-evident audit trail.
