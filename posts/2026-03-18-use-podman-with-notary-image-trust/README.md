# How to Use Podman with Notary for Image Trust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Notary, Image Trust, Content Trust, Container Security

Description: Learn how to use Notary with Podman to establish image trust through content signing and verification, ensuring only trusted images are deployed.

---

> Notary provides a TUF-based trust framework for publishing signed metadata, but Podman does not natively verify Notary v1 metadata when it pulls images.

Container image trust is a fundamental security requirement for production deployments. Notary, based on The Update Framework (TUF), provides a robust system for signing and verifying trust metadata, and it protects against several attack vectors including compromised registry servers, man-in-the-middle attacks, and replay attacks. Podman, however, enforces image trust through its own signature policy and signature storage mechanisms, so a Podman workflow must configure those native controls separately from any Notary server.

---

## Understanding Notary and TUF

Notary implements The Update Framework, which uses a hierarchy of cryptographic keys to establish trust. The key hierarchy includes:

- Root key: Signs the root metadata that defines the trusted keys for the other top-level roles and should be kept strongly protected
- Targets key: Signs the targets metadata that maps image tags to trusted manifest metadata
- Snapshot key: Signs the snapshot metadata that records versions of the targets metadata
- Timestamp key: Signs the timestamp metadata that gives clients freshness guarantees against replay attacks

This separation of concerns means that compromising a single key does not compromise the entire trust chain.

## Setting Up a Notary Server

For legacy Docker Content Trust workflows, Docker's official docs recommend starting the sample Notary stack from the upstream repository:

```bash
git clone https://github.com/theupdateframework/notary.git
cd notary
docker compose up -d
```

The upstream Notary v1 project was archived on July 30, 2025, and Docker marks the official image as deprecated, so this setup is appropriate only for legacy workflows that still require a Notary server.

Notary server configuration:

```json
{
    "server": {
        "http_addr": ":4443",
        "tls_key_file": "./notary-server.key",
        "tls_cert_file": "./notary-server.crt"
    },
    "trust_service": {
        "type": "remote",
        "hostname": "notarysigner",
        "port": "7899",
        "tls_ca_file": "./root-ca.crt",
        "key_algorithm": "ecdsa",
        "tls_client_cert": "./notary-server.crt",
        "tls_client_key": "./notary-server.key"
    },
    "logging": {
        "level": "debug"
    },
    "storage": {
        "backend": "mysql",
        "db_url": "server@tcp(mysql:3306)/notaryserver?parseTime=True"
    }
}
```

## Initializing Trust for a Repository

Initialize content trust for a container image repository:

```bash
# Initialize trust for a repository using the notary CLI
# Podman uses its own trust policy rather than Docker Content Trust.
notary -s https://notary.example.com:4443 init -p registry.example.com/myapp

# This generates a root key if one does not already exist, plus local targets
# and snapshot keys. The timestamp key is managed by the Notary server.
# Keep the root key secure and offline
```

## Signing Images

Sign and push a trusted image:

```bash
# Build the image
podman build -t registry.example.com/myapp:v1.0.0 .

# Push and sign the image using Podman's native simple-signing support
podman push --sign-by image-signing@example.com \
  registry.example.com/myapp:v1.0.0

# If you also maintain Notary metadata for legacy clients, publish the
# tag-to-manifest mapping separately with the notary CLI.
notary -s https://notary.example.com:4443 addhash -p \
  registry.example.com/myapp \
  v1.0.0 \
  <manifest-size> \
  --sha256 <manifest-sha256>
```

## Configuring Podman for Trust Verification

Configure Podman to verify image signatures:

```yaml
# /etc/containers/registries.d/registry.yaml
docker:
  registry.example.com:
    lookaside: https://signatures.example.com
```

`/etc/containers/policy.json`:

```json
{
    "default": [
        {
            "type": "reject"
        }
    ],
    "transports": {
        "docker": {
            "registry.example.com": [
                {
                    "type": "signedBy",
                    "keyType": "GPGKeys",
                    "keyPath": "/etc/pki/containers/trusted-key.gpg"
                }
            ],
            "docker.io": [
                {
                    "type": "insecureAcceptAnything"
                }
            ]
        }
    }
}
```

With this configuration, Podman rejects any image from `registry.example.com` unless it carries a valid simple-signing signature made by the trusted GPG key:

```bash
# This will succeed if the image is signed
podman pull registry.example.com/myapp:v1.0.0

# This will fail if the image is not signed
podman pull registry.example.com/untrusted:latest
# Error: Source image rejected
```

## GPG-Based Image Signing with Podman

Podman supports GPG-based image signing natively:

```bash
# Generate a GPG key for image signing
gpg --quick-generate-key image-signing@example.com
```

