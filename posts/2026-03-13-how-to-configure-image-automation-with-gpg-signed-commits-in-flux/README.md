# How to Configure Image Automation with GPG Signed Commits in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, image-automation, gpg, signed-commits, security, gitops, kubernetes

Description: Learn how to configure Flux ImageUpdateAutomation to create GPG-signed commits for image tag updates to satisfy security and compliance requirements.

---

## Introduction

Many organizations require all Git commits to be cryptographically signed to verify their authenticity. When Flux image automation creates commits for image tag updates, these commits can be signed with a GPG key. This ensures that automated commits are verifiable and meet the same security standards as human-authored commits.

This guide walks you through generating a GPG key, configuring it in Flux, and setting up ImageUpdateAutomation to produce GPG-signed commits.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- GPG tooling installed on your local machine
- A GitRepository source with write access
- Familiarity with GPG key management

## Generating a GPG Key

If you do not already have a GPG key for Flux, generate one:

```bash
export GNUPGHOME=$(mktemp -d)

cat >key-config <<EOF
%no-protection
Key-Type: eddsa
Key-Curve: ed25519
Key-Usage: sign
Name-Real: Flux Bot
Name-Email: flux@example.com
Expire-Date: 0
EOF

gpg --batch --gen-key key-config
```

Export the private and public keys:

```bash
gpg --export-secret-keys --armor flux@example.com > flux-gpg-private.key
gpg --export --armor flux@example.com > flux-gpg-public.key
```

Note the key ID for later:

```bash
gpg --list-secret-keys flux@example.com
```

## Creating the GPG Secret in Kubernetes

Store the GPG private key as a Kubernetes secret:

```bash
kubectl -n flux-system create secret generic gpg-signing-key \
  --from-file=git.asc=flux-gpg-private.key
```

Or define it as a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gpg-signing-key
  namespace: flux-system
type: Opaque
data:
  git.asc: <base64-encoded-private-key>
```

## Configuring ImageUpdateAutomation with Signing

Add the `signingKey` reference to your ImageUpdateAutomation:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      signingKey:
        secretRef:
          name: gpg-signing-key
      messageTemplate: "Signed automated image update"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

The `signingKey.secretRef` points to the Kubernetes secret containing the GPG private key. Flux uses this key to sign every commit it creates.

## Adding the Public Key to Your Git Platform

For GitHub, add the GPG public key to verify signed commits:

1. Go to your GitHub account Settings
2. Navigate to SSH and GPG keys
3. Click New GPG key
4. Paste the content of `flux-gpg-public.key`

For a service account or bot, you can also add the key to the organization level.

To mark commits as verified in GitHub, the email in the GPG key must match the commit author email configured in the ImageUpdateAutomation.

## Configuring Branch Protection for Signed Commits

In GitHub, you can require signed commits on protected branches:

1. Go to your repository Settings
2. Navigate to Branches
3. Edit the branch protection rule for `main`
4. Enable "Require signed commits"

With this setting, all commits including automated ones must be signed. Flux's GPG-signed commits will pass this check.

## Using the Signing Key with Separate Branch Push

The signing configuration works the same way when pushing to a separate branch:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      signingKey:
        secretRef:
          name: gpg-signing-key
      messageTemplate: "Signed automated image update"
    push:
      branch: flux/image-updates
  update:
    path: ./clusters/production
    strategy: Setters
```

## Rotating GPG Keys

To rotate the GPG key, generate a new key pair, update the Kubernetes secret, and add the new public key to your Git platform. The old public key can remain for verifying historical commits:

```bash
# Generate new key
gpg --batch --gen-key new-key-config

# Update the secret
kubectl -n flux-system create secret generic gpg-signing-key \
  --from-file=git.asc=new-flux-gpg-private.key \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart the image automation controller to pick up the new key
kubectl -n flux-system rollout restart deployment image-automation-controller
```

## Verifying Signed Commits

Check that commits are signed in the Git log:

```bash
git log --show-signature -1
```

On GitHub, signed commits show a "Verified" badge next to the commit message.

## Troubleshooting

If commits are not being signed, check the following:

1. Verify the secret exists and contains the key:
   ```bash
   kubectl -n flux-system get secret gpg-signing-key
   ```

2. Check the image automation controller logs:
   ```bash
   kubectl -n flux-system logs deployment/image-automation-controller
   ```

3. Ensure the key email matches the commit author email in the automation spec.

4. Verify the key has not expired.

## Conclusion

GPG-signed commits from Flux image automation provide cryptographic verification that automated changes are authentic and have not been tampered with. By storing the GPG private key as a Kubernetes secret and referencing it in the ImageUpdateAutomation spec, every image tag update commit is signed. Combined with branch protection rules that require signed commits, this creates a verifiable chain of trust from image detection through deployment.
