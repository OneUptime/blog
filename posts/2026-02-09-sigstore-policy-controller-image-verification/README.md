# How to Set Up Sigstore Policy Controller for Kubernetes Image Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Sigstore

Description: Learn how to deploy and configure Sigstore Policy Controller to enforce container image signature verification in Kubernetes clusters for enhanced supply chain security.

---

Container image verification is critical for maintaining supply chain security in Kubernetes environments. Sigstore Policy Controller enables you to enforce policies that require container images to be cryptographically signed before they can run in your cluster. This approach prevents the deployment of unsigned or tampered images, reducing the risk of supply chain attacks.

In this guide, we'll walk through setting up Sigstore Policy Controller and configuring it to verify container image signatures in your Kubernetes cluster.

## What is Sigstore Policy Controller?

Sigstore Policy Controller is a Kubernetes admission controller that validates container images against signatures stored in transparency logs. It integrates with Sigstore's ecosystem, including Cosign for signing and Rekor for transparency logging. The controller intercepts pod creation requests and blocks any images that don't meet your signature verification policies.

Unlike traditional approaches that rely on manual verification or trust-on-first-use models, Policy Controller enforces cryptographic verification at admission time, ensuring that only approved images run in your cluster.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (version 1.24 or later)
- kubectl configured with cluster admin access
- Helm 3.x installed
- Basic understanding of Kubernetes admission controllers
- Container images signed with Cosign (optional for testing)

## Installing Sigstore Policy Controller

The easiest way to install Policy Controller is using Helm. First, add the Sigstore Helm repository:

```bash
# Add the Sigstore Helm repository
helm repo add sigstore https://sigstore.github.io/helm-charts
helm repo update
```

Install the Policy Controller with default settings:

```bash
# Create a namespace for policy controller
kubectl create namespace cosign-system

# Install policy controller
helm install policy-controller sigstore/policy-controller \
  --namespace cosign-system \
  --set webhook.enabled=true \
  --set webhook.namespaceSelector.matchExpressions[0].key=policy.sigstore.dev/include \
  --set webhook.namespaceSelector.matchExpressions[0].operator=In \
  --set webhook.namespaceSelector.matchExpressions[0].values[0]="true"
```

This configuration enables the webhook and sets up namespace selectors so you can opt-in specific namespaces for verification.

Verify the installation:

```bash
# Check policy controller pods
kubectl get pods -n cosign-system

# Verify the webhook configuration
kubectl get validatingwebhookconfigurations | grep policy
```

## Creating a ClusterImagePolicy

ClusterImagePolicy resources define which images require verification and what signatures are valid. Here's a basic example that requires all images from a specific registry to be signed:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: require-signed-images
spec:
  images:
  - glob: "registry.example.com/**"
  authorities:
  - keyless:
      url: https://fulcio.sigstore.dev
      identities:
      - issuer: https://accounts.google.com
        subject: "build-bot@example.com"
```

This policy enforces that all images from `registry.example.com` must be signed using Sigstore's keyless signing with a specific identity.

Apply the policy:

```bash
kubectl apply -f clusterimagepolicy.yaml
```

## Configuring Key-Based Verification

For organizations that prefer traditional key-based signing, you can configure verification using public keys:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: key-based-verification
spec:
  images:
  - glob: "myregistry.azurecr.io/production/*"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8nXRh950IZbRj8Ra/N9sbqOPZrfM
        5/KAQN0/KjHcorm/J5yctVd7iEcnessRQjU917hmKO6JWVGHpDguIyakZA==
        -----END PUBLIC KEY-----
```

You can also reference keys stored in Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: signing-key
  namespace: cosign-system
type: Opaque
stringData:
  publicKey: |
    -----BEGIN PUBLIC KEY-----
    MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8nXRh950IZbRj8Ra/N9sbqOPZrfM
    5/KAQN0/KjHcorm/J5yctVd7iEcnessRQjU917hmKO6JWVGHpDguIyakZA==
    -----END PUBLIC KEY-----
---
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: secret-key-verification
spec:
  images:
  - glob: "ghcr.io/myorg/**"
  authorities:
  - key:
      secretRef:
        name: signing-key
```

## Enabling Verification for Specific Namespaces

To enforce verification only in specific namespaces, label them appropriately:

```bash
# Enable policy enforcement for production namespace
kubectl label namespace production policy.sigstore.dev/include=true

# Disable enforcement for development
kubectl label namespace development policy.sigstore.dev/include=false
```

Now create a test deployment in the production namespace:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: app
        image: registry.example.com/myapp:v1.0.0
        # This image must be signed or deployment will fail
```

## Configuring Attestation Verification

Policy Controller can also verify attestations, which provide additional metadata about how images were built:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: attestation-verification
spec:
  images:
  - glob: "registry.example.com/secure-apps/**"
  authorities:
  - keyless:
      url: https://fulcio.sigstore.dev
    attestations:
    - name: must-have-slsa
      predicateType: https://slsa.dev/provenance/v0.2
      policy:
        type: cue
        data: |
          predicateType: "https://slsa.dev/provenance/v0.2"
          predicate: buildType: "https://cloudbuild.googleapis.com/CloudBuildYaml@v1"
```

This configuration requires images to have SLSA provenance attestations that prove they were built using a specific build system.

## Monitoring and Debugging

Check policy controller logs to troubleshoot verification issues:

```bash
# View policy controller logs
kubectl logs -n cosign-system -l app.kubernetes.io/name=policy-controller

# Check for webhook failures
kubectl get events --all-namespaces | grep policy-controller
```

To see why a specific image failed verification, examine the pod events:

```bash
kubectl describe pod <pod-name> -n <namespace>
```

## Setting Up Warning Mode

During initial rollout, you might want to run in warning mode where policy violations are logged but not enforced:

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: warning-mode-policy
spec:
  mode: warn  # Options: enforce, warn
  images:
  - glob: "**"
  authorities:
  - keyless:
      url: https://fulcio.sigstore.dev
```

In warning mode, unsigned images will be allowed to run, but violations will be logged in the policy controller logs and as Kubernetes events.

## Best Practices

When implementing Sigstore Policy Controller, follow these recommendations:

**Start with warning mode**: Test policies in warning mode before enforcing them to avoid breaking existing workloads.

**Use namespace selectors**: Gradually roll out verification by enabling it namespace by namespace rather than cluster-wide immediately.

**Implement exception handling**: Create separate policies for base images or third-party images that you trust but don't sign yourself.

**Monitor verification failures**: Set up alerts for policy violations to catch issues early.

**Automate signing**: Integrate Cosign signing into your CI/CD pipeline so all production images are signed automatically.

**Document your policies**: Maintain clear documentation about which images require signing and who is authorized to sign them.

## Conclusion

Sigstore Policy Controller provides a powerful mechanism for enforcing container image verification in Kubernetes. By requiring cryptographic signatures on container images, you can prevent supply chain attacks and ensure that only trusted code runs in your cluster.

Start by implementing verification in non-production namespaces, use warning mode to identify issues, and gradually roll out enforcement as your teams adapt their workflows to include image signing. Combined with automated signing in your CI/CD pipelines, Policy Controller becomes a critical component of your Kubernetes security strategy.

For production deployments, monitor OneUptime for signature verification failures and admission controller health to maintain visibility into your cluster's security posture.
