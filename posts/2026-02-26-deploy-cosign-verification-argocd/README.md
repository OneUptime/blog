# How to Deploy Cosign Verification Policies with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Cosign, Security

Description: Learn how to deploy and enforce container image signature verification policies using Cosign, Kyverno, and ArgoCD for supply chain security.

---

Container image signing and verification is a critical part of software supply chain security. Cosign, part of the Sigstore project, lets you sign container images with cryptographic signatures. But signing alone is not enough - you also need to verify those signatures at deployment time. By deploying verification policies through ArgoCD, you create a GitOps-managed supply chain security gate that ensures only signed and trusted images run in your clusters.

This guide covers setting up image signature verification using Cosign with either Kyverno or OPA Gatekeeper as the policy engine, all managed through ArgoCD.

## Understanding Image Signing with Cosign

Cosign provides several signing methods:

- **Key-pair signing**: Traditional public/private key pairs
- **Keyless signing**: Uses OIDC identity (GitHub, Google, etc.) with Fulcio and Rekor transparency log
- **Attestation verification**: Verifies build provenance and SBOM attestations

The verification policies we deploy will check that images have valid signatures before they can be admitted to the cluster.

## Repository Structure

```text
security/
  cosign-policies/
    kyverno/
      verify-images.yaml
      verify-attestations.yaml
    gatekeeper/
      ratify-application.yaml
      verifier-cosign.yaml
    configmap-public-keys.yaml
```

## Approach 1: Cosign Verification with Kyverno

Kyverno has built-in support for Cosign image verification, making it the simplest approach.

### Image Verification Policy

```yaml
# security/cosign-policies/kyverno/verify-images.yaml

apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
  annotations:
    policies.kyverno.io/title: Verify Image Signatures
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Verifies that all container images are signed with Cosign.
      Images without valid signatures are blocked.
spec:
  webhookConfiguration:
    failurePolicy: Fail
    timeoutSeconds: 30
  background: false
  rules:
    # Verify with static key
    - name: verify-signature-with-key
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
                - kyverno
                - argocd
      verifyImages:
        - imageReferences:
            - "your-registry.com/*"
          failureAction: Enforce
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
          mutateDigest: true
          verifyDigest: true
          required: true

    # Verify with keyless signing (Sigstore)
    - name: verify-keyless-signature
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
                - kyverno
                - argocd
      verifyImages:
        - imageReferences:
            - "ghcr.io/your-org/*"
          failureAction: Enforce
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/your-org/*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
          mutateDigest: true
          verifyDigest: true
          required: true
```

### Attestation Verification Policy

Verify not just signatures but also build provenance and SBOMs.

```yaml
# security/cosign-policies/kyverno/verify-attestations.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-attestations
  annotations:
    policies.kyverno.io/title: Verify Image Attestations
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: high
spec:
  webhookConfiguration:
    failurePolicy: Fail
    timeoutSeconds: 30
  background: false
  rules:
    - name: verify-slsa-provenance
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
                - kyverno
                - argocd
      verifyImages:
        - imageReferences:
            - "your-registry.com/*"
          failureAction: Audit
          attestations:
            - type: https://slsa.dev/provenance/v0.2
              attestors:
                - entries:
                    - keys:
                        publicKeys: |-
                          -----BEGIN PUBLIC KEY-----
                          MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                          -----END PUBLIC KEY-----
              conditions:
                - all:
                    # Verify the image was built by our CI system
                    - key: "{{ builder.id }}"
                      operator: Equals
                      value: "https://github.com/your-org/build-pipeline"

    - name: verify-sbom-attestation
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "your-registry.com/*"
          failureAction: Audit
          attestations:
            - type: https://spdx.dev/Document
              attestors:
                - entries:
                    - keys:
                        publicKeys: |-
                          -----BEGIN PUBLIC KEY-----
                          MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                          -----END PUBLIC KEY-----
```

## Approach 2: Cosign Verification with Gatekeeper

If you use Gatekeeper instead of Kyverno, you need Gatekeeper external data enabled and an external data provider for Cosign verification. The older `sigstore/cosign-gatekeeper-provider` project has been archived, so use a maintained provider such as Ratify for current deployments.

