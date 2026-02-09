# How to Implement Container Image Signing with Cosign and Kubernetes Admission

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Supply-Chain

Description: Learn how to implement container image signing using Cosign and enforce signature verification through Kubernetes admission controllers for supply chain security.

---

Container image signing provides cryptographic proof that images come from trusted sources and haven't been tampered with. By signing images during your build process and verifying signatures before deployment, you prevent attackers from injecting malicious images into your infrastructure. Cosign and Kubernetes admission webhooks create an end-to-end image signing workflow.

## Understanding Image Signing

Without image signing, anyone with registry push access can upload images under your organization's namespace. An attacker who compromises your registry or build system can push malicious images that your cluster will run without question.

Image signing creates a cryptographic signature tied to the exact image digest. When you pull an image, the admission controller verifies the signature matches and comes from a trusted key. If verification fails, the pod is rejected.

This prevents several attack scenarios: compromised registries serving malicious images, man-in-the-middle attacks injecting code, and insider threats pushing unauthorized images.

## Installing Cosign

Install Cosign on your build system:

```bash
# Download and install Cosign
wget https://github.com/sigstore/cosign/releases/download/v2.2.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign

# Verify installation
cosign version
```

## Generating Signing Keys

Create a key pair for signing images:

```bash
# Generate key pair
cosign generate-key-pair

# This creates:
# - cosign.key (private key - keep secret)
# - cosign.pub (public key - distribute to verifiers)

# Secure the private key
chmod 600 cosign.key

# Store in secure location
mv cosign.key /secure/location/
```

For production, use a KMS or hardware security module:

```bash
# Generate key in Google Cloud KMS
cosign generate-key-pair --kms gcpkms://projects/PROJECT_ID/locations/LOCATION/keyRings/RING/cryptoKeys/KEY

# Generate key in AWS KMS
cosign generate-key-pair --kms awskms://alias/cosign-key

# Generate key in Azure Key Vault
cosign generate-key-pair --kms azurekms://[VAULT_NAME][VAULT_URI]/[KEY_NAME]
```

## Signing Container Images

Sign images after building:

```bash
# Build and push image
docker build -t myregistry.com/myapp:v1.0.0 .
docker push myregistry.com/myapp:v1.0.0

# Sign the image
cosign sign --key cosign.key myregistry.com/myapp:v1.0.0

# Enter passphrase for private key
# Signature stored in registry alongside image
```

Integrate signing into CI/CD:

```yaml
# GitHub Actions example
name: Build and Sign
on:
  push:
    branches: [main]

jobs:
  build-sign:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build image
      run: |
        docker build -t ${{ secrets.REGISTRY }}/myapp:${{ github.sha }} .

    - name: Push image
      run: |
        echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin ${{ secrets.REGISTRY }}
        docker push ${{ secrets.REGISTRY }}/myapp:${{ github.sha }}

    - name: Install Cosign
      uses: sigstore/cosign-installer@v3

    - name: Sign image
      run: |
        cosign sign --key env://COSIGN_KEY ${{ secrets.REGISTRY }}/myapp:${{ github.sha }}
      env:
        COSIGN_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
        COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
```

## Verifying Signatures Manually

Test signature verification:

```bash
# Verify signature
cosign verify --key cosign.pub myregistry.com/myapp:v1.0.0

# Output shows signature verification success:
# Verification for myregistry.com/myapp:v1.0.0 --
# The following checks were performed on each of these signatures:
#   - The cosign claims were validated
#   - The signatures were verified against the specified public key

# For KMS keys
cosign verify --key gcpkms://projects/PROJECT_ID/locations/LOCATION/keyRings/RING/cryptoKeys/KEY \
  myregistry.com/myapp:v1.0.0
```

## Installing Policy Controller

Deploy Sigstore Policy Controller for admission control:

```bash
# Install cert-manager (required dependency)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available -n cert-manager deployment/cert-manager --timeout=300s

# Install Policy Controller
kubectl apply -f https://github.com/sigstore/policy-controller/releases/download/v0.8.0/release.yaml

# Verify installation
kubectl get pods -n cosign-system
```

## Creating Image Policies

Define which images must be signed:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: signed-images-policy
spec:
  images:
  - glob: "myregistry.com/**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
        -----END PUBLIC KEY-----
---
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: kms-signed-policy
spec:
  images:
  - glob: "gcr.io/myproject/**"
  authorities:
  - key:
      kms: gcpkms://projects/PROJECT_ID/locations/us-central1/keyRings/cosign/cryptoKeys/cosign-key
```

## Testing Admission Control

Test that unsigned images are rejected:

```bash
# Try to run unsigned image
kubectl run test --image=myregistry.com/unsigned:latest

# Should fail with:
# Error: admission webhook "policy.sigstore.dev" denied the request: validation failed: no matching signatures

# Try to run signed image
kubectl run test --image=myregistry.com/myapp:v1.0.0

