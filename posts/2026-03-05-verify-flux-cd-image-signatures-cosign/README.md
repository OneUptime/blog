# How to Verify Flux CD Container Image Signatures with Cosign

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Cosign, Image Signing, Supply Chain

Description: Learn how to verify the authenticity of Flux CD container images using Cosign to ensure you are running trusted, unmodified controller images.

---

Flux CD publishes signed container images for all its controllers. Verifying these signatures before deploying Flux ensures that the images have not been tampered with and were built by the Flux project. This guide shows you how to verify Flux CD image signatures using Cosign.

## Prerequisites

Install Cosign on your machine:

```bash
# Install Cosign via Homebrew (macOS/Linux)
brew install cosign

# Or download directly from GitHub releases
curl -LO https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign

# Verify the installation
cosign version
```

## Understanding Flux CD Image Signing

Flux CD signs all its container images using keyless signing through Sigstore. This means signatures are tied to the Flux project's identity via OIDC (OpenID Connect) rather than a static key. The signing identity is the Flux project's GitHub Actions workflow.

## Step 1: Identify Flux CD Images

List the Flux CD controller images you need to verify:

```bash
# List all container images used by Flux controllers
kubectl get deployments -n flux-system -o jsonpath='{range .items[*]}{.spec.template.spec.containers[*].image}{"\n"}{end}'

# Typical Flux CD images:
# ghcr.io/fluxcd/source-controller:v1.x.x
# ghcr.io/fluxcd/kustomize-controller:v1.x.x
# ghcr.io/fluxcd/helm-controller:v1.x.x
# ghcr.io/fluxcd/notification-controller:v1.x.x
```

## Step 2: Verify Image Signatures with Cosign

Verify each Flux controller image using Cosign's keyless verification. The certificate identity and issuer must match the Flux project's GitHub Actions workflow:

```bash
# Verify source-controller image signature
cosign verify ghcr.io/fluxcd/source-controller:v1.4.1 \
  --certificate-identity-regexp="^https://github.com/fluxcd/source-controller/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Verify kustomize-controller image signature
cosign verify ghcr.io/fluxcd/kustomize-controller:v1.4.0 \
  --certificate-identity-regexp="^https://github.com/fluxcd/kustomize-controller/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Verify helm-controller image signature
cosign verify ghcr.io/fluxcd/helm-controller:v1.1.0 \
  --certificate-identity-regexp="^https://github.com/fluxcd/helm-controller/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Verify notification-controller image signature
cosign verify ghcr.io/fluxcd/notification-controller:v1.4.0 \
  --certificate-identity-regexp="^https://github.com/fluxcd/notification-controller/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

## Step 3: Verify All Flux Images with a Script

Automate the verification of all Flux controller images:

```bash
#!/bin/bash
# verify-flux-images.sh
# Verifies all Flux CD controller image signatures using Cosign

FLUX_IMAGES=$(kubectl get deployments -n flux-system \
  -o jsonpath='{range .items[*]}{.spec.template.spec.containers[*].image}{"\n"}{end}')

OIDC_ISSUER="https://token.actions.githubusercontent.com"
PASS=0
FAIL=0

for IMAGE in $FLUX_IMAGES; do
  # Extract the controller name from the image path
  CONTROLLER=$(echo "$IMAGE" | sed 's|.*/\(.*\):.*|\1|')
  IDENTITY="^https://github.com/fluxcd/${CONTROLLER}/.*"

  echo "Verifying: $IMAGE"
  if cosign verify "$IMAGE" \
    --certificate-identity-regexp="$IDENTITY" \
    --certificate-oidc-issuer="$OIDC_ISSUER" > /dev/null 2>&1; then
    echo "  PASSED: Signature verified"
    PASS=$((PASS + 1))
  else
    echo "  FAILED: Signature verification failed"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"
if [ $FAIL -gt 0 ]; then
  exit 1
fi
```

Run the script:

```bash
chmod +x verify-flux-images.sh
./verify-flux-images.sh
```

## Step 4: Inspect Signature Details

You can inspect the full certificate details of a signed image:

```bash
# View the full signature payload and certificate
cosign verify ghcr.io/fluxcd/source-controller:v1.4.1 \
  --certificate-identity-regexp="^https://github.com/fluxcd/source-controller/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  --output text

# View signature annotations in JSON format
cosign verify ghcr.io/fluxcd/source-controller:v1.4.1 \
  --certificate-identity-regexp="^https://github.com/fluxcd/source-controller/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  --output json | jq '.[0].optional'
```

## Step 5: Integrate Verification into CI/CD

Add image verification as a step in your CI/CD pipeline before deploying or upgrading Flux:

```yaml
# .github/workflows/verify-flux.yaml
# GitHub Actions workflow to verify Flux images before deployment
name: Verify Flux Images
on:
  push:
    paths:
      - 'clusters/**/flux-system/**'
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Extract Flux image versions
        run: |
          # Extract images from gotk-components.yaml
          grep "image:" clusters/production/flux-system/gotk-components.yaml \
            | awk '{print $2}' | sort -u > flux-images.txt

      - name: Verify all Flux images
        run: |
          while IFS= read -r IMAGE; do
            CONTROLLER=$(echo "$IMAGE" | sed 's|.*/\(.*\):.*|\1|')
            echo "Verifying $IMAGE..."
            cosign verify "$IMAGE" \
              --certificate-identity-regexp="^https://github.com/fluxcd/${CONTROLLER}/.*" \
              --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
          done < flux-images.txt
```

## Step 6: Enforce Image Verification in the Cluster

Use a policy engine to enforce that only signed Flux images can run in the cluster. Here is an example using Kyverno:

```yaml
# kyverno-verify-flux-images.yaml
# Kyverno policy to enforce Cosign signatures on Flux controller images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-flux-images
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-flux-image-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - flux-system
      verifyImages:
        - imageReferences:
            - "ghcr.io/fluxcd/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/fluxcd/*"
                    issuer: "https://token.actions.githubusercontent.com"
```

## Best Practices

1. **Always verify before upgrading**: Run Cosign verification before applying Flux upgrades to catch supply chain attacks.
2. **Automate verification in CI**: Never rely on manual verification alone; integrate it into your deployment pipeline.
3. **Enforce in-cluster**: Use Kyverno or OPA Gatekeeper to prevent unsigned images from running.
4. **Pin image digests**: Use image digests instead of tags to prevent tag mutation attacks.
5. **Monitor for new releases**: Use Flux image automation to track new Flux releases, but always verify signatures first.

Verifying Flux CD image signatures is a fundamental supply chain security practice. By validating that images are signed by the Flux project before they run in your cluster, you protect your GitOps infrastructure from tampering.
