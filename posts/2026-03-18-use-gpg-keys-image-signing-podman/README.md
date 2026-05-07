# How to Use GPG Keys for Image Signing in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, GPG, Image Signing, Cryptography

Description: Learn how to generate, manage, and use GPG keys specifically for signing and verifying container images with Podman.

---

> GPG keys are the foundation of Podman's native simple-signing workflow. Proper key management is what separates a secure signing workflow from security theater.

Podman's built-in simple-signing support relies on GPG (GNU Privacy Guard) keys. For verification across hosts, Podman also needs a `registries.d` configuration that tells it where to read and write signatures. This guide covers the complete lifecycle of GPG keys for container image signing, from generation to distribution, rotation, and revocation. Proper key management ensures that your signed images remain trustworthy over time.

---

## Generating a Dedicated Signing Key

Always create a separate GPG key specifically for container image signing. Do not reuse personal email keys.

```bash
# Generate a signing key with a 1-year expiration
gpg --yes --quick-generate-key \
  "Container Signing Key (Production Image Signing) <container-signing@example.com>" \
  rsa4096 sign 1y
```

```bash
# List the newly created key
gpg --list-keys --keyid-format long container-signing@example.com
```

```bash
# View the key fingerprint (useful for key verification and auditing)
gpg --fingerprint container-signing@example.com
```

## Exporting Keys for Distribution

You need to export the public key so that other systems can verify your signatures.

```bash
# Export the public key in ASCII armor format (human-readable)
gpg --export --armor container-signing@example.com > container-signing-pub.asc

# Export the public key in binary format (for Podman policy configuration)
gpg --export container-signing@example.com > container-signing-pub.gpg

# View the exported public key
cat container-signing-pub.asc
```

```bash
# Install the public key for Podman verification
sudo mkdir -p /etc/pki/containers
sudo cp container-signing-pub.gpg /etc/pki/containers/
sudo chmod 644 /etc/pki/containers/container-signing-pub.gpg
```

## Backing Up Signing Keys

Securely back up your private signing key.

```bash
# Export the private key for backup (store securely)
gpg --export-secret-keys --armor container-signing@example.com > container-signing-private.asc

# Set restrictive permissions on the private key backup
chmod 600 container-signing-private.asc

# Verify the backup can be restored on another system
echo "Private key backup size: $(wc -c < container-signing-private.asc) bytes"
```

## Importing Keys on Verification Hosts

If you also want to inspect the key with GPG on a verification host, import the public key locally.

```bash
# Import the public key into the GPG keyring
gpg --import container-signing-pub.asc

# Verify the imported key
gpg --list-keys container-signing@example.com
```

```bash
# Install the key for Podman's policy system
sudo cp container-signing-pub.gpg /etc/pki/containers/container-signing.gpg

# Configure a shared lookaside store for simple-signing signatures.
# Install the same registries.d entry on the signing host and every verification host.
sudo mkdir -p /etc/containers/registries.d
sudo tee /etc/containers/registries.d/registry.example.com.yaml > /dev/null << 'EOF'
docker:
  registry.example.com:
    lookaside: file:///mnt/shared-signatures
    lookaside-staging: file:///mnt/shared-signatures
EOF

# Configure the trust policy to use this key
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [{"type": "insecureAcceptAnything"}],
  "transports": {
    "docker": {
      "registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/container-signing.gpg"
        }
      ]
    }
  }
}
EOF
```

## Signing Images with Your GPG Key

On Linux and WSL2, you can add a simple-signing signature during `podman push` with `--sign-by`.

```bash
# Build an image
podman build -t registry.example.com/myapp:v1.0 .

# Push and sign with the GPG key identity
podman push --sign-by container-signing@example.com \
  registry.example.com/myapp:v1.0
```

```bash
# You can also reference the key by its fingerprint
KEY_FINGERPRINT=$(gpg --fingerprint --with-colons container-signing@example.com | \
  grep fpr | head -1 | cut -d: -f10)
echo "Key fingerprint: $KEY_FINGERPRINT"

podman push --sign-by "$KEY_FINGERPRINT" \
  registry.example.com/myapp:v1.0
```

## Managing Multiple Signing Keys

Organizations often need different keys for different environments.

```bash
# Generate keys for different environments
for env in dev staging production; do
  gpg --yes --quick-generate-key \
    "Container Signing Key (${env}) <container-${env}@example.com>" \
    rsa4096 sign 1y
done

# List all signing keys
gpg --list-keys --keyid-format short | grep -A1 "Container Signing"
```

```bash
# Export and install all environment-specific public keys
sudo mkdir -p /etc/pki/containers
for env in dev staging production; do
  gpg --export "container-${env}@example.com" > "/tmp/container-${env}.gpg"
  sudo cp "/tmp/container-${env}.gpg" "/etc/pki/containers/container-${env}.gpg"
done
```

```bash
# Configure policy to require the matching key for each registry
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [{"type": "reject"}],
  "transports": {
    "docker": {
      "dev-registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/container-dev.gpg"
        }
      ],
      "staging-registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/container-staging.gpg"
        }
      ],
      "prod-registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/container-production.gpg"
        }
      ]
    }
  }
}
EOF
```

## Rotating Signing Keys

Rotate keys before they expire to maintain continuity.

```bash
# Check when your current key expires
gpg --list-keys --with-colons container-signing@example.com | grep "^pub" | cut -d: -f7

# Generate a new key before the old one expires
gpg --yes --quick-generate-key \
  "Container Signing Key v2 <container-signing-v2@example.com>" \
  rsa4096 sign 1y

# Export the new public key
gpg --export container-signing-v2@example.com > /tmp/container-signing-v2.gpg
sudo cp /tmp/container-signing-v2.gpg /etc/pki/containers/
```

## Revoking a Compromised Key

```bash
# Generate and store a revocation certificate before you need it
gpg --output revoke-cert.asc --gen-revoke container-signing@example.com

# If the key is compromised later, import the stored revocation certificate
gpg --import revoke-cert.asc

# Remove the compromised key from Podman's trusted keys
sudo rm /etc/pki/containers/container-signing.gpg

# Update the policy to use the new key
echo "Update policy.json to reference the new key"
```

## Cleanup

```bash
rm -f container-signing-pub.asc container-signing-pub.gpg container-signing-private.asc revoke-cert.asc
rm -f /tmp/container-*.gpg
```

## Summary

GPG keys are central to Podman's simple-signing and verification workflow. By generating dedicated signing keys, distributing public keys to verification hosts, configuring a shared signature store, and maintaining a key rotation schedule, you build a reliable trust infrastructure for your container images. Keep private keys secure, use separate keys for different environments, and have a revocation plan ready in case a key is compromised.
