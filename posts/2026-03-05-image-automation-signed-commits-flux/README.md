# How to Configure Image Automation with Signed Commits in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Signed Commits, Security, GPG

Description: Learn how to configure Flux ImageUpdateAutomation to create GPG-signed commits when updating image tags in your Git repository.

---

## Introduction

In organizations with strict security and compliance requirements, all Git commits must be cryptographically signed. Flux supports GPG-signed commits in ImageUpdateAutomation through the `spec.git.commit.signingKey` field. This guide walks you through setting up signed commits for Flux image automation.

## Prerequisites

- A Kubernetes cluster with Flux installed
- The image-automation-controller deployed
- A GPG key pair generated for the Flux bot identity
- Image automation already working (ImageRepository, ImagePolicy, and ImageUpdateAutomation configured)

## Step 1: Generate a GPG Key

If you do not already have a GPG key for Flux, generate one. This key will be used exclusively by the automation controller.

```bash
# Generate a GPG key for the Flux bot
# Use a passphrase-less key for automation purposes
gpg --batch --gen-key <<EOF
%no-protection
Key-Type: eddsa
Key-Curve: ed25519
Name-Real: Flux Bot
Name-Email: flux@example.com
Expire-Date: 2y
EOF
```

List the key to find its fingerprint.

```bash
# List GPG keys and find the fingerprint for the Flux Bot key
gpg --list-secret-keys --keyid-format long flux@example.com
```

## Step 2: Export the GPG Key

Export the private key so it can be stored as a Kubernetes secret.

```bash
# Export the GPG private key in ASCII armor format
# Replace FINGERPRINT with your actual key fingerprint
gpg --export-secret-keys --armor FINGERPRINT > flux-gpg-private.asc
```

Also export the public key. You will need to add this to your Git hosting provider to verify the signatures.

```bash
# Export the GPG public key for adding to GitHub/GitLab
gpg --export --armor FINGERPRINT > flux-gpg-public.asc
```

## Step 3: Create a Kubernetes Secret

Store the GPG private key as a secret in the flux-system namespace.

```bash
# Create a secret containing the GPG private key for commit signing
kubectl create secret generic flux-gpg-signing-key \
  --namespace flux-system \
  --from-file=git.asc=flux-gpg-private.asc
```

The key name `git.asc` is the expected key within the secret data. The image-automation-controller looks for this specific key.

## Step 4: Configure ImageUpdateAutomation with Signing

Update your ImageUpdateAutomation resource to reference the signing key secret.

```yaml
# image-update-automation-signed.yaml
# ImageUpdateAutomation configured to produce GPG-signed commits
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
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
      signingKey:
        secretRef:
          name: flux-gpg-signing-key
      messageTemplate: |
        Automated image update

        {{range .Changed.Changes}}
        - {{.OldValue}} -> {{.NewValue}}
        {{end}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

The critical addition is the `signingKey.secretRef` field, which tells the controller to sign commits using the GPG key stored in the referenced secret.

## Step 5: Apply the Configuration

Apply the updated ImageUpdateAutomation resource.

```bash
# Apply the signing-enabled ImageUpdateAutomation
kubectl apply -f image-update-automation-signed.yaml
```

## Step 6: Register the Public Key with Your Git Provider

For the signatures to show as "Verified" in your Git hosting platform, add the public key.

**GitHub:**
1. Go to the bot user's Settings > SSH and GPG keys
2. Add the contents of `flux-gpg-public.asc` as a new GPG key

**GitLab:**
1. Go to the bot user's Preferences > GPG Keys
2. Paste the public key and save

Alternatively, if you use a dedicated bot account for Flux, add the GPG key to that account.

## Step 7: Verify Signed Commits

Trigger a reconciliation to create a new commit.

```bash
# Force reconciliation to trigger a signed commit
flux reconcile image update flux-system -n flux-system
```

Check the Git log to confirm the commit is signed.

```bash
# Verify the latest commit has a valid GPG signature
git pull origin main
git log --show-signature -1
```

You should see output indicating a valid GPG signature from the Flux Bot key.

## Rotating the GPG Key

GPG keys should be rotated periodically. To rotate:

1. Generate a new GPG key pair
2. Add the new public key to your Git provider
3. Update the Kubernetes secret with the new private key

```bash
# Update the secret with a new GPG private key
kubectl create secret generic flux-gpg-signing-key \
  --namespace flux-system \
  --from-file=git.asc=new-flux-gpg-private.asc \
  --dry-run=client -o yaml | kubectl apply -f -
```

4. Restart the image-automation-controller to pick up the new key

```bash
# Restart the controller to load the new signing key
kubectl rollout restart deployment/image-automation-controller -n flux-system
```

5. After confirming the new key works, remove the old public key from your Git provider

## Troubleshooting

### Commit Fails with Signing Error

Check the controller logs for GPG-related errors.

```bash
# Check for signing errors in the controller logs
kubectl logs -n flux-system deployment/image-automation-controller --tail=100 \
  | grep -i sign
```

Common issues:
- The secret does not contain a key named `git.asc`
- The GPG key is passphrase-protected (automation keys must not have a passphrase)
- The key has expired

### Commits Are Not Showing as Verified

If commits are pushed but not verified on the Git platform:
- Confirm the public key is associated with the correct email address
- Ensure the `author.email` in the ImageUpdateAutomation matches the email on the GPG key
- Verify the public key was uploaded to the correct account on the Git hosting platform

## Security Considerations

- Store the GPG private key only in the Kubernetes secret. Delete the local copy after creating the secret.
- Use a dedicated GPG key for Flux automation rather than a personal key.
- Set an expiration date on the key and establish a rotation schedule.
- Consider using Sealed Secrets or an external secrets operator to manage the GPG key secret.

```bash
# Securely delete the local private key file after creating the secret
shred -u flux-gpg-private.asc
```

## Conclusion

Signed commits from Flux image automation provide an auditable chain of trust for automated changes. By configuring `spec.git.commit.signingKey` and storing a GPG private key as a Kubernetes secret, every image tag update committed by Flux carries a cryptographic signature that your team and your Git platform can verify.
