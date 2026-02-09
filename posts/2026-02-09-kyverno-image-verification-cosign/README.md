# How to Implement Kyverno Image Verification with Cosign Signatures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Cosign, Image Signing, Security, Supply Chain

Description: Learn how to use Kyverno to verify container image signatures with Cosign, enforce signed images in your cluster, validate attestations, and implement software supply chain security with policy-based image verification.

---

Container image verification ensures only trusted, signed images run in your Kubernetes cluster. Kyverno integrates with Cosign to verify image signatures and attestations at admission time, blocking unsigned or tampered images. This implements supply chain security without requiring changes to application deployments or CI/CD pipelines. This guide shows you how to configure Kyverno for comprehensive image verification.

## Prerequisites

Install Cosign and sign a test image:

```bash
# Install Cosign
brew install cosign  # macOS
# or download from https://github.com/sigstore/cosign/releases

# Generate key pair
cosign generate-key-pair

# Sign an image
cosign sign --key cosign.key registry.example.com/app:v1.0.0

# Verify signature manually
cosign verify --key cosign.pub registry.example.com/app:v1.0.0
```

Store the public key in a Kubernetes secret:

```bash
kubectl create secret generic cosign-pub-key \
    --from-file=cosign.pub \
    -n kyverno
```

## Basic Image Verification Policy

Create a Kyverno policy that requires signed images:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
  annotations:
    policies.kyverno.io/title: Verify Image Signatures
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Verify container images are signed with Cosign before allowing pod creation.
spec:
  validationFailureAction: Enforce
  background: false  # Image verification doesn't work in background mode
  webhookTimeoutSeconds: 30  # Image verification needs more time
  failurePolicy: Fail
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

This policy verifies images from `registry.example.com` are signed with the specified public key.

## Using Secrets for Public Keys

Reference keys stored in secrets instead of embedding them:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-with-secret-key
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: cosign-pub-key
                      namespace: kyverno
```

This loads the public key from the Kubernetes secret.

## Verifying Multiple Registries

Create policies for different registries:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-all-registries
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-company-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.company.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: company-cosign-key
                      namespace: kyverno

    - name: verify-vendor-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "vendor-registry.io/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: vendor-cosign-key
                      namespace: kyverno

    - name: allow-public-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "docker.io/library/*"
          required: false  # Don't require signatures for public images
```

Different rules handle different registries with appropriate verification requirements.

## Verifying Image Attestations

Check SLSA attestations for build provenance:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-attestations
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-provenance
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestations:
            - predicateType: https://slsa.dev/provenance/v0.2
              attestors:
                - count: 1
                  entries:
                    - keys:
                        secret:
                          name: cosign-pub-key
                          namespace: kyverno
              conditions:
                - all:
                    - key: "{{ builder.id }}"
                      operator: Equals
                      value: "https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@refs/tags/v1.4.0"
                    - key: "{{ invocation.configSource.uri }}"
                      operator: Equals
                      value: "git+https://github.com/company/app@refs/heads/main"
```

This verifies images have valid SLSA provenance attestations from trusted builders.

## Checking Vulnerability Scan Results

Verify images have passed vulnerability scanning:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-scan-results
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  rules:
    - name: check-vulnerabilities
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestations:
            - predicateType: https://cosign.sigstore.dev/attestation/vuln/v1
              attestors:
                - count: 1
                  entries:
                    - keys:
                        secret:
                          name: cosign-pub-key
                          namespace: kyverno
              conditions:
                - all:
                    - key: "{{ scanner.vendor }}"
                      operator: Equals
                      value: "Trivy"
                    - key: "{{ metadata.scanFinishedOn }}"
                      operator: NotEquals
                      value: ""
                    - key: "{{ length(scanner.result.vulnerabilities[?severity=='CRITICAL']) }}"
                      operator: LessThanOrEquals
                      value: 0
```

This blocks images with critical vulnerabilities found by Trivy.

## Using Keyless Verification

Verify images signed with keyless Cosign (using Fulcio and Rekor):

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-keyless
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  rules:
    - name: keyless-verification
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keyless:
                    subject: "https://github.com/company/workflows/*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

Keyless verification uses OIDC identity from CI/CD systems instead of keys.

## Conditional Verification

Apply different verification rules based on namespace or labels:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: conditional-verification
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 30
  rules:
    - name: require-signatures-production
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaceSelector:
                matchLabels:
                  environment: production
      verifyImages:
        - imageReferences:
            - "*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: cosign-pub-key
                      namespace: kyverno

    - name: allow-unsigned-dev
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaceSelector:
                matchLabels:
                  environment: development
      verifyImages:
        - imageReferences:
            - "*"
          required: false
```

Production requires signatures while development allows unsigned images.

## Testing Image Verification

Test with signed and unsigned images:

```bash
# Try to deploy unsigned image (should fail)
kubectl run test-unsigned --image=nginx:latest

# Sign the image
cosign sign --key cosign.key nginx:latest

# Try again with signed image (should succeed)
kubectl run test-signed --image=nginx:latest

# Check policy reports
kubectl get policyreport -A
kubectl describe policyreport polr-ns-default
```

## Troubleshooting Verification

Debug verification failures:

```bash
# Check Kyverno logs
kubectl logs -n kyverno -l app.kubernetes.io/component=admission-controller

# View detailed error messages
kubectl get events --sort-by='.lastTimestamp' | grep -i "image verification"

# Test verification manually
cosign verify --key cosign.pub registry.example.com/app:v1.0.0

# Check if public key is accessible
kubectl get secret cosign-pub-key -n kyverno -o yaml
```

Common issues include expired signatures, incorrect public keys, and network connectivity to registries.

## Performance Considerations

Optimize image verification performance:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: optimized-verification
spec:
  validationFailureAction: Enforce
  background: false
  webhookTimeoutSeconds: 15  # Lower timeout for faster failure
  failurePolicy: Ignore  # Don't block on Kyverno failures
  rules:
    - name: verify-images-cached
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    secret:
                      name: cosign-pub-key
                      namespace: kyverno
```

Kyverno caches verification results, so repeated deployments of the same image are fast.

## Conclusion

Kyverno image verification with Cosign provides policy-based enforcement of signed images in Kubernetes. Configure policies that verify signatures using public keys or keyless authentication, check attestations for build provenance and vulnerability scans, and apply conditional rules based on environment. Use secrets to manage public keys, set appropriate timeouts for verification, and implement different policies for production and development. Monitor verification results through policy reports and troubleshoot failures using Kyverno logs.

Image verification is essential for supply chain security, ensuring only trusted, validated images run in your cluster.
