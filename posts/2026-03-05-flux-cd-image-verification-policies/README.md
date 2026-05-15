# How to Configure Flux CD with Image Verification Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Image Verification, Cosign, Sigstore, Supply Chain

Description: Learn how to configure image verification policies in Flux CD to ensure only signed and trusted container images are deployed to your cluster.

---

Image verification policies ensure that container images deployed through Flux CD have been signed by trusted parties. By enforcing signature verification, you prevent tampered or unauthorized images from running in your cluster. This guide shows you how to configure image selection in Flux and image verification at the cluster admission level.

## Why Verify Container Images

- **Supply chain attacks**: Tampered images can introduce backdoors into your workloads.
- **Unauthorized changes**: Without verification, anyone with registry push access could deploy malicious images.
- **Compliance**: Many security frameworks require image provenance verification.
- **Auditability**: Signatures provide a cryptographic proof of who built and approved an image.

## Step 1: Sign Your Container Images

Before setting up verification, sign your images using Cosign:

```bash
# Sign an image using Cosign keyless signing (recommended).
# Prefer signing immutable digest references in production.

cosign sign ghcr.io/myorg/webapp@sha256:<image-digest>

# Or sign with a key pair
cosign generate-key-pair
cosign sign --key cosign.key ghcr.io/myorg/webapp@sha256:<image-digest>

# Verify a keyless signature
cosign verify ghcr.io/myorg/webapp@sha256:<image-digest> \
  --certificate-identity-regexp="^https://github.com/myorg/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Or verify a key-pair signature
cosign verify --key cosign.pub ghcr.io/myorg/webapp@sha256:<image-digest>
```

## Step 2: Configure Kyverno Image Verification Policy

Deploy a Kyverno ClusterPolicy that verifies image signatures for all pods. Kyverno also provides the newer `ImageValidatingPolicy` API for image signature validation; the `ClusterPolicy` `verifyImages` form below remains common in existing installations:

```yaml
# policy-verify-images.yaml
# Kyverno policy to enforce Cosign image signatures
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
  annotations:
    policies.kyverno.io/title: Verify Image Signatures
    policies.kyverno.io/description: Verifies that all container images are signed with Cosign
spec:
  background: false
  webhookConfiguration:
    timeoutSeconds: 30
  rules:
    # Verify internal application images
    - name: verify-internal-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - flux-system
                - kyverno
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          failureAction: Enforce
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/myorg/*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
          mutateDigest: true
          verifyDigest: true
          required: true
    # Verify third-party images with a public key
    - name: verify-vendor-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - flux-system
      verifyImages:
        - imageReferences:
            - "docker.io/bitnami/*"
          failureAction: Audit
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
          required: false  # Do not require every matching image to have Kyverno's verified annotation
```

## Step 3: Configure OPA Gatekeeper Image Verification

Alternatively, use OPA Gatekeeper to enforce trusted registries and digest references. Gatekeeper does not verify Cosign signatures with this Rego example; use Kyverno or another admission controller with signature-verification support for cryptographic signature checks.

```yaml
# gatekeeper-image-verification.yaml
# Gatekeeper constraint template for image verification
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8strustedimages
spec:
  crd:
    spec:
      names:
        kind: K8sTrustedImages
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowedRegistries:
              type: array
              items:
                type: string
            requireDigest:
              type: boolean
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8strustedimages

        violation[{"msg": msg}] {
          image := images[_]
          not trusted_registry(image)
          msg := sprintf("Image %v is not from a trusted registry", [image])
        }

        violation[{"msg": msg}] {
          input.parameters.requireDigest == true
          image := images[_]
          not contains(image, "@sha256:")
          msg := sprintf("Image %v must use a digest reference (@sha256:...)", [image])
        }

        images[image] {
          image := input.review.object.spec.containers[_].image
        }

        images[image] {
          image := input.review.object.spec.initContainers[_].image
        }

        images[image] {
          image := input.review.object.spec.ephemeralContainers[_].image
        }

        trusted_registry(image) {
          registry := input.parameters.allowedRegistries[_]
          startswith(image, registry)
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sTrustedImages
metadata:
  name: require-trusted-images
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - flux-system
  parameters:
    allowedRegistries:
      - "ghcr.io/myorg/"
      - "registry.mycompany.com/"
    requireDigest: true
```

