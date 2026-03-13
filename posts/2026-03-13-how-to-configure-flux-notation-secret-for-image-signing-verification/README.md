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

Flux image automation and the kustomize controller can verify Notation signatures on container images before applying updates. This verification uses:

- A trust policy that defines which registries and images require verification
- A trust store containing the signing certificates or public keys
- A Kubernetes secret that holds the verification certificate

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

Create a Kubernetes secret containing the verification certificate.

```bash
kubectl create secret generic notation-verify-cert \
  --namespace=flux-system \
  --from-file=notation-cert=./signing-cert.pem
```

## Step 3: Declarative YAML Manifest for the Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: notation-verify-cert
  namespace: flux-system
type: Opaque
stringData:
  notation-cert: |
    -----BEGIN CERTIFICATE-----
    MIIEpDCCAoygAwIBAgIRAKz1b2c3d4e5f6g7h8i9j0kLMN0wDQYJKoZIhvcNAQEL
    ... (your signing verification certificate) ...
    -----END CERTIFICATE-----
```

Apply it:

```bash
kubectl apply -f notation-verify-cert.yaml
```

## Step 4: Configure the ImagePolicy with Notation Verification

Flux `ImagePolicy` resources can include a verification section that references the Notation certificate.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
  verification:
    provider: notation
    secretRef:
      name: notation-verify-cert
```

## Step 5: Create the ImageRepository

The `ImageRepository` scans for new tags in the registry.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  image: myregistry.example.com/my-app
  secretRef:
    name: registry-credentials
```

## Step 6: Configure the Trust Policy

Notation uses a trust policy to define verification rules. Create a ConfigMap or include the trust policy in the secret.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notation-trust-policy
  namespace: flux-system
data:
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

## Step 7: Apply All Resources

```bash
kubectl apply -f notation-verify-cert.yaml
kubectl apply -f notation-trust-policy.yaml
kubectl apply -f image-repository.yaml
kubectl apply -f image-policy.yaml
```

## Step 8: Verify the Setup

```bash
# Check ImageRepository status
kubectl get imagerepository -n flux-system my-app

# Check ImagePolicy status
kubectl get imagepolicy -n flux-system my-app

# Describe the ImagePolicy for verification details
kubectl describe imagepolicy -n flux-system my-app

# Check for verification events
kubectl events -n flux-system --for imagepolicy/my-app
```

## Step 9: Sign Images with Notation

For reference, here is how to sign images with the `notation` CLI:

```bash
# Generate a signing key (if you do not have one)
notation cert generate-test --default "image-signer"

# Sign an image
notation sign myregistry.example.com/my-app:1.0.0

# Verify the signature locally
notation verify myregistry.example.com/my-app:1.0.0
```

## Step 10: Using Notation with OCIRepository

You can also verify Notation signatures on OCI artifacts pulled by `OCIRepository`.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
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
      name: notation-verify-cert
```

## Multiple Signing Certificates

If images are signed by different teams with different certificates, create separate secrets and reference them in the corresponding image policies.

```bash
kubectl create secret generic team-a-cert \
  --namespace=flux-system \
  --from-file=notation-cert=./team-a-signing-cert.pem

kubectl create secret generic team-b-cert \
  --namespace=flux-system \
  --from-file=notation-cert=./team-b-signing-cert.pem
```

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: team-a-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: team-a-app
  policy:
    semver:
      range: ">=1.0.0"
  verification:
    provider: notation
    secretRef:
      name: team-a-cert
```

## Troubleshooting

### Signature Verification Failed

Check that the certificate in the secret matches the one used to sign the images:

```bash
# View the certificate in the secret
kubectl get secret notation-verify-cert -n flux-system \
  -o jsonpath='{.data.notation-cert}' | base64 -d | openssl x509 -text -noout

# Verify the image signature locally
notation verify --cert signing-cert.pem myregistry.example.com/my-app:1.0.0
```

### No Signature Found

Ensure the image was actually signed:

```bash
notation ls myregistry.example.com/my-app:1.0.0
```

### Image Controller Logs

```bash
kubectl logs -n flux-system deploy/image-reflector-controller --tail=50
kubectl logs -n flux-system deploy/image-automation-controller --tail=50
```

## Conclusion

Configuring Notation verification in Flux adds a supply chain security layer that prevents unsigned or tampered images from being deployed. By creating a secret with the signing certificate and referencing it in your `ImagePolicy` or `OCIRepository` resources, you ensure that only images signed by trusted parties are accepted by your GitOps pipeline.