Serve `/var/lib/containers/sigstore` over HTTP or HTTPS as `https://signatures.example.com`, and configure Podman to write new signatures to that local staging directory:

```yaml
# /etc/containers/registries.d/registry.yaml
docker:
  registry.example.com:
    lookaside: https://signatures.example.com
    lookaside-staging: file:///var/lib/containers/sigstore
```

```bash
# Sign an image with GPG
podman push --sign-by image-signing@example.com \
  registry.example.com/myapp:v1.0.0

# Verify the signature
podman pull registry.example.com/myapp:v1.0.0
# Podman verifies the signature against policy.json and the configured lookaside store
```

## Delegation and Team Workflows

Notary supports delegation for its own TUF metadata, allowing different team members to sign different image tags. Podman still verifies its native signatures separately:

```bash
# Rotate the snapshot key to the server so delegated publishers do not need it locally
notary -s https://notary.example.com:4443 key rotate registry.example.com/myapp snapshot -r

# Add a delegation for the "releases" role
notary -s https://notary.example.com:4443 delegation add -p \
  registry.example.com/myapp \
  targets/releases \
  delegation.crt \
  --all-paths

# Publish a tag from the delegated role
notary -s https://notary.example.com:4443 addhash -p \
  registry.example.com/myapp \
  v1.0.0 \
  <manifest-size> \
  --sha256 <manifest-sha256> \
  --roles targets/releases
```

## Build and Sign Pipeline

A complete CI/CD pipeline with trust:

```bash
#!/bin/bash
# trusted-build.sh

set -euo pipefail

IMAGE="registry.example.com/myapp"
VERSION="$1"
GPG_KEY="image-signing@example.com"

echo "=== Building ${IMAGE}:${VERSION} ==="
podman build -t "${IMAGE}:${VERSION}" .

echo "=== Running security scan ==="
trivy image --exit-code 1 --severity CRITICAL "${IMAGE}:${VERSION}"

echo "=== Pushing and signing ==="
podman push --sign-by "$GPG_KEY" "${IMAGE}:${VERSION}"

echo "=== Verifying trust ==="
# Reset the local image to force a fresh pull and policy verification
podman rmi "${IMAGE}:${VERSION}" 2>/dev/null || true
podman pull "${IMAGE}:${VERSION}"

echo "=== Podman signature policy verified ==="
echo "Image ${IMAGE}:${VERSION} is built, scanned, signed, and verified by Podman's trust policy"
```

## Monitoring Trust Status

Check the trust status of images in your registry:

```bash
#!/bin/bash
# audit-trust.sh

REGISTRY="registry.example.com"

echo "Image Trust Audit - $(date)"
echo "=========================="

# List all repositories
REPOS=$(curl -s "https://${REGISTRY}/v2/_catalog" | jq -r '.repositories[]')

for repo in $REPOS; do
    TAGS=$(curl -s "https://${REGISTRY}/v2/${repo}/tags/list" | jq -r '.tags[]?' 2>/dev/null)

    for tag in $TAGS; do
        IMAGE="${REGISTRY}/${repo}:${tag}"
        if podman pull --quiet "$IMAGE" > /dev/null 2>&1; then
            echo "TRUSTED:   $IMAGE"
        else
            echo "UNTRUSTED: $IMAGE"
        fi
    done
done
```

## Key Rotation

Rotate signing keys periodically:

```bash
# Rotate the targets key
notary -s https://notary.example.com:4443 key rotate registry.example.com/myapp targets

# Rotate the snapshot key to be server-managed when using delegations
notary -s https://notary.example.com:4443 key rotate registry.example.com/myapp snapshot -r

# Rotate the timestamp key (always managed by the server)
notary -s https://notary.example.com:4443 key rotate registry.example.com/myapp timestamp -r
```

## Emergency Key Revocation

If a signing key is compromised:

```bash
# Remove a compromised delegation key from all delegation roles in the repository
notary -s https://notary.example.com:4443 delegation purge -p \
  registry.example.com/myapp \
  --key compromised-key-id

# Rotate the main targets key if the repository signing key is compromised
notary -s https://notary.example.com:4443 key rotate registry.example.com/myapp targets
```

## Conclusion

Notary and Podman can both participate in an image trust workflow, but they solve different parts of the problem. Notary manages TUF metadata for legacy Docker Content Trust-style clients, while Podman enforces pull-time trust through `policy.json` plus its native signature storage and verification features. By signing images at build time, serving the corresponding signatures, and verifying them at pull time, you prevent unauthorized or tampered images from running in your environment. If you still rely on Notary, publish its metadata separately and treat it as a legacy component now that Notary v1 has been archived.
