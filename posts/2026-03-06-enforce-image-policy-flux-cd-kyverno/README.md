# How to Enforce Image Policy with Flux CD and Kyverno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kyverno, Image Policy, Kubernetes, GitOps, Security, Container Images

Description: A step-by-step guide to enforcing container image policies in Kubernetes using Kyverno and Flux CD for GitOps-driven security.

---

## Introduction

Container image security is a critical aspect of Kubernetes operations. Ensuring that only trusted, signed, and properly tagged images run in your cluster prevents supply chain attacks and enforces organizational standards. Kyverno, a Kubernetes-native policy engine, combined with Flux CD's GitOps approach, provides a powerful way to enforce image policies declaratively.

This guide shows you how to deploy Kyverno with Flux CD and create comprehensive image policies that cover registry restrictions, tag requirements, image signing verification, and digest enforcement.

## Prerequisites

- A Kubernetes cluster (v1.25+)
- Flux CD bootstrapped and connected to a Git repository
- kubectl configured for cluster access
- Familiarity with Kubernetes admission controllers

## Repository Structure

```yaml
# Recommended directory layout
# clusters/
#   my-cluster/
#     kyverno/
#       namespace.yaml
#       helm-repository.yaml
#       helm-release.yaml
#     image-policies/
#       restrict-registries.yaml
#       require-image-digest.yaml
#       verify-image-signatures.yaml
#       block-latest-tag.yaml
#       require-labels-on-images.yaml
```

## Deploying Kyverno with Flux CD

### Namespace and Helm Repository

```yaml
# clusters/my-cluster/kyverno/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kyverno
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# clusters/my-cluster/kyverno/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kyverno
  namespace: kyverno
spec:
  interval: 1h
  url: https://kyverno.github.io/kyverno/
```

### Kyverno HelmRelease

```yaml
# clusters/my-cluster/kyverno/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kyverno
  namespace: kyverno
spec:
  interval: 30m
  chart:
    spec:
      chart: kyverno
      version: ">=3.0.0 <4.0.0"
      sourceRef:
        kind: HelmRepository
        name: kyverno
        namespace: kyverno
      interval: 12h
  values:
    # Run in high-availability mode
    replicaCount: 3
    # Configure admission controller settings
    admissionController:
      replicas: 3
      resources:
        limits:
          cpu: "1"
          memory: 1Gi
        requests:
          cpu: 200m
          memory: 256Mi
    # Configure background controller for reporting
    backgroundController:
      replicas: 2
      resources:
        limits:
          cpu: 500m
          memory: 512Mi
        requests:
          cpu: 100m
          memory: 128Mi
    # Exclude system namespaces from policy enforcement
    config:
      excludeGroups:
        - system:serviceaccounts:kube-system
        - system:nodes
      resourceFiltersExcludeNamespaces:
        - kube-system
        - kyverno
        - flux-system
```

## Image Policy: Restrict Container Registries

Allow images only from approved registries to prevent unauthorized image sources.

```yaml
# clusters/my-cluster/image-policies/restrict-registries.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
  annotations:
    policies.kyverno.io/title: Restrict Image Registries
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Only allow container images from approved registries.
      This prevents pulling images from untrusted sources.
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds:
                - Pod
      # Skip validation for system namespaces
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
                - flux-system
      validate:
        message: >-
          Images must come from an approved registry.
          Allowed registries: ghcr.io/myorg, docker.io/library, registry.k8s.io
        pattern:
          spec:
            containers:
              - image: "ghcr.io/myorg/* | docker.io/library/* | registry.k8s.io/*"
            # Also check init containers
            =(initContainers):
              - image: "ghcr.io/myorg/* | docker.io/library/* | registry.k8s.io/*"
```

## Image Policy: Block Latest Tag

Prevent usage of the `latest` tag to ensure reproducible deployments.

```yaml
# clusters/my-cluster/image-policies/block-latest-tag.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-latest-tag
  annotations:
    policies.kyverno.io/title: Block Latest Tag
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
    policies.kyverno.io/description: >-
      Disallow the use of the 'latest' tag on container images.
      All images must use a specific version tag or digest.
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: block-latest-tag
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >-
          The 'latest' tag is not allowed. Use a specific version tag
          (e.g., v1.2.3) or an image digest instead.
        pattern:
          spec:
            containers:
              - image: "!*:latest"
            =(initContainers):
              - image: "!*:latest"
    - name: require-tag-present
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >-
          Images must include a tag. Untagged images default to 'latest'
          which is not allowed.
        pattern:
          spec:
            containers:
              - image: "*:*"
            =(initContainers):
              - image: "*:*"
```

