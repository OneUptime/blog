# How to Configure NeuVector Sigstore Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Sigstore, Image Signing, Supply Chain Security, Container Security

Description: Configure NeuVector to verify Sigstore/Cosign image signatures as part of admission control, ensuring only signed and verified images run in your cluster.

## Introduction

Sigstore is an open-source project that provides tools for signing, verifying, and protecting software supply chains. Cosign, part of the Sigstore ecosystem, enables container image signing with keyless or key-based signatures. NeuVector's Sigstore integration allows you to enforce image signature verification as an admission control requirement, ensuring that only verified images from trusted sources run in your cluster.

## Why Image Signing Matters

Image signing provides:

- **Supply chain integrity**: Verifies images haven't been tampered with
- **Provenance tracking**: Identifies who built and signed the image
- **Policy enforcement**: Block unsigned or improperly signed images
- **Compliance**: Meets requirements for software supply chain security (SLSA, NIST SSDF)

## Prerequisites

- NeuVector installed and running
- Cosign CLI installed
- Container registry that supports OCI artifacts (Harbor, ECR, GCR, Docker Hub)
- NeuVector Manager access

## Step 1: Install Cosign

```bash
# Install Cosign CLI

# On macOS
brew install cosign

# On Linux
curl -Lo cosign https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
chmod +x cosign
sudo mv cosign /usr/local/bin/

# Verify installation
cosign version
```

## Step 2: Generate a Signing Key Pair

```bash
# Generate a key pair for signing images
# This creates cosign.key (private) and cosign.pub (public)
cosign generate-key-pair

# Store the private key securely (e.g., in a Kubernetes secret for CI/CD)
kubectl create secret generic cosign-key \
  --from-file=cosign.key \
  -n ci-cd

# The public key (cosign.pub) is used for verification
# Store it where NeuVector can access it
cat cosign.pub
```

## Step 3: Sign Container Images

Sign images in your CI/CD pipeline:

```bash
# Sign an image after building and pushing
IMAGE="registry.company.com/myapp:v1.0.0"

# Method 1: Key-based signing
cosign sign --key cosign.key ${IMAGE}

# Method 2: Keyless signing (uses Sigstore's public good infrastructure)
cosign sign ${IMAGE}

# Verify the signature
cosign verify --key cosign.pub ${IMAGE}
```

GitHub Actions signing example:

```yaml
# .github/workflows/sign-image.yml
- name: Install Cosign
  uses: sigstore/cosign-installer@v3

- name: Sign image
  env:
    COSIGN_PRIVATE_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
    COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
  run: |
    cosign sign --key env://COSIGN_PRIVATE_KEY \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

## Step 4: Configure NeuVector Signature Verification

Create a sigstore root of trust in NeuVector, then add the public key as a verifier under it:

```bash
# Create a sigstore root of trust (public root, key-pair only)
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/sigstore/root_of_trust" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "name": "company-signing-key",
    "rootless_keypairs_only": true,
    "comment": "Company production image signing key"
  }'

# Add a keypair verifier under the root of trust
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/sigstore/root_of_trust/company-signing-key/verifier" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "name": "prod-signing-key",
    "verifier_type": "keypair",
    "public_key": "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----",
    "comment": "Production CI/CD signing key"
  }'
```

## Step 5: Create Admission Control Rule for Signed Images

Require image signing via admission control:

```bash
# Create admission rule to deny unsigned images
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Require valid image signature",
      "criteria": [
        {
          "name": "imageSigned",
          "op": "=",
          "value": "false"
        }
      ],
      "rule_type": "deny",
      "cfg_type": "user_created"
    }
  }'
```

## Step 6: Add a Keyless Verifier for Workflow-Signed Images

Add a keyless verifier under the same root of trust to also accept signatures from a specific OIDC identity (for example, a GitHub Actions workflow):

```bash
# Add a keyless verifier (e.g., GitHub Actions OIDC identity)
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/sigstore/root_of_trust/company-signing-key/verifier" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "name": "github-actions-verifier",
    "verifier_type": "keyless",
    "cert_issuer": "https://token.actions.githubusercontent.com",
    "cert_subject": "https://github.com/company/repo/.github/workflows/sign-image.yml@refs/heads/main",
    "comment": "Verify keyless signatures from company GitHub Actions workflow"
  }'
```

## Step 7: Allow Exceptions for System Images

Exclude system images from signing requirements:

```bash
# Create an exception for kube-system namespace
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Allow unsigned images in system namespaces",
      "criteria": [
        {
          "name": "namespace",
          "op": "containsAny",
          "value": "kube-system, kube-public, cattle-system, neuvector"
        }
      ],
      "rule_type": "exception",
      "cfg_type": "user_created"
    }
  }'
```

## Step 8: Verify Signature Policy in Practice

Test the signature enforcement:

```bash
# Test 1: Deploy a signed image (should succeed)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: signed-app
  namespace: default
spec:
  containers:
  - name: app
    image: registry.company.com/myapp:v1.0.0  # This image is signed
EOF

# Test 2: Deploy an unsigned image (should be blocked)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: unsigned-app
  namespace: default
spec:
  containers:
  - name: app
    image: nginx:latest  # This image is not signed with company key
EOF
# Expected: Admission webhook denied the request
```

## Conclusion

NeuVector's Sigstore integration adds supply chain security enforcement to your container admission control workflow. By requiring that all production images are signed with known keys, you prevent unauthorized or tampered images from running in your cluster. Combined with NeuVector's vulnerability scanning and runtime security, Sigstore signature verification creates a comprehensive defense against supply chain attacks - ensuring images are both signed and free of known vulnerabilities before they reach production.
