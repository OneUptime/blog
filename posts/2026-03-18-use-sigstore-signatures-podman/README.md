# How to Use Sigstore Signatures with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Sigstore, Cosign, Image Signing

Description: Learn how to sign and verify container images with Podman using Sigstore and cosign for keyless and key-based signing workflows.

---

> Sigstore brings modern, transparent signing to container images, making supply chain security accessible without the complexity of traditional key management.

Sigstore is a modern signing framework that provides both key-based and keyless signing for container images. With cosign as its primary tool, Sigstore offers transparency logging, OIDC-based identity verification, and integration with Podman's trust policies. This guide covers both signing approaches and how to configure Podman to verify Sigstore signatures.

---

## Understanding Sigstore

Sigstore consists of several components: cosign for signing and verifying artifacts, Rekor for transparency logging, and Fulcio for issuing short-lived certificates based on OIDC identity. This means you can sign images using your existing identity (like a GitHub or Google account) without managing long-lived keys.

## Installing Cosign

```bash
# Install cosign on Linux

sudo curl -sSfL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 \
  -o /usr/local/bin/cosign
sudo chmod +x /usr/local/bin/cosign

# Or install on macOS
# brew install cosign

# Or install on Fedora
# sudo dnf install -y cosign

# Verify installation
cosign version
```

## Key-Based Signing with Cosign

Generate a cosign key pair for traditional key-based signing.

```bash
# Generate a cosign key pair
cosign generate-key-pair

# This creates two files:
# cosign.key (private key - keep secure)
# cosign.pub (public key - distribute for verification)
ls -la cosign.key cosign.pub
```

```bash
# Sign an image in a registry
podman pull docker.io/library/alpine:latest
podman tag docker.io/library/alpine:latest localhost:5000/alpine:cosigned

# Push the image first
podman push --tls-verify=false localhost:5000/alpine:cosigned

# Sign the image with cosign
cosign sign --key cosign.key \
  --allow-http-registry \
  localhost:5000/alpine:cosigned
```

## Verifying Cosign Signatures

```bash
# Verify an image signature using the public key
cosign verify --key cosign.pub \
  --allow-http-registry \
  localhost:5000/alpine:cosigned
```

```bash
# Verify and display the signature payload
cosign verify --key cosign.pub \
  --allow-http-registry \
  localhost:5000/alpine:cosigned | python3 -m json.tool
```

## Keyless Signing with Sigstore

Keyless signing uses OIDC providers (GitHub, Google, Microsoft) for identity.

```bash
# Tag and push the image first
podman tag docker.io/library/alpine:latest localhost:5000/alpine:keyless
podman push --tls-verify=false localhost:5000/alpine:keyless

# Keyless signing (opens browser for OIDC authentication)
cosign sign --allow-http-registry \
  localhost:5000/alpine:keyless

# Keyless verification (checks the transparency log)
cosign verify \
  --certificate-identity signer@example.com \
  --certificate-oidc-issuer https://accounts.google.com \
  --allow-http-registry \
  localhost:5000/alpine:keyless
```

## Configuring Podman to Verify Sigstore Signatures

Podman supports Sigstore signature verification natively through its policy system.

```bash
# Enable Sigstore attachments for the registry
sudo tee /etc/containers/registries.d/registry-example.yaml > /dev/null << 'EOF'
docker:
  registry.example.com:
    use-sigstore-attachments: true
EOF

# Configure policy for Sigstore verification with a key file
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [
    {
      "type": "insecureAcceptAnything"
    }
  ],
  "transports": {
    "docker": {
      "registry.example.com/myapp": [
        {
          "type": "sigstoreSigned",
          "keyPath": "/etc/pki/containers/cosign.pub",
          "signedIdentity": {
            "type": "exactRepository",
            "dockerRepository": "registry.example.com/myapp"
          }
        }
      ]
    }
  }
}
EOF

# Install the cosign public key
sudo cp cosign.pub /etc/pki/containers/
```

## Configuring Keyless Verification in Podman

```bash
# Configure policy for keyless Sigstore verification
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [
    {
      "type": "insecureAcceptAnything"
    }
  ],
  "transports": {
    "docker": {
      "registry.example.com/myapp": [
        {
          "type": "sigstoreSigned",
          "fulcio": {
            "caPath": "/etc/pki/containers/fulcio-root.pem",
            "oidcIssuer": "https://accounts.google.com",
            "subjectEmail": "signer@example.com"
          },
          "rekorPublicKeyPath": "/etc/pki/containers/rekor-public.pem",
          "signedIdentity": {
            "type": "exactRepository",
            "dockerRepository": "registry.example.com/myapp"
          }
        }
      ]
    }
  }
}
EOF
```

## Adding Annotations to Signatures

```bash
# Tag and push the image first
podman tag docker.io/library/alpine:latest localhost:5000/alpine:annotated
podman push --tls-verify=false localhost:5000/alpine:annotated

# Sign with custom annotations for additional metadata
cosign sign --key cosign.key \
  --allow-http-registry \
  -a "build-id=12345" \
  -a "git-sha=abc123" \
  -a "environment=production" \
  localhost:5000/alpine:annotated

# Verify and view annotations
cosign verify --key cosign.pub \
  --allow-http-registry \
  localhost:5000/alpine:annotated | python3 -m json.tool
```

## Signing in CI/CD Pipelines

```bash
#!/bin/bash
# ci-cosign.sh - Sign images in a CI pipeline

IMAGE="registry.example.com/myapp"
TAG="${CI_COMMIT_SHA:-latest}"

# Build and push
podman build -t "${IMAGE}:${TAG}" .
podman push "${IMAGE}:${TAG}"

# Sign with cosign (key stored as CI secret, password in COSIGN_PASSWORD)
cosign sign --yes --key env://COSIGN_PRIVATE_KEY \
  -a "ci-pipeline=${CI_PIPELINE_ID:-local}" \
  -a "commit=${CI_COMMIT_SHA:-none}" \
  "${IMAGE}:${TAG}"

echo "Image signed: ${IMAGE}:${TAG}"
```

## Viewing Signatures on an Image

```bash
# List all signatures attached to an image
cosign tree localhost:5000/alpine:cosigned --allow-http-registry

# Download the signature payloads
cosign download signature localhost:5000/alpine:cosigned --allow-http-registry | python3 -m json.tool
```

## Checking the Transparency Log

```bash
# Search the Rekor transparency log for your signatures (requires rekor-cli)
rekor-cli search --email signer@example.com
```

## Cleanup

```bash
rm -f cosign.key cosign.pub
```

## Summary

Sigstore with cosign provides a modern alternative to GPG-based image signing for Podman. Key-based signing offers familiar control, while keyless signing eliminates key management by leveraging OIDC identities and transparency logs. Podman's native `sigstoreSigned` policy type integrates directly with both approaches, making it straightforward to enforce signature verification. Use keyless signing for open-source projects and key-based signing for private infrastructure where you control the trust chain.