### Deploy the Ratify Gatekeeper Provider

```yaml
# security/cosign-policies/gatekeeper/ratify-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ratify
  namespace: argocd
spec:
  project: security
  source:
    repoURL: https://ratify-project.github.io/ratify
    chart: ratify
    targetRevision: 1.15.2
    helm:
      values: |
        featureFlags:
          RATIFY_CERT_ROTATION: true
        cosign:
          enabled: true
        cosignKeys:
          - |
            -----BEGIN PUBLIC KEY-----
            MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
            -----END PUBLIC KEY-----
  destination:
    server: https://kubernetes.default.svc
    namespace: gatekeeper-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
---
# security/cosign-policies/gatekeeper/verifier-cosign.yaml
apiVersion: config.ratify.deislabs.io/v1beta1
kind: Verifier
metadata:
  name: verifier-cosign
  namespace: gatekeeper-system
spec:
  name: cosign
  artifactTypes: application/vnd.dev.cosign.artifact.sig.v1+json
  parameters:
    trustPolicies:
      - name: default
        scopes:
          - "your-registry.com/*"
        keys:
          - provider: inline-keymanagementprovider-1
```

## Storing Public Keys

Store your Cosign public keys in a ConfigMap managed by ArgoCD.

```yaml
# security/cosign-policies/configmap-public-keys.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cosign-public-keys
  namespace: gatekeeper-system
data:
  cosign.pub: |
    -----BEGIN PUBLIC KEY-----
    MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
    -----END PUBLIC KEY-----
```

For production, keep Cosign private keys out of the cluster. Public verification keys can be stored in Git if changes are reviewed, or managed through your external secrets system if that is how your platform distributes trust material.

## Signing Images in CI/CD

Before verification works, you need to sign images in your CI pipeline. Here is an example GitHub Actions step.

```yaml
# .github/workflows/build.yaml
- name: Sign image with Cosign
  uses: sigstore/cosign-installer@v4.0.0
- run: |
    # Keyless signing using GitHub OIDC
    cosign sign --yes ${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}

    # Or key-based signing
    cosign sign --key cosign.key ${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}

    # Attach SBOM attestation
    cosign attest --predicate sbom.spdx.json \
      --type https://spdx.dev/Document \
      --key cosign.key \
      ${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}
```

For keyless signing in GitHub Actions, the signing job must grant `id-token: write` so Cosign can request a GitHub OIDC token.

## ArgoCD Application for Cosign Policies

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cosign-policies
  namespace: argocd
spec:
  project: security
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: security/cosign-policies/kyverno
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Verification Flow

```mermaid
graph TD
    A[Developer pushes code] --> B[CI builds image]
    B --> C[CI signs image with Cosign]
    C --> D[Image pushed to registry]
    D --> E[ArgoCD syncs deployment]
    E --> F[Pod admission request]
    F --> G{Kyverno/Gatekeeper checks signature}
    G -->|Valid| H[Pod created]
    G -->|Invalid/Missing| I[Pod rejected]
```

## Rollout Strategy

Do not enable enforcement immediately. Follow this progression:

1. **Audit mode**: Deploy policies in Audit mode and monitor which images would be blocked
2. **Sign existing images**: Work with teams to sign their images in CI
3. **Warn mode**: Switch to warn to notify without blocking
4. **Enforce mode**: Once all critical images are signed, switch to Enforce

```yaml
# Phase 1: Audit
spec:
  rules:
    - name: verify-signature
      verifyImages:
        - failureAction: Audit

# Phase 2: Warn in admission responses (Kyverno only)
spec:
  emitWarning: true
  rules:
    - name: verify-signature
      verifyImages:
        - failureAction: Audit

# Phase 3: Enforce
spec:
  rules:
    - name: verify-signature
      verifyImages:
        - failureAction: Enforce
```

## Summary

Deploying Cosign verification policies with ArgoCD creates a supply chain security gate that ensures only signed and trusted container images run in your clusters. By managing these policies through GitOps, every change to your trust boundaries is reviewed and tracked. Start with Kyverno for the simplest integration, use audit mode during rollout, and gradually enforce as teams adopt image signing in their CI pipelines.