# Should succeed if properly signed
```

## Namespace-Specific Policies

Apply different policies to different namespaces:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: production-strict-policy
spec:
  match:
  - namespaces:
    - production
    - critical-services
  images:
  - glob: "**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
        -----END PUBLIC KEY-----
  mode: enforce
---
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: dev-warn-policy
spec:
  match:
  - namespaces:
    - development
    - staging
  images:
  - glob: "myregistry.com/**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
        -----END PUBLIC KEY-----
  mode: warn
```

## Keyless Signing with OIDC

Use keyless signing for simpler key management:

```bash
# Sign with keyless mode (uses Fulcio and Rekor)
cosign sign myregistry.com/myapp:v1.0.0

# Browser opens for OIDC authentication
# Signature stored in transparency log

# Verify keyless signature
cosign verify \
  --certificate-identity=user@example.com \
  --certificate-oidc-issuer=https://accounts.google.com \
  myregistry.com/myapp:v1.0.0
```

Configure policy for keyless verification:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: keyless-policy
spec:
  images:
  - glob: "myregistry.com/**"
  authorities:
  - keyless:
      url: https://fulcio.sigstore.dev
      identities:
      - issuer: https://accounts.google.com
        subject: user@example.com
```

## Multi-Signature Requirements

Require multiple signatures from different authorities:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: multi-sig-policy
spec:
  images:
  - glob: "myregistry.com/critical/**"
  authorities:
  - name: security-team
    key:
      data: |
        -----BEGIN PUBLIC KEY-----
        ...security team public key...
        -----END PUBLIC KEY-----
  - name: release-team
    key:
      data: |
        -----BEGIN PUBLIC KEY-----
        ...release team public key...
        -----END PUBLIC KEY-----
  policy:
    type: cue
    data: |
      package main

      import "time"

      // Require both signatures
      authorizations: {
        "security-team": true
        "release-team": true
      }
```

## Attestations and SBOMs

Sign attestations about image contents:

```bash
# Generate SBOM
syft myregistry.com/myapp:v1.0.0 -o spdx-json > sbom.json

# Attest and sign the SBOM
cosign attest --key cosign.key --predicate sbom.json myregistry.com/myapp:v1.0.0

# Verify attestation
cosign verify-attestation --key cosign.pub --type spdx myregistry.com/myapp:v1.0.0
```

Require attestation verification:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: attestation-policy
spec:
  images:
  - glob: "myregistry.com/**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        ...
        -----END PUBLIC KEY-----
    attestations:
    - name: sbom
      predicateType: spdx
      policy:
        type: cue
        data: |
          predicate: {
            SPDXID: "SPDXRef-DOCUMENT"
          }
```

## Monitoring and Alerting

Track verification failures:

```bash
# Check policy controller logs
kubectl logs -n cosign-system deployment/policy-controller-webhook

# Set up alerts for rejections
kubectl get events --all-namespaces | grep "validation failed"

# Create Prometheus alerts
```

Prometheus alerting rule:

```yaml
groups:
- name: image-signing
  rules:
  - alert: UnsignedImageAttempt
    expr: increase(policy_controller_validations_total{result="deny"}[5m]) > 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Unsigned image deployment attempted"
      description: "{{ $value }} unsigned image deployments blocked in last 5 minutes"
```

## Exemptions for System Images

Exempt trusted system images:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: allow-system-images
spec:
  match:
  - namespaces:
    - kube-system
  images:
  - glob: "k8s.gcr.io/**"
  - glob: "docker.io/library/**"
  mode: warn
```

## Rotating Signing Keys

Implement key rotation:

```bash
# Generate new key pair
cosign generate-key-pair

# Sign images with new key
cosign sign --key cosign-new.key myregistry.com/myapp:v2.0.0

# Update ClusterImagePolicy with both keys during transition
```

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: key-rotation-policy
spec:
  images:
  - glob: "myregistry.com/**"
  authorities:
  - name: current-key
    key:
      data: |
        -----BEGIN PUBLIC KEY-----
        ...old key...
        -----END PUBLIC KEY-----
  - name: new-key
    key:
      data: |
        -----BEGIN PUBLIC KEY-----
        ...new key...
        -----END PUBLIC KEY-----
```

## Best Practices

Sign all production images as part of your CI/CD pipeline. Make signing a required step that cannot be bypassed.

Use KMS for production signing keys rather than storing keys in CI systems. This provides better key security and audit trails.

Implement keyless signing where appropriate to eliminate key management complexity.

Start with warn mode in development, enforce in production. This allows teams to adapt while maintaining security.

Regularly audit which images are running unsigned. Track exemptions and work to eliminate them.

Combine image signing with other supply chain security measures like vulnerability scanning and SBOM generation.

## Conclusion

Container image signing with Cosign and admission control provides strong supply chain security for Kubernetes. By cryptographically verifying image authenticity, you prevent malicious or compromised images from running in your cluster. Implement signing incrementally, starting with critical workloads, then expanding to cover all production deployments.
