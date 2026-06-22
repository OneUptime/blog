# How to Use Docker Content Trust for Image Signing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Content Trust, Image Signing, Notary

Description: Learn how to use Docker Content Trust (DCT) to sign and verify Docker images, ensuring image integrity and publisher authenticity in your container deployments.

---

Docker Content Trust (DCT) provides cryptographic verification of image publishers and integrity. When enabled in the Docker client, Docker only pulls images that are signed by trusted publishers, protecting against tampered or malicious images.

Note: Docker is retiring Docker Content Trust. Docker's Notary v1 service at `notary.docker.io` is scheduled to shut down on December 8, 2026.

## How Content Trust Works

```mermaid
flowchart TB
    subgraph publishing["Image Publishing with DCT"]
        direction TB
        PK["Private Key"] -->|"Signs"| SM["Signed Metadata"]
        SM --> NS1["Notary Server"]
        SM --> DR1["Docker Registry"]
        NS1 --> DR1
    end
    
    subgraph pulling["Image Pulling with DCT"]
        direction TB
        C["Consumer"] --> NS2["Notary Server"]
        NS2 --> VS["Verify Signature"]
        NS2 --> DR2["Docker Registry"]
        VS --> PV["Pull if Valid"]
        DR2 --> PV
    end
```

## Enabling Content Trust

### Environment Variable

```bash
# Enable for current session

export DOCKER_CONTENT_TRUST=1

# Enable globally in shell profile
echo 'export DOCKER_CONTENT_TRUST=1' >> ~/.bashrc

# Disable temporarily for a single command
DOCKER_CONTENT_TRUST=0 docker pull untrusted-image
```

### Mirantis Container Runtime Configuration

```json
{
  "content-trust": {
    "mode": "enforced"
  }
}
```

The `content-trust` daemon configuration is for Mirantis Container Runtime runtime enforcement. It is not available in Docker CE or Moby.

## Signing Images

### First-Time Signing

```bash
# Enable content trust
export DOCKER_CONTENT_TRUST=1

# Build and tag image
docker build -t myregistry/myapp:1.0 .

# Push (will prompt for passphrases to create keys)
docker push myregistry/myapp:1.0
# You will be asked to create:
# - Root key (offline key, keep very secure)
# - Repository key (for signing this repo)
```

### Key Management

```bash
# List local Notary signing keys
notary key list

# Generate new delegation key
docker trust key generate mykey

# Add signer to repository
docker trust signer add --key mykey.pub myname myregistry/myapp

# View trust data for image
docker trust inspect --pretty myregistry/myapp
```

### Signing with Existing Keys

```bash
# Load an existing key
docker trust key load --name mykey private-key.pem

# Sign and push
docker trust sign myregistry/myapp:1.0
```

## Inspecting Signed Images

### View Trust Information

```bash
# Detailed trust info
docker trust inspect myregistry/myapp:1.0

# Pretty-printed format
docker trust inspect --pretty myregistry/myapp:1.0

# Output example:
# Signatures for myregistry/myapp:1.0
# SIGNED TAG    DIGEST                                                             SIGNERS
# 1.0           abc123...                                                          myname
#
# List of signers and their keys for myregistry/myapp:1.0
# SIGNER    KEYS
# myname    key123...
```

### Verify Before Pull

```bash
# With DCT enabled, this verifies signature before pulling
docker pull myregistry/myapp:1.0

# If not signed, you'll see:
# Error: remote trust data does not exist
```

## Delegation and Team Signing

### Set Up Delegation

```bash
# Repository owner adds a delegation role
docker trust signer add --key developer1.pub dev1 myregistry/myapp

# Developer signs their builds
docker trust sign myregistry/myapp:feature-x

# View all signers
docker trust inspect --pretty myregistry/myapp
```

### CI/CD Integration

```yaml
# GitHub Actions with DCT
name: Build and Sign

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Import Signing Key
        env:
          DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE: ${{ secrets.DCT_PASSPHRASE }}
        run: |
          echo "${{ secrets.DCT_KEY }}" | base64 -d > key.pem
          docker trust key load --name ci-signer key.pem

      - name: Build and Push
        env:
          DOCKER_CONTENT_TRUST: 1
          DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE: ${{ secrets.DCT_PASSPHRASE }}
        run: |
          docker build -t myregistry/myapp:${{ github.ref_name }} .
          docker push myregistry/myapp:${{ github.ref_name }}
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        DOCKER_CONTENT_TRUST = '1'
        DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE = credentials('dct-passphrase')
    }

    stages {
        stage('Build') {
            steps {
                sh 'docker build -t myregistry/myapp:${BUILD_NUMBER} .'
            }
        }

        stage('Sign and Push') {
            steps {
                withCredentials([file(credentialsId: 'dct-key', variable: 'KEY_FILE')]) {
                    sh '''
                        docker trust key load --name jenkins ${KEY_FILE}
                        docker push myregistry/myapp:${BUILD_NUMBER}
                    '''
                }
            }
        }
    }
}
```