## Image Policy: Require Image Digest

For maximum security, require images to be referenced by digest.

```yaml
# clusters/my-cluster/image-policies/require-image-digest.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
  annotations:
    policies.kyverno.io/title: Require Image Digest
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/description: >-
      Require all container images to use digests instead of tags.
      This ensures immutable image references.
spec:
  # Start in Audit mode, switch to Enforce after validation
  validationFailureAction: Audit
  background: true
  rules:
    - name: require-digest
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
      validate:
        message: >-
          Container images must use a digest (sha256) reference.
          Example: registry.example.com/image@sha256:abc123...
        pattern:
          spec:
            containers:
              - image: "*@sha256:*"
            =(initContainers):
              - image: "*@sha256:*"
```

## Image Policy: Verify Image Signatures

Use Kyverno's image verification to ensure images are signed with cosign.

```yaml
# clusters/my-cluster/image-policies/verify-image-signatures.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
  annotations:
    policies.kyverno.io/title: Verify Image Signatures
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/severity: critical
    policies.kyverno.io/description: >-
      Verify that container images from our organization registry
      are signed using cosign with our public key.
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            # Only verify images from our organization registry
            - "ghcr.io/myorg/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
          # Mutate the image reference to include the digest
          mutateDigest: true
          # Require the digest to be present
          verifyDigest: true
```

## Image Policy: Restrict Image Pull Policy

Ensure that imagePullPolicy is set correctly to avoid pulling unverified images.

```yaml
# clusters/my-cluster/image-policies/restrict-pull-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-pull-policy
  annotations:
    policies.kyverno.io/title: Restrict Image Pull Policy
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-always-pull
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      validate:
        message: >-
          In production, imagePullPolicy must be set to 'Always'
          to ensure the latest security patches are applied.
        pattern:
          spec:
            containers:
              - imagePullPolicy: Always
```

## Flux Kustomization for Image Policies

Manage the deployment order so Kyverno is installed before policies are applied.

```yaml
# clusters/my-cluster/kyverno/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/kyverno
  prune: true
  wait: true
  timeout: 5m
```

```yaml
# clusters/my-cluster/image-policies/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: image-policies
  namespace: flux-system
spec:
  interval: 10m
  # Wait for Kyverno to be fully deployed
  dependsOn:
    - name: kyverno
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/image-policies
  prune: true
  wait: true
  timeout: 3m
```

## Testing Image Policies

Verify that your policies are working as expected.

```bash
# Check that Kyverno is running
kubectl get pods -n kyverno

# List all cluster policies
kubectl get clusterpolicies

# Check policy status and readiness
kubectl get clusterpolicies -o wide

# Test: Try to deploy an image from an unapproved registry
kubectl run test-bad-registry --image=evil.registry.io/malware:v1
# Expected: Error - policy restrict-image-registries blocked the request

# Test: Try to use the latest tag
kubectl run test-latest --image=ghcr.io/myorg/app:latest
# Expected: Error - policy block-latest-tag blocked the request

# Test: Deploy a valid image
kubectl run test-valid --image=ghcr.io/myorg/app:v1.2.3
# Expected: Pod created successfully

# View policy reports for audit-mode policies
kubectl get policyreports -A
kubectl get clusterpolicyreports
```

## Monitoring Policy Violations

Set up alerts for policy violations using Flux CD notifications.

```yaml
# clusters/my-cluster/image-policies/alert-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: policy-slack
  namespace: flux-system
spec:
  type: slack
  channel: security-alerts
  secretRef:
    name: slack-webhook-url

---
# clusters/my-cluster/image-policies/alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: policy-violations
  namespace: flux-system
spec:
  providerRef:
    name: policy-slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: image-policies
    - kind: HelmRelease
      name: kyverno
      namespace: kyverno
```

## Conclusion

Enforcing image policies with Kyverno and Flux CD provides a robust defense against supply chain attacks and ensures consistent image standards across your Kubernetes cluster. By managing policies as code in Git, every change is auditable and automatically enforced. Start with policies in Audit mode to understand the impact, then switch to Enforce mode once you are confident in the rules. This approach ensures that security policies evolve alongside your applications in a controlled, GitOps-driven manner.
