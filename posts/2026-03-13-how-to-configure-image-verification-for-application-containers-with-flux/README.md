# How to Configure Image Verification for Application Containers with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Image Verification, Container Security, OCI

Description: Learn how to configure Flux to verify container image signatures for your application workloads before they are deployed to your cluster.

---

Flux supports native image verification through its Kustomization and HelmRelease resources, allowing you to enforce that only signed container images are deployed to your Kubernetes cluster. This guide demonstrates how to configure Flux to verify application container image signatures as part of your GitOps deployment pipeline.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed and bootstrapped on the cluster (v2.1 or later)
- kubectl configured to access your cluster
- Application container images signed with Cosign
- A Git repository connected to Flux

## Step 1: Sign Your Application Container Images

Before configuring verification, ensure your application images are signed. Here is an example of signing with Cosign:

```bash
# Generate a Cosign key pair
cosign generate-key-pair

# Sign an image with your private key
cosign sign --key cosign.key myregistry.example.com/myapp:v1.0.0

# For keyless signing using OIDC identity
cosign sign myregistry.example.com/myapp:v1.0.0
```

## Step 2: Store the Cosign Public Key as a Kubernetes Secret

Create a Kubernetes secret containing the Cosign public key that Flux will use for verification:

```bash
# Create a secret from the Cosign public key file
kubectl create secret generic cosign-pub-key \
  --from-file=cosign.pub=cosign.pub \
  -n flux-system
```

Alternatively, define it as a YAML resource:

```yaml
# clusters/my-cluster/secrets/cosign-pub-key.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cosign-pub-key
  namespace: flux-system
type: Opaque
data:
  cosign.pub: <base64-encoded-public-key>
```

## Step 3: Configure Image Verification in a Kustomization

Add image verification to your Flux Kustomization resource using the `verify` field in the OCI source:

```yaml
# clusters/my-cluster/apps/ocirepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://myregistry.example.com/myapp-manifests
  ref:
    tag: latest
  verify:
    provider: cosign
    secretRef:
      name: cosign-pub-key
```

Create the associated Kustomization:

```yaml
# clusters/my-cluster/apps/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: my-app
  targetNamespace: production
  prune: true
```

## Step 4: Configure Keyless Verification with Cosign

For images signed with keyless Cosign (using Sigstore), configure verification with the certificate identity:

```yaml
# clusters/my-cluster/apps/ocirepository-keyless.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-keyless
  namespace: flux-system
spec:
  interval: 5m
  url: oci://myregistry.example.com/myapp-manifests
  ref:
    tag: latest
  verify:
    provider: cosign
    matchOIDCIdentity:
      - issuer: "https://token.actions.githubusercontent.com"
        subject: "https://github.com/myorg/myapp/.github/workflows/build.yml@refs/heads/main"
```

## Step 5: Configure Verification for Helm Charts from OCI Registries

If you distribute Helm charts via OCI registries, configure verification on the HelmChart source:

```yaml
# clusters/my-cluster/apps/helmrepository-oci.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  interval: 5m
  url: oci://myregistry.example.com/charts

---
# clusters/my-cluster/apps/helmrelease-verified.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "1.0.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
      verify:
        provider: cosign
        secretRef:
          name: cosign-pub-key
  targetNamespace: production
```

## Step 6: Set Up Verification for Multiple Image Registries

When working with images from multiple registries, create separate verification configurations:

```yaml
# clusters/my-cluster/apps/oci-internal.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: internal-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://internal-registry.corp.example.com/apps/frontend
  ref:
    semver: ">=1.0.0"
  verify:
    provider: cosign
    secretRef:
      name: internal-cosign-pub-key

---
# clusters/my-cluster/apps/oci-vendor.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: vendor-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://vendor-registry.example.com/products/backend
  ref:
    tag: stable
  verify:
    provider: cosign
    secretRef:
      name: vendor-cosign-pub-key
```

## Verification

After deploying the configurations, verify the setup:

1. Check that the OCIRepository resource has been reconciled successfully:

```bash
flux get sources oci -A
```

2. Verify the Kustomization status:

```bash
flux get kustomizations -A
```

3. Check for verification-related events:

```bash
kubectl get events -n flux-system --field-selector reason=VerificationSucceeded
```

4. Test with an unsigned image by temporarily changing the OCI repository URL to an unsigned artifact and confirming it is rejected.

## Troubleshooting

### Error: Verification failed for OCI artifact

Check that the public key matches the key used to sign the artifact:

```bash
# Verify the artifact manually with Cosign
cosign verify --key cosign.pub myregistry.example.com/myapp-manifests:latest
```

### Error: Secret not found

Ensure the secret exists in the correct namespace:

```bash
kubectl get secret cosign-pub-key -n flux-system
```

### OCIRepository stuck in not ready state

Check the OCIRepository status for detailed error messages:

```bash
kubectl describe ocirepository my-app -n flux-system
```

Common causes include:
- Incorrect registry URL
- Authentication issues (add registry credentials via a secret)
- Network connectivity problems

### Keyless verification failing

For keyless verification, ensure the OIDC issuer and subject match exactly:

```bash
# Check the certificate identity of a signed image
cosign verify myregistry.example.com/myapp:v1.0.0 \
  --certificate-identity-regexp=".*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  --output json | jq '.[0].optional'
```

### Registry authentication required

If your OCI registry requires authentication, create credentials:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.example.com \
  --docker-username=user \
  --docker-password=password \
  -n flux-system
```

Then reference it in the OCIRepository:

```yaml
spec:
  secretRef:
    name: regcred
```

## Summary

Configuring image verification for application containers with Flux adds a critical layer of supply chain security to your GitOps workflow. By requiring signed images before deployment, you ensure that only authorized and verified artifacts reach your Kubernetes clusters. Whether you use key-based or keyless Cosign verification, Flux provides native support for integrating image verification directly into your deployment pipeline.