## Step 4: Configure Flux Image Automation with Verification

When using Flux image automation, constrain which tags Flux can select. Flux `ImagePolicy` selects tags and can reflect digests; signature verification still needs to happen in CI and at admission time.

```yaml
# image-policy-with-verification.yaml
# Image policy that only promotes images matching a semver pattern
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: webapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: webapp
  digestReflectionPolicy: IfNotPresent
  policy:
    semver:
      range: ">=1.0.0"
  filterTags:
    # Only consider tags matching this pattern
    pattern: '^v(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
```

Add a CI step that signs and verifies the image before the tag is made available for Flux image automation:

```yaml
# .github/workflows/verify-before-promote.yaml
# CI workflow to verify image signatures
name: Verify Image
on:
  push:
    tags: ['v*']
jobs:
  sign-and-verify:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      packages: write
    env:
      IMAGE_REF: ghcr.io/myorg/webapp@sha256:<image-digest>
    steps:
      - name: Sign image
        run: |
          cosign sign --yes "$IMAGE_REF"

      - name: Verify signature
        run: |
          cosign verify "$IMAGE_REF" \
            --certificate-identity-regexp="^https://github.com/myorg/.*" \
            --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

## Step 5: Enforce Digest References

Require all Flux-managed images to use digest references for immutability:

```yaml
# kyverno-require-digest.yaml
# Kyverno policy to require image digest references
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  rules:
    - name: require-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      validate:
        failureAction: Enforce
        message: "Images must use digest references (@sha256:...) in production."
        pattern:
          spec:
            containers:
              - image: "*@sha256:*"
            =(initContainers):
              - image: "*@sha256:*"
            =(ephemeralContainers):
              - image: "*@sha256:*"
```

## Step 6: Deploy Verification Policies with Flux

Manage all verification policies through Flux for GitOps-driven policy management:

```yaml
# kustomization-image-policies.yaml
# Flux Kustomization to deploy image verification policies
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: image-verification-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./policies/image-verification
  prune: true
  dependsOn:
    - name: kyverno  # Wait for Kyverno to be ready
```

## Step 7: Monitor Verification Failures

Track image verification failures across the cluster:

```bash
# Check Kyverno policy reports for verification failures
kubectl get clusterpolicyreport -o json | jq '.results[] | select(.policy=="verify-image-signatures" and .result=="fail")'

# Check Flux reconciliation failures after admission policies reject a workload
flux get kustomizations -A | grep False

# View Kyverno admission reports
kubectl get admissionreport -A -o json | jq '.items[].results[] | select(.result=="fail")'

# Check events for image verification errors
kubectl get events -A --field-selector reason=FailedCreate | grep -i "image\|signature\|verify"
```

## Best Practices

1. **Sign all images in CI/CD**: Integrate Cosign signing into every build pipeline.
2. **Use keyless signing**: Sigstore keyless signing ties signatures to build identities, eliminating key management.
3. **Enforce in production, audit in staging**: Start with `Audit` mode and move to `Enforce` after validating.
4. **Require digest references**: Tags can be mutated; digests are immutable.
5. **Verify Flux controller images too**: Apply verification policies to the flux-system namespace.
6. **Use mutateDigest**: Configure Kyverno to automatically replace tags with digests after verification.
7. **Monitor continuously**: Track verification failures and set up alerts for policy violations.

Image verification policies are a critical component of supply chain security for Flux CD deployments. By ensuring every container image is cryptographically verified before deployment, you protect your cluster from tampered or unauthorized images.