## Key Security Best Practices

### Root Key Protection

```bash
# Trust key location
~/.docker/trust/private/

# Backup trust keys securely
umask 077; tar -czf docker-trust-keys-backup.tar.gz ~/.docker/trust/private; umask 022

# Store offline (USB drive, HSM, secure vault)
# Never store root key in CI/CD systems
```

### Key Rotation

```bash
# Rotate delegation key
docker trust key generate new-repo-key
docker trust signer add --key new-repo-key.pub newkey myregistry/myapp

# Remove old delegation
docker trust signer remove oldkey myregistry/myapp

# Rotate root key (requires offline root key)
# This is an advanced operation - consult documentation
```

### Hardware Storage and Signing

```bash
# Docker Content Trust supports hardware storage for root keys with YubiKey 4.
# Initialize trust while the YubiKey is available; Docker will prefer it for the root key.
export DOCKER_CONTENT_TRUST=1
docker trust signer add --key developer1.pub dev1 myregistry/myapp
```

## Enforcement Policies

### Docker Daemon Enforcement

```json
{
  "content-trust": {
    "mode": "enforced",
    "allow-expired-cached-trust-data": false
  }
}
```

This runtime enforcement configuration applies to Mirantis Container Runtime, not Docker CE or Moby.

### Kubernetes Admission Control

```yaml
# Using Connaisseur for DCT enforcement in Kubernetes
apiVersion: v1
kind: ConfigMap
metadata:
  name: connaisseur-config
data:
  config.yaml: |
    validators:
      - name: dockerhub
        type: notaryv1
        host: notary.docker.io
        trust_roots:
          - name: default
            key: |
              -----BEGIN PUBLIC KEY-----
              ...
              -----END PUBLIC KEY-----
    policy:
      - pattern: "docker.io/library/*"
        validator: dockerhub
      - pattern: "*"
        validator: deny
```

### Open Policy Agent (OPA)

```rego
# policy.rego
package docker.trust

default allow = false

allow {
    input.image.signed == true
    input.image.signer == "trusted-signer"
}

deny[msg] {
    not input.image.signed
    msg := sprintf("Image %v is not signed", [input.image.name])
}
```

## Notary Server Setup

### Self-Hosted Notary

```bash
# Clone the official Notary repository and start its included Compose setup.
git clone https://github.com/notaryproject/notary.git
cd notary
docker compose up -d
```

### Configure Client for Custom Notary

```bash
# Point to custom Notary server
export DOCKER_CONTENT_TRUST_SERVER=https://notary.example.com
```

## Troubleshooting

### Common Errors

```bash
# "remote trust data does not exist"
# Image is not signed - either sign it or disable DCT
DOCKER_CONTENT_TRUST=0 docker pull unsigned-image

# "could not rotate trust to a new trusted root"
# Root key issue - check ~/.docker/trust/private/

# "passphrase is incorrect"
# Wrong passphrase for repository key
# Reset with: notary key rotate <repo> targets
```

### Debug Mode

```bash
# Enable Docker CLI debug output
docker --debug push myregistry/myapp:1.0
```

### Reset Trust Data

```bash
# Remove local trust data (careful!)
rm -rf ~/.docker/trust

# Delete trust data from Notary
notary delete myregistry/myapp --remote
```

## Complete CI/CD Example

```yaml
# .github/workflows/signed-release.yml
name: Signed Release

on:
  release:
    types: [published]

jobs:
  build-sign-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ vars.REGISTRY }}
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Setup DCT
        env:
          DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE: ${{ secrets.DCT_PASSPHRASE }}
        run: |
          echo "${{ secrets.DCT_DELEGATION_KEY }}" | base64 -d > delegation.key
          docker trust key load --name ci-signer delegation.key

      - name: Build Image
        run: |
          docker build -t ${{ vars.REGISTRY }}/myapp:${{ github.event.release.tag_name }} .

      - name: Sign and Push
        env:
          DOCKER_CONTENT_TRUST: 1
          DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE: ${{ secrets.DCT_PASSPHRASE }}
        run: |
          docker push ${{ vars.REGISTRY }}/myapp:${{ github.event.release.tag_name }}

      - name: Verify Signature
        run: |
          docker trust inspect --pretty ${{ vars.REGISTRY }}/myapp:${{ github.event.release.tag_name }}
```

## Summary

| Feature | Description |
|---------|-------------|
| Root Key | Offline master key, highest security |
| Repository Key | Signs specific repository tags |
| Delegation Keys | Team member signing authority |
| Notary Server | Stores and serves trust metadata |
| Enforcement | Prevents pulling unsigned images |

Docker Content Trust ensures image integrity and authenticity through cryptographic signing. Protect your root keys offline, use delegation for team workflows, and enforce signing in production environments. For comprehensive container security, combine DCT with vulnerability scanning as described in our post on [Scanning Docker Images with Trivy](https://oneuptime.com/blog/post/2026-01-16-docker-scan-images-trivy/view).
