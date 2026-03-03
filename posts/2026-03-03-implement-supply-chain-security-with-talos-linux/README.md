# How to Implement Supply Chain Security with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Supply Chain Security, Kubernetes, Container Security, Sigstore

Description: Learn how to implement supply chain security practices with Talos Linux, from image verification to SBOM generation and secure boot chains.

---

Software supply chain attacks have become one of the most pressing concerns in modern infrastructure. When you run Kubernetes in production, your supply chain includes everything from the operating system image to the container images running your workloads. Talos Linux takes supply chain security seriously by providing verifiable images, reproducible builds, and integration points for your own verification workflows.

This guide covers how to leverage Talos Linux's built-in supply chain security features and extend them with additional tooling for a comprehensive approach.

## Understanding the Talos Supply Chain

Talos Linux differs from traditional operating systems in how it is distributed and updated. Instead of installing packages from repositories, Talos ships as a single signed image. This fundamentally changes the supply chain model.

With a traditional Linux distribution, your supply chain looks like this: base image, package repositories, package managers, configuration management tools, and custom scripts. Each of these introduces a trust boundary. With Talos, the supply chain is simplified: you have the Talos image itself, your machine configuration, and your container images. That is it.

## Verifying Talos Images

Every official Talos release is signed and can be verified before deployment. Here is how to verify a Talos image:

```bash
# Download the Talos image and its signature
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/talos-amd64.iso
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/talos-amd64.iso.sig

# Verify the signature using cosign
cosign verify-blob \
  --signature talos-amd64.iso.sig \
  --certificate-identity-regexp "https://github.com/siderolabs/talos" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  talos-amd64.iso
```

You can also verify the container images that make up Talos:

```bash
# Verify the Talos installer image
cosign verify \
  --certificate-identity-regexp "https://github.com/siderolabs/talos" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/siderolabs/installer:v1.7.0
```

## Working with SBOMs

Talos Linux publishes Software Bill of Materials (SBOM) documents for its releases. SBOMs let you inspect exactly what components are included in the image and cross-reference them against vulnerability databases.

```bash
# Download the SBOM for a Talos release
cosign download sbom ghcr.io/siderolabs/talos:v1.7.0 > talos-sbom.json

# Inspect the SBOM contents
cat talos-sbom.json | jq '.components | length'

# Scan the SBOM for known vulnerabilities using grype
grype sbom:talos-sbom.json
```

You can integrate SBOM scanning into your CI/CD pipeline to catch vulnerabilities before they reach production:

```yaml
# .github/workflows/supply-chain-check.yaml
# Verify Talos images and scan SBOMs in CI
name: Supply Chain Verification
on:
  schedule:
    - cron: "0 6 * * 1"  # Weekly on Monday
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Verify Talos Image
        run: |
          cosign verify \
            --certificate-identity-regexp "https://github.com/siderolabs/talos" \
            --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
            ghcr.io/siderolabs/installer:v1.7.0

      - name: Download and Scan SBOM
        run: |
          cosign download sbom ghcr.io/siderolabs/talos:v1.7.0 > sbom.json
          grype sbom:sbom.json --fail-on critical
```

## Securing Your Container Image Supply Chain

While Talos secures the OS layer, you also need to secure the container images running on your cluster. Talos integrates well with admission controllers that enforce image verification policies.

### Setting Up Sigstore Policy Controller

Deploy the Sigstore policy controller to enforce image signature verification:

```bash
# Install the Sigstore policy controller using Helm
helm repo add sigstore https://sigstore.github.io/helm-charts
helm install policy-controller sigstore/policy-controller \
  --namespace cosign-system \
  --create-namespace
```

Create a policy that requires all images to be signed:

```yaml
# image-policy.yaml
# Require all container images to be signed with cosign
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: require-signed-images
spec:
  images:
    - glob: "ghcr.io/your-org/**"
  authorities:
    - keyless:
        url: https://fulcio.sigstore.dev
        identities:
          - issuer: https://token.actions.githubusercontent.com
            subjectRegExp: "https://github.com/your-org/.*"
```

