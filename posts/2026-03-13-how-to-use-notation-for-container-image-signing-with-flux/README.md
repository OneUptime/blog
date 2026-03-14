# How to Use Notation for Container Image Signing with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Notation, Image Signing, OCI, Container Security

Description: Learn how to use Notation (Notary v2) for signing container images and verify them with Flux for secure GitOps deployments.

---

Notation is the CLI tool for the Notary v2 project, providing a standard-based solution for signing and verifying OCI artifacts. Flux supports Notation as a verification provider, enabling you to integrate Notary v2 signing workflows into your GitOps pipelines. This guide walks you through signing container images with Notation and configuring Flux to verify them.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed and bootstrapped (v2.2 or later for Notation support)
- Notation CLI installed (v1.0 or later)
- kubectl configured to access your cluster
- An OCI-compliant container registry
- A code signing certificate or a test certificate for development

Install Notation:

```bash
# Install Notation on Linux
curl -sSL https://github.com/notaryproject/notation/releases/latest/download/notation_linux_amd64.tar.gz | tar -xz -C /usr/local/bin notation

# Install on macOS
brew install notation

# Verify installation
notation version
```

## Step 1: Set Up Notation Signing Keys

Generate a test certificate for signing (for development purposes):

```bash
# Generate an RSA key pair and self-signed certificate
notation cert generate-test --default "flux-test-signing"

# List the signing keys
notation key ls

# List the certificates in the trust store
notation cert ls
```

For production environments, use a certificate from a trusted Certificate Authority:

```bash
# Import a certificate from a CA
notation key add --name production-key \
  --plugin azure-kv \
  --id https://myvault.vault.azure.net/keys/signing-key/abc123 \
  --default
```

## Step 2: Sign Container Images with Notation

Sign your application container image:

```bash
# Sign an image
notation sign myregistry.example.com/myapp:v1.0.0

# Verify the signature locally
notation verify myregistry.example.com/myapp:v1.0.0

# List signatures attached to an image
notation ls myregistry.example.com/myapp:v1.0.0
```

## Step 3: Export the Trust Policy and Certificate

Create a Notation trust policy document:

```json
{
  "version": "1.0",
  "trustPolicies": [
    {
      "name": "flux-verification-policy",
      "registryScopes": ["myregistry.example.com/myapp"],
      "signatureVerification": {
        "level": "strict"
      },
      "trustStores": ["ca:flux-trust-store"],
      "trustedIdentities": ["*"]
    }
  ]
}
```

Save this as `trustpolicy.json`.

## Step 4: Store the Trust Policy and Certificate in Kubernetes

Create Kubernetes secrets for the Notation trust policy and CA certificate:

```bash
# Create a secret for the trust policy
kubectl create secret generic notation-trust-policy \
  --from-file=trustpolicy.json=trustpolicy.json \
  -n flux-system

# Create a secret for the CA certificate
kubectl create secret generic notation-ca-cert \
  --from-file=ca.crt=/path/to/your/ca-certificate.crt \
  -n flux-system
```

Or define them as YAML:

```yaml
# clusters/my-cluster/secrets/notation-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: notation-trust-policy
  namespace: flux-system
type: Opaque
stringData:
  trustpolicy.json: |
    {
      "version": "1.0",
      "trustPolicies": [
        {
          "name": "flux-verification-policy",
          "registryScopes": ["myregistry.example.com/myapp"],
          "signatureVerification": {
            "level": "strict"
          },
          "trustStores": ["ca:flux-trust-store"],
          "trustedIdentities": ["*"]
        }
      ]
    }
```

## Step 5: Configure Flux OCIRepository with Notation Verification

Configure an OCIRepository resource that uses Notation for verification:

```yaml
# clusters/my-cluster/apps/ocirepository-notation.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://myregistry.example.com/myapp
  ref:
    tag: v1.0.0
  verify:
    provider: notation
    secretRef:
      name: notation-ca-cert
```

Create the Kustomization to deploy the verified artifacts:

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

## Step 6: Sign and Push OCI Artifacts for Flux

Sign Kubernetes manifests packaged as OCI artifacts:

```bash
# Package manifests as an OCI artifact
flux push artifact oci://myregistry.example.com/myapp-manifests:v1.0.0 \
  --path=./manifests \
  --source="https://github.com/myorg/myapp" \
  --revision="v1.0.0/$(git rev-parse HEAD)"

# Sign the OCI artifact with Notation
notation sign myregistry.example.com/myapp-manifests:v1.0.0
```

## Verification

After deploying the configuration, verify the setup:

1. Check OCIRepository reconciliation status:

```bash
flux get sources oci -A
```

2. Confirm that the source shows a successful verification:

```bash
kubectl describe ocirepository my-app -n flux-system
```

Look for events indicating successful Notation verification.

3. Test with an unsigned artifact to confirm rejection:

```bash
# Push an unsigned artifact
flux push artifact oci://myregistry.example.com/myapp-manifests:unsigned \
  --path=./manifests \
  --source="https://github.com/myorg/myapp" \
  --revision="unsigned/test"

# Update the OCIRepository to reference the unsigned tag
# The reconciliation should fail with a verification error
```

## Troubleshooting

### Error: Notation verification failed

Verify that the image was signed correctly:

```bash
# Check signatures on the image
notation ls myregistry.example.com/myapp:v1.0.0

# Verify locally
notation verify myregistry.example.com/myapp:v1.0.0
```

### Error: Trust policy not found

Ensure the trust policy secret is correctly mounted and the JSON is valid:

```bash
kubectl get secret notation-trust-policy -n flux-system -o jsonpath='{.data.trustpolicy\.json}' | base64 -d | jq .
```

### Error: Certificate not trusted

If using a self-signed certificate for testing, ensure it is added to the trust store:

```bash
# Add certificate to Notation trust store locally
notation cert add --type ca --store flux-trust-store /path/to/ca-certificate.crt

# Verify the certificate is in the store
notation cert ls
```

### Flux controller does not support Notation

Ensure you are running Flux v2.2.0 or later, which includes Notation support:

```bash
flux version
```

If running an older version, upgrade Flux:

```bash
flux install --version=latest
```

### Registry authentication failures

Create registry credentials and reference them in the OCIRepository:

```yaml
spec:
  secretRef:
    name: regcred
```

## Summary

Using Notation for container image signing with Flux provides a standards-based approach to supply chain security that leverages the Notary v2 specification. By signing your OCI artifacts with Notation and configuring Flux to verify signatures before deployment, you establish a trust chain from your build process to your Kubernetes cluster. This approach is particularly valuable for organizations that require PKI-based signing workflows or need to comply with specific signing standards.
