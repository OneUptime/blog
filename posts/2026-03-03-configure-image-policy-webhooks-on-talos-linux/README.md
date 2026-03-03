# How to Configure Image Policy Webhooks on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Policy, Kubernetes, Container Security, Admission Control

Description: Learn how to set up image policy webhooks on Talos Linux to control which container images can run in your Kubernetes cluster.

---

Container image policies are a critical security control for any Kubernetes cluster. Without them, any user with permission to create pods can pull and run any image from any registry, including potentially malicious or unverified ones. Image policy webhooks let you enforce rules about which images are allowed, whether they must be signed, and what registries they can come from.

On Talos Linux, where the OS is locked down and immutable, adding image policy enforcement at the Kubernetes level closes a significant gap. Even though the host OS is secure, running an untrusted container image can still compromise your workloads and data. This guide covers multiple approaches to implementing image policies on Talos Linux.

## Image Policy Options

There are several ways to enforce image policies in Kubernetes:

1. **Kyverno or OPA Gatekeeper policies**: The simplest approach, using Kubernetes-native policy engines
2. **ImagePolicyWebhook admission controller**: A built-in Kubernetes admission plugin
3. **Sigstore/Cosign verification**: Verify image signatures before allowing deployment
4. **Connaisseur**: A dedicated image verification admission controller

We will cover the first three approaches in this guide.

## Approach 1: Kyverno Image Policies

Kyverno is the easiest way to implement image policies on Talos Linux because it does not require modifications to the API server configuration.

### Restrict to Approved Registries

```yaml
# restrict-registries.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
  annotations:
    policies.kyverno.io/title: Restrict Image Registries
    policies.kyverno.io/description: Only allow images from approved registries
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
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kyverno
      validate:
        message: >-
          Images must come from an approved registry.
          Allowed registries: registry.company.com, ghcr.io/company, docker.io/library
        pattern:
          spec:
            containers:
              - image: "registry.company.com/* | ghcr.io/company/* | docker.io/library/*"
            =(initContainers):
              - image: "registry.company.com/* | ghcr.io/company/* | docker.io/library/*"
            =(ephemeralContainers):
              - image: "registry.company.com/* | ghcr.io/company/* | docker.io/library/*"
```

### Require Image Tags (No Latest)

```yaml
# disallow-latest.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-explicit-tag
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
        message: "Container images must have an explicit tag. The 'latest' tag and untagged images are not allowed."
        deny:
          conditions:
            any:
              - key: "{{ images.containers.*.tag || '' }}"
                operator: AnyIn
                value:
                  - "latest"
                  - ""
```

### Require Image Digests

For the highest level of assurance, require images to be referenced by their SHA256 digest.

```yaml
# require-digest.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-digest
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
      validate:
        message: "Images must be referenced by digest (@sha256:...) for production compliance"
        pattern:
          spec:
            containers:
              - image: "*@sha256:*"
```

## Approach 2: Image Signature Verification with Cosign

Cosign is part of the Sigstore project and allows you to sign container images and verify those signatures before allowing them to run.

### Signing Images with Cosign

First, install Cosign and sign your images during your CI/CD pipeline.

```bash
# Install Cosign
brew install cosign

# Generate a key pair (one-time setup)
cosign generate-key-pair

# Sign an image
cosign sign --key cosign.key registry.company.com/my-app:v1.2.3

# Verify a signature
cosign verify --key cosign.pub registry.company.com/my-app:v1.2.3
```

### Verifying Signatures with Kyverno

Kyverno has built-in support for verifying image signatures.

```yaml
# verify-image-signatures.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-cosign-signature
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
      verifyImages:
        - imageReferences:
            - "registry.company.com/*"
          attestors:
            - entries:
                - keys:
                    publicKeys: |
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
        - imageReferences:
            - "ghcr.io/company/*"
          attestors:
            - entries:
                - keys:
                    publicKeys: |
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

### Using Keyless Signing with Sigstore

For organizations using Sigstore's keyless signing with an OIDC identity provider:

```yaml
# keyless-verification.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-keyless-signatures
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-keyless
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.company.com/*"
          attestors:
            - entries:
                - keyless:
                    subject: "builder@company.com"
                    issuer: "https://accounts.google.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

## Approach 3: Connaisseur for Dedicated Image Verification

Connaisseur is a Kubernetes admission controller specifically designed for image verification.

```bash
# Install Connaisseur
helm repo add connaisseur https://sse-secure-systems.github.io/connaisseur/charts
helm repo update

# Create values file
cat > connaisseur-values.yaml <<EOF
validators:
  - name: company-signer
    type: cosign
    trustRoots:
      - name: default
        key: |
          -----BEGIN PUBLIC KEY-----
          MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
          -----END PUBLIC KEY-----

policy:
  - pattern: "registry.company.com/*"
    validator: company-signer
  - pattern: "docker.io/library/*"
    validator: allow
  - pattern: "*"
    validator: deny
EOF

helm install connaisseur connaisseur/connaisseur \
  --namespace connaisseur \
  --create-namespace \
  --values connaisseur-values.yaml
```

## Mutating Images for Consistency

Beyond validation, you can use mutation policies to automatically resolve image tags to digests, ensuring consistency.

```yaml
# resolve-tags-to-digests.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: resolve-image-tags
spec:
  rules:
    - name: resolve-tag-to-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchesJson6902: |-
              - op: replace
                path: /spec/containers/{{elementIndex}}/image
                value: "{{ images.containers.{{element.name}}.registry }}/{{ images.containers.{{element.name}}.path }}@{{ images.containers.{{element.name}}.digest }}"
```

## Vulnerability Scanning Integration

Combine image policies with vulnerability scanning to block images with known vulnerabilities.

```bash
# Install Trivy Operator for continuous scanning
helm repo add aqua https://aquasecurity.github.io/helm-charts/
helm repo update

helm install trivy-operator aqua/trivy-operator \
  --namespace trivy-system \
  --create-namespace \
  --set trivy.ignoreUnfixed=true
```

Then create a Kyverno policy that checks scan results before allowing pods.

```yaml
# block-vulnerable-images.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-critical-vulnerabilities
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-vuln-report
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{request.operation}}"
            operator: Equals
            value: CREATE
      validate:
        message: "Image has critical vulnerabilities. Check Trivy scan results."
        deny:
          conditions:
            any:
              - key: "{{ images.containers.*.registry }}"
                operator: AnyNotIn
                value: "scanned-and-approved"
```

## Talos Linux Considerations

On Talos Linux, image policies are particularly important because:

1. **No runtime scanning on hosts**: You cannot install scanning agents on Talos nodes, so pre-admission checks are your primary defense.
2. **Immutable OS**: The OS cannot be compromised through container escape as easily, but data and network access can still be exploited.
3. **API-driven management**: All image policy configuration happens through Kubernetes resources, aligning with Talos's management philosophy.

## Wrapping Up

Image policy webhooks on Talos Linux provide essential control over what runs in your cluster. Whether you use Kyverno for simple registry restrictions, Cosign for signature verification, or a combination of tools for defense in depth, the important thing is to have policies in place. Start with registry restrictions, then add tag requirements, and eventually move to full signature verification. Each step raises the bar for attackers and reduces the risk of running untrusted code in your Talos Linux cluster.