```bash
# Apply the image policy
kubectl apply -f image-policy.yaml

# Label a namespace to enforce the policy
kubectl label namespace production policy.sigstore.dev/include=true
```

## Building a Secure Image Pipeline

For your own application images, set up a pipeline that signs images during the build process:

```bash
# Build and push your container image
docker build -t ghcr.io/your-org/myapp:v1.0.0 .
docker push ghcr.io/your-org/myapp:v1.0.0

# Sign the image using cosign with keyless signing
cosign sign ghcr.io/your-org/myapp:v1.0.0

# Attach an SBOM to the image
syft ghcr.io/your-org/myapp:v1.0.0 -o spdx-json > app-sbom.json
cosign attach sbom --sbom app-sbom.json ghcr.io/your-org/myapp:v1.0.0

# Attest the SBOM
cosign attest --predicate app-sbom.json \
  --type spdxjson \
  ghcr.io/your-org/myapp:v1.0.0
```

## Talos Image Factory

The Talos Image Factory allows you to build custom Talos images with additional system extensions while maintaining supply chain integrity. Every image produced by the factory is signed and verifiable.

```bash
# Generate a custom Talos image with specific extensions using the Image Factory
# The schematic defines which extensions to include
cat > schematic.yaml <<'SCHEMATICEOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/intel-ucode
      - siderolabs/i915-ucode
SCHEMATICEOF

# Upload the schematic to the Image Factory
curl -X POST --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/x-yaml"

# The response gives you an image ID that you can use to pull a verified image
# Example: factory.talos.dev/installer/<schematic-id>:v1.7.0
```

## Implementing Runtime Verification

Beyond build-time checks, you should also verify supply chain integrity at runtime. Use Kubernetes admission webhooks to check images as they are deployed:

```yaml
# runtime-verification-policy.yaml
# Verify images at admission time
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-verification
webhooks:
  - name: verify.images.example.com
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
    clientConfig:
      service:
        name: policy-controller-webhook
        namespace: cosign-system
        path: "/validate"
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
```

## Monitoring Supply Chain Health

Set up ongoing monitoring to detect supply chain issues:

```bash
# Create a script that runs periodic supply chain checks
#!/bin/bash
# supply-chain-monitor.sh
# Periodically verify Talos image signatures and scan for CVEs

TALOS_VERSION=$(talosctl version --client --short)

# Verify the running Talos version signature
cosign verify \
  --certificate-identity-regexp "https://github.com/siderolabs/talos" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "ghcr.io/siderolabs/installer:${TALOS_VERSION}" 2>&1

if [ $? -ne 0 ]; then
  echo "WARNING: Talos image signature verification failed"
  # Send alert to your monitoring system
fi

# Check for new CVEs against the current SBOM
cosign download sbom "ghcr.io/siderolabs/talos:${TALOS_VERSION}" | \
  grype sbom:/dev/stdin --fail-on critical
```

## Pinning Image Digests

For the strongest supply chain guarantees, reference images by their digest rather than by tag. Tags can be overwritten, but digests are immutable:

```yaml
# machine-config-patch.yaml
# Pin the Talos installer image by digest for immutability
machine:
  install:
    image: ghcr.io/siderolabs/installer@sha256:abc123...
```

For your workload deployments:

```yaml
# deployment.yaml
# Use digest-pinned images for production workloads
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          image: ghcr.io/your-org/myapp@sha256:def456...
```

## Conclusion

Supply chain security with Talos Linux starts from a strong foundation. The immutable, signed OS image eliminates entire categories of supply chain risk. By extending this with container image signing, SBOM generation, and admission-time verification, you build a defense-in-depth approach that makes your Kubernetes infrastructure resilient against supply chain attacks. The key is to automate these checks so they run continuously rather than just at deployment time.
