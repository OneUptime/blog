# How to Configure Flux Notation Secret for Image Signing Verification

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, Notation, Image Signing, Supply Chain Security, Verification

Description: A guide to configuring Flux CD to verify container image signatures using Notation (Notary v2) with trust policies and verification certificates.

---

## Introduction

Container image signing is a critical part of supply chain security. Notation (also known as Notary v2) is an open standard for signing and verifying OCI artifacts. Flux CD integrates with Notation to verify image signatures before deploying containers, ensuring only trusted images run in your cluster. This guide covers how to configure the Notation verification secret and policy in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v2.1 or later)
- `kubectl` configured to access your cluster
- The `notation` CLI installed
- A signing certificate or public key from your signing authority
- Images signed with Notation in an OCI-compliant registry

## Understanding Notation in Flux

Flux source controller can verify Notation signatures on OCI artifacts before making them available to downstream resources. This verification uses:

- A trust policy (`trustpolicy.json`) that defines which registries and images require verification
- A trust store containing the signing CA certificates (with `.pem` or `.crt` extension)
- A Kubernetes Secret that holds both the trust policy and the verification certificates

The verification is configured on `OCIRepository` resources (and `HelmChart` resources) using the `.spec.verify` field, not on `ImagePolicy` resources.

## Step 1: Obtain the Verification Certificate

Get the public certificate used to sign your images. This is the certificate from your signing key pair.

```bash
# If you have the notation signing key, export the certificate
notation cert list

# Or obtain the certificate from your PKI team
# The certificate should be in PEM format
cat signing-cert.pem
```

## Step 2: Create the Notation Verification Secret

Flux expects the Notation secret to contain a trust policy file named `trustpolicy.json` and one or more CA certificates with `.pem` or `.crt` file extensions.

Create a Kubernetes Secret containing both the trust policy and the verification certificate:

```bash
kubectl create secret generic notation-config \
  --namespace=flux-system \
  --from-file=signing-cert.crt=./signing-cert.pem \
  --from-file=trustpolicy.json=./trustpolicy.json
```

## Step 3: Declarative YAML Manifest for the Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: notation-config
  namespace: flux-system
type: Opaque
stringData:
  signing-cert.crt: |
    -----BEGIN CERTIFICATE-----
    MIIEpDCCAoygAwIBAgIRAKz1b2c3d4e5f6g7h8i9j0kLMN0wDQYJKoZIhvcNAQEL
    ... (your signing verification certificate) ...
    -----END CERTIFICATE-----
  trustpolicy.json: |
    {
      "version": "1.0",
      "trustPolicies": [
        {
          "name": "production-images",
          "registryScopes": [
            "myregistry.example.com/my-app"
          ],
          "signatureVerification": {
            "level": "strict"
          },
          "trustStores": [
            "ca:flux-signing-ca"
          ],
          "trustedIdentities": [
            "x509.subject: CN=image-signer, O=my-org"
          ]
        }
      ]
    }
```

Note: The CA certificate key must have a `.pem` or `.crt` extension, and the trust policy must be named `trustpolicy.json`.

Apply it:

```bash
kubectl apply -f notation-config.yaml
```

## Step 4: Configure an OCIRepository with Notation Verification

Notation verification is configured on `OCIRepository` resources using the `.spec.verify` field (not on `ImagePolicy` resources).

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-manifests
  namespace: flux-system
spec:
  interval: 10m
  url: oci://myregistry.example.com/my-app-manifests
  ref:
    tag: "latest"
  verify:
    provider: notation
    secretRef:
      name: notation-config
```

## Step 5: Apply All Resources

```bash
kubectl apply -f notation-config.yaml
kubectl apply -f ocirepository.yaml
```

## Step 6: Verify the Setup

```bash
# Check OCIRepository status
kubectl get ocirepository -n flux-system my-app-manifests

# Describe the OCIRepository for verification details
kubectl describe ocirepository -n flux-system my-app-manifests

# Check for verification events
kubectl events -n flux-system --for ocirepository/my-app-manifests
```

## Step 7: Sign Images with Notation

For reference, here is how to sign images with the `notation` CLI:

```bash
# Generate a signing key (if you do not have one)
notation cert generate-test --default "image-signer"

# Sign an image
notation sign myregistry.example.com/my-app:1.0.0

# Verify the signature locally
notation verify myregistry.example.com/my-app:1.0.0
```

## Multiple Signing Certificates

If artifacts are signed by different teams with different certificates, create separate secrets (each containing their own `trustpolicy.json` and certificate files) and reference them in the corresponding `OCIRepository` resources.

```bash
kubectl create secret generic team-a-notation-config \
  --namespace=flux-system \
  --from-file=team-a-cert.crt=./team-a-signing-cert.pem \
  --from-file=trustpolicy.json=./team-a-trustpolicy.json

kubectl create secret generic team-b-notation-config \
  --namespace=flux-system \
  --from-file=team-b-cert.crt=./team-b-signing-cert.pem \
  --from-file=trustpolicy.json=./team-b-trustpolicy.json
```

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: team-a-app
  namespace: flux-system
spec:
  interval: 10m
  url: oci://myregistry.example.com/team-a-app
  ref:
    tag: "latest"
  verify:
    provider: notation
    secretRef:
      name: team-a-notation-config
```

## Troubleshooting

### Signature Verification Failed

Check that the certificate in the secret matches the one used to sign the artifacts:

```bash
# View the certificate in the secret
kubectl get secret notation-config -n flux-system \
  -o jsonpath='{.data.signing-cert\.crt}' | base64 -d | openssl x509 -text -noout

# Verify the image signature locally
notation verify myregistry.example.com/my-app:1.0.0
```

### No Signature Found

Ensure the image was actually signed:

```bash
notation ls myregistry.example.com/my-app:1.0.0
```

### Source Controller Logs

```bash
kubectl logs -n flux-system deploy/source-controller --tail=50
```

## Conclusion

Configuring Notation verification in Flux adds a supply chain security layer that prevents unsigned or tampered OCI artifacts from being deployed. By creating a Secret containing both the trust policy (`trustpolicy.json`) and the signing CA certificates (with `.pem` or `.crt` extensions) and referencing it in your `OCIRepository` resources via the `.spec.verify` field, you ensure that only artifacts signed by trusted parties are accepted by your GitOps pipeline.
