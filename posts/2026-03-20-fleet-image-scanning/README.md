# How to Configure Fleet Image Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Security

Description: Learn how to integrate container image scanning with Fleet GitOps deployments to automatically block vulnerable images from being deployed to your clusters.

## Introduction

Integrating image scanning into your Fleet GitOps pipeline adds a security layer that helps ensure only policy-compliant container images are deployed to your Kubernetes clusters. Fleet includes an experimental `imageScans` feature for updating image references in Git, but vulnerability scanning itself still relies on external scanners and admission controllers.

This guide covers how to set up image scanning as a gate in your Fleet deployment pipeline using tools like Trivy, Harbor, and Kubernetes admission controllers.

## Prerequisites

- Fleet installed in Rancher
- Container image registry (Harbor, ECR, or similar)
- Image scanning tool (Trivy, Clair, or registry-native scanning)
- `kubectl` access to Fleet manager and downstream clusters

## Architecture Overview

The image scanning integration in a Fleet pipeline works as follows:

1. Developer pushes code → CI/CD pipeline builds image
2. CI/CD scans the image with Trivy or similar tool
3. If scan passes, image is pushed to the registry
4. CI/CD updates the image tag in the Git repository
5. Fleet detects the Git change and deploys the new image
6. Kubernetes admission controller (optional) validates the image at admission time

## Setting Up Trivy for Pre-Deployment Scanning

### Installing Trivy in CI/CD Pipeline

```bash
# Install Trivy (GitHub Actions example)

# .github/workflows/build-and-scan.yml

# Build and scan the Docker image before pushing
docker build -t my-registry/my-app:${GITHUB_SHA} .

# Scan the image with Trivy
trivy image \
  --exit-code 1 \
  --severity HIGH,CRITICAL \
  --no-progress \
  my-registry/my-app:${GITHUB_SHA}

# If scan passes (exit code 0), push the image
docker push my-registry/my-app:${GITHUB_SHA}
```

### Full CI/CD Pipeline with Image Scanning

```yaml
# .github/workflows/deploy.yml
name: Build, Scan, and Deploy

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  build-scan-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to registry
        uses: docker/login-action@v4
        with:
          registry: ${{ secrets.REGISTRY }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      # Build the container image
      - name: Build image
        run: |
          docker build \
            -t ${{ secrets.REGISTRY }}/my-app:${{ github.sha }} \
            .

      # Scan with Trivy - fail if HIGH or CRITICAL vulns found
      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@v0.36.0
        with:
          image-ref: "${{ secrets.REGISTRY }}/my-app:${{ github.sha }}"
          format: "table"
          exit-code: "1"
          severity: "HIGH,CRITICAL"
          ignore-unfixed: true

      # Push only if scan passed
      - name: Push image
        run: |
          docker push ${{ secrets.REGISTRY }}/my-app:${{ github.sha }}

      # Update the Git repository with new image tag
      - name: Update fleet.yaml with new image tag
        run: |
          sed -i "s|tag:.*|tag: \"${{ github.sha }}\"|g" fleet.yaml
          git config user.email "ci@example.com"
          git config user.name "CI Bot"
          git add fleet.yaml
          git diff --cached --quiet || git commit -m "Update image tag to ${{ github.sha }}"
          git push
```

## Integrating with Harbor Registry

Harbor provides built-in image scanning and project-level vulnerability controls:

### Configure a Harbor Vulnerability Policy

In Harbor, open **Projects** > **my-project** > **Configuration**, then:

- Enable **Automatically scan images on push**
- Enable **Prevent vulnerable images from running**
- Select the severity threshold that should block pulls from the project

### Using Harbor Images by Digest

```yaml
# fleet.yaml - Reference images by digest (immutable) from Harbor
defaultNamespace: my-app

targets:
  - clusterSelector: {}
```

```yaml
# deployment.yaml - Use image digest for immutability
spec:
  template:
    spec:
      containers:
        - name: my-app
          # Use digest instead of tag for immutable references
          image: harbor.example.com/my-project/my-app@sha256:abc123def456...
```

## Kubernetes Admission Controller for Image Policy Enforcement

### Installing Kyverno for Image Policy

```bash
# Install Kyverno admission controller
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
```

### Creating an Approved Registry Policy

```yaml
# kyverno-approved-registry-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-approved-registry
spec:
  background: false
  rules:
    - name: check-image-registry
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
        message: "Images must be pulled from the approved registry"
        pattern:
          spec:
            =(ephemeralContainers):
              - image: "harbor.example.com/*"
            =(initContainers):
              - image: "harbor.example.com/*"
            containers:
              - image: "harbor.example.com/*"
```

## Using Cosign for Image Signing

For cryptographic proof tied to the scanned image:

```bash
# Sign the image after scanning passes
cosign sign \
  --key cosign.key \
  my-registry/my-app:${IMAGE_TAG}

# Add scan attestation to the image
cosign attest \
  --key cosign.key \
  --type vuln \
  --predicate trivy-scan-results.json \
  my-registry/my-app:${IMAGE_TAG}
```

### Verify Image Signatures in Admission Policy

```yaml
# kyverno-verify-signature.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds: [Pod]
      verifyImages:
        - imageReferences:
            - "my-registry/my-app:*"
          failureAction: Enforce
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQY...
                      -----END PUBLIC KEY-----
```

## Setting Up Scan Results in Git

For full auditability, store scan results in Git:

```bash
# Generate scan report and store in repo
mkdir -p scan-results
trivy image \
  --format json \
  --output scan-results/$(date +%Y%m%d)-scan.json \
  my-registry/my-app:${IMAGE_TAG}

git add scan-results/
git commit -m "Add scan results for $(date +%Y-%m-%d)"
git push
```

## Conclusion

Integrating image scanning with Fleet creates a security-first GitOps pipeline where images must satisfy your scanning, registry, and signature policies before they reach your production clusters. The most effective approach combines pre-deployment scanning in CI/CD with Trivy, registry-side controls in Harbor, image signing with Cosign for cryptographic verification, and admission control policies that enforce trusted registries and image signatures at the Kubernetes API level. This defense-in-depth approach ensures that even if a vulnerable image bypasses one control, registry or admission enforcement can still prevent it from running in your clusters.
