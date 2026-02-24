# How to Implement Istio Image Signing and Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Image Signing, Supply Chain, Cosign

Description: How to verify Istio component images using cosign and implement image validation policies for a secure supply chain.

---

Supply chain security has become a serious concern for anyone running infrastructure software. If someone tampers with the Istio container images you deploy, they could inject malicious code into every service in your mesh. Image signing and validation ensures that the Istio images running in your cluster are the exact images published by the Istio project, unmodified.

Here is how to verify Istio images and set up ongoing validation.

## Why Image Signing Matters for Istio

Istio components run in a privileged position. The control plane (istiod) manages certificates, configuration, and security policies for your entire mesh. The sidecar proxies sit in the data path of every request. If any of these images are compromised, the attacker gets access to all mesh traffic.

Image signing provides:

- **Integrity** - Proof that the image has not been modified since it was built
- **Provenance** - Proof that the image was built by the Istio project
- **Non-repudiation** - The signature cannot be forged without the private key

## Verifying Istio Images with Cosign

The Istio project signs all official container images using Sigstore's cosign tool. You can verify the signatures before deploying.

Install cosign:

```bash
# macOS
brew install cosign

# Linux
curl -LO https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

Verify an Istio image:

```bash
# Verify the istiod image
cosign verify docker.io/istio/pilot:1.24.0 \
  --certificate-identity-regexp='https://github.com/istio/release-builder' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com'
```

For proxy images:

```bash
cosign verify docker.io/istio/proxyv2:1.24.0 \
  --certificate-identity-regexp='https://github.com/istio/release-builder' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com'
```

A successful verification shows the signature details and confirms the image is authentic.

## Automating Verification in CI/CD

Add image verification to your deployment pipeline:

```yaml
# .github/workflows/deploy-istio.yml
name: Deploy Istio
on:
  workflow_dispatch:
    inputs:
      istio_version:
        description: 'Istio version to deploy'
        required: true

jobs:
  verify-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Verify Istio images
        run: |
          VERSION=${{ github.event.inputs.istio_version }}

          for image in pilot proxyv2; do
            echo "Verifying docker.io/istio/${image}:${VERSION}"
            cosign verify docker.io/istio/${image}:${VERSION} \
              --certificate-identity-regexp='https://github.com/istio/release-builder' \
              --certificate-oidc-issuer='https://token.actions.githubusercontent.com'
          done

      - name: Deploy Istio
        run: |
          istioctl install --set tag=${{ github.event.inputs.istio_version }}
```

## Using Admission Controllers for Runtime Validation

Verifying images in CI/CD is a good first step, but you should also enforce it at the cluster level. Admission controllers can reject pods that use unverified images.

### Kyverno Policy

Kyverno is a popular policy engine for Kubernetes that supports cosign verification:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-istio-images
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-istio-pilot
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - istio-system
      verifyImages:
        - imageReferences:
            - "docker.io/istio/pilot:*"
            - "docker.io/istio/proxyv2:*"
          attestors:
            - entries:
                - keyless:
                    issuer: "https://token.actions.githubusercontent.com"
                    subjectRegExp: "https://github.com/istio/release-builder.*"
    - name: verify-sidecar-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "docker.io/istio/proxyv2:*"
          attestors:
            - entries:
                - keyless:
                    issuer: "https://token.actions.githubusercontent.com"
                    subjectRegExp: "https://github.com/istio/release-builder.*"
```

### Sigstore Policy Controller

The Sigstore project provides its own admission controller:

```bash
helm repo add sigstore https://sigstore.github.io/helm-charts
helm install policy-controller sigstore/policy-controller -n sigstore-system --create-namespace
```

Create a policy:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: istio-image-policy
spec:
  images:
    - glob: "docker.io/istio/**"
  authorities:
    - keyless:
        identities:
          - issuerRegExp: "https://token.actions.githubusercontent.com"
            subjectRegExp: "https://github.com/istio/release-builder.*"
```

Label namespaces to enforce the policy:

```bash
kubectl label namespace istio-system policy.sigstore.dev/include=true
kubectl label namespace production policy.sigstore.dev/include=true
```

## Verifying SBOM and Provenance

Beyond image signatures, you can verify the Software Bill of Materials (SBOM) and build provenance. Istio publishes SBOM attestations for its releases:

```bash
# Download and verify SBOM
cosign verify-attestation docker.io/istio/pilot:1.24.0 \
  --type spdxjson \
  --certificate-identity-regexp='https://github.com/istio/release-builder' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com'
```

The SBOM tells you exactly what dependencies are included in the image, which is important for vulnerability scanning and compliance.

## Mirroring Verified Images

For air-gapped or security-sensitive environments, mirror verified images to a private registry:

```bash
#!/bin/bash
ISTIO_VERSION="1.24.0"
PRIVATE_REGISTRY="registry.internal.example.com"

IMAGES=(
  "docker.io/istio/pilot"
  "docker.io/istio/proxyv2"
  "docker.io/istio/install-cni"
)

for IMAGE in "${IMAGES[@]}"; do
  # Verify the image first
  cosign verify "${IMAGE}:${ISTIO_VERSION}" \
    --certificate-identity-regexp='https://github.com/istio/release-builder' \
    --certificate-oidc-issuer='https://token.actions.githubusercontent.com'

  if [ $? -eq 0 ]; then
    echo "Verified ${IMAGE}:${ISTIO_VERSION}, mirroring..."

    # Copy image to private registry
    BASENAME=$(basename ${IMAGE})
    crane copy "${IMAGE}:${ISTIO_VERSION}" "${PRIVATE_REGISTRY}/istio/${BASENAME}:${ISTIO_VERSION}"

    # Copy the signature too
    cosign copy "${IMAGE}:${ISTIO_VERSION}" "${PRIVATE_REGISTRY}/istio/${BASENAME}:${ISTIO_VERSION}"
  else
    echo "FAILED to verify ${IMAGE}:${ISTIO_VERSION}"
    exit 1
  fi
done
```

Then configure Istio to use images from your private registry:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: registry.internal.example.com/istio
  tag: 1.24.0
```

## Signing Your Own Wasm Plugins

If you deploy custom Wasm plugins, sign those too:

```bash
# Sign your Wasm plugin OCI image
cosign sign --yes registry.example.com/wasm-plugins/my-plugin:v1.0.0
```

Add verification for your custom images to your Kyverno or Sigstore policy.

## Monitoring for Unsigned Images

Set up alerts for pods running unsigned images:

```bash
# Check for pods with unverified images in Istio namespaces
kubectl get pods -n istio-system -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort | uniq
```

With admission controllers in enforce mode, unsigned images will be rejected at deployment time. But it is still worth monitoring for any gaps in your policies.

Image signing and validation is a foundational security practice. For Istio specifically, the impact of a compromised image is severe because the mesh components have access to all inter-service traffic. Verify before you deploy, enforce at runtime, and mirror to controlled registries.
