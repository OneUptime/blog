# How to Configure Admission Controller for Image Signature Verification with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Admission Controller, Image Verification, Cosign, Kyverno

Description: Learn how to configure a Kubernetes admission controller to enforce container image signature verification in a Flux-managed cluster.

---

Admission controllers act as gatekeepers in Kubernetes, intercepting API requests before objects are persisted. By configuring an admission controller to verify container image signatures, you can prevent unsigned or untrusted images from running in your cluster. This guide demonstrates how to deploy and configure admission controllers for image signature verification in a Flux-managed environment using Kyverno.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster supported by your Flux and Kyverno versions
- Flux CLI installed and bootstrapped on the cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux
- Container images signed with Cosign

## Step 1: Deploy Kyverno with Flux

Add the Kyverno Helm repository and deploy it through Flux:

```yaml
# clusters/my-cluster/kyverno/helmrepository.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 1h
  url: https://kyverno.github.io/kyverno/
```

```yaml
# clusters/my-cluster/kyverno/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: kyverno
  chart:
    spec:
      chart: kyverno
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: kyverno
        namespace: flux-system
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    admissionController:
      replicas: 3
    backgroundController:
      replicas: 2
    cleanupController:
      replicas: 2
    reportsController:
      replicas: 2
    features:
      policyExceptions:
        enabled: true
        namespace: kyverno
```

Commit and push these files, then verify the deployment:

```bash
git add clusters/my-cluster/kyverno/
git commit -m "Deploy Kyverno admission controller"
git push

# Wait for reconciliation
flux reconcile kustomization flux-system --with-source
kubectl get pods -n kyverno
```

## Step 2: Create a Kyverno Policy for Image Verification

Define a ClusterPolicy that verifies image signatures using Cosign:

```yaml
# clusters/my-cluster/kyverno/policies/verify-images.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
  annotations:
    policies.kyverno.io/title: Verify Image Signatures
    policies.kyverno.io/description: >-
      Ensures all container images are signed with Cosign
      before they can be deployed to the cluster.
spec:
  background: false
  webhookConfiguration:
    timeoutSeconds: 30
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
                - staging
      verifyImages:
        - imageReferences:
            - "myregistry.example.com/myorg/*"
          failureAction: Enforce
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

## Step 3: Create a Kyverno Policy for Keyless Verification

For images signed with Cosign keyless mode:

```yaml
# clusters/my-cluster/kyverno/policies/verify-images-keyless.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-keyless-signatures
spec:
  background: false
  rules:
    - name: verify-keyless-cosign
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          failureAction: Enforce
          attestors:
            - count: 1
              entries:
                - keyless:
                    subjectRegExp: "^https://github\\.com/myorg/.+"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

## Step 4: Create a Policy to Verify Flux Controller Images

Ensure Flux controller images themselves are verified:

```yaml
# clusters/my-cluster/kyverno/policies/verify-flux-images.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-flux-images
spec:
  background: false
  rules:
    - name: verify-flux-cosign
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
          failureAction: Enforce
          attestors:
            - count: 1
              entries:
                - keyless:
                    subjectRegExp: "^https://github\\.com/fluxcd/.*$"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

## Step 5: Configure Policy Exceptions

Create exceptions for specific workloads or images that do not support signing:

```yaml
# clusters/my-cluster/kyverno/policies/exceptions.yaml
apiVersion: kyverno.io/v2
kind: PolicyException
metadata:
  name: legacy-images-exception
  namespace: kyverno
spec:
  exceptions:
    - policyName: verify-image-signatures
      ruleNames:
        - verify-cosign-signature
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - production
          names:
            - legacy-*
```

## Step 6: Configure Audit Mode Before Enforcement

Start with audit mode to identify images that would fail verification:

```yaml
# clusters/my-cluster/kyverno/policies/verify-images-audit.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-images-audit
spec:
  background: true
  rules:
    - name: verify-all-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "*"
          failureAction: Audit  # Log violations without blocking
          attestors:
            - count: 1
              entries:
                - keyless:
                    subjectRegExp: ".+"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

Check audit results:

```bash
# View policy violations
kubectl get policyreport -A
kubectl get clusterpolicyreport -o yaml
```

## Verification

After deploying the policies, verify the admission controller is working:

1. Check that Kyverno is running:

```bash
kubectl get pods -n kyverno
```

2. Verify policies are active:

```bash
kubectl get clusterpolicy
```

3. Test with an unsigned image:

```bash
kubectl run test-unsigned --image=myregistry.example.com/myorg/unsigned:latest -n production
# Should be rejected with a signature verification error
```

4. Test with a signed image:

```bash
kubectl run test-signed --image=ghcr.io/fluxcd/source-controller:v1.2.0 -n flux-system --dry-run=server
# Should succeed
```

5. Review policy reports:

```bash
kubectl get policyreport -A -o wide
```

## Troubleshooting

### All pod creations are being blocked

If the admission controller is blocking all deployments, check the policy configuration:

```bash
# Check policy status
kubectl describe clusterpolicy verify-image-signatures

# Temporarily switch to audit mode
kubectl patch clusterpolicy verify-image-signatures \
  --type json -p='[{"op":"replace","path":"/spec/rules/0/verifyImages/0/failureAction","value":"Audit"}]'
```

### Kyverno webhook timeout errors

If verification takes too long, set the webhook timeout up to the Kubernetes maximum of 30 seconds:

```yaml
spec:
  webhookConfiguration:
    timeoutSeconds: 30
```

### Image pull errors during verification

Ensure Kyverno has access to your container registry:

```bash
# Create registry credentials for Kyverno
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.example.com \
  --docker-username=kyverno-read \
  --docker-password=<password> \
  -n kyverno
```

### Policy not matching expected resources

Verify the policy's match criteria:

```bash
kubectl get clusterpolicy verify-image-signatures -o yaml | grep -A 20 "match:"
```

### Kyverno and Flux reconciliation conflicts

If Kyverno blocks Flux from deploying resources, ensure the flux-system namespace is either covered by a Flux image verification policy or excluded through Kyverno's webhook namespace selector:

```yaml
# Exclude flux-system in the Kyverno Helm values if your policy rollout requires it
config:
  webhooks:
    namespaceSelector:
      matchExpressions:
        - key: kubernetes.io/metadata.name
          operator: NotIn
          values:
            - kube-system
            - kyverno
            - flux-system
```

## Summary

Configuring an admission controller for image signature verification adds a robust enforcement layer to your Flux-managed Kubernetes cluster. With Kyverno, only container images with valid signatures can run in your cluster. By managing these policies through GitOps with Flux, you maintain a consistent, auditable, and version-controlled security posture across your entire infrastructure.
