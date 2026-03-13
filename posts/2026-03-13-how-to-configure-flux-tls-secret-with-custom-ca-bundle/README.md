# How to Configure Flux TLS Secret with Custom CA Bundle

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, TLS, CA Bundle, Certificates, Security

Description: How to configure Flux CD with a custom CA certificate bundle for connecting to Git and Helm repositories that use internal or self-signed TLS certificates.

---

## Introduction

Organizations that run private Git servers or Helm repositories often use TLS certificates signed by an internal Certificate Authority. Flux CD source controller does not trust these certificates by default since they are not in the system CA store. To allow Flux to connect, you need to provide a custom CA bundle through a Kubernetes secret. This guide shows how to configure that.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- The CA certificate file (PEM format) that signed your server certificates
- Access to the private Git or Helm repository you want Flux to connect to

## When You Need a Custom CA Bundle

You need a custom CA bundle when:

- Your Git server uses a certificate signed by an internal CA
- Your Helm repository uses a self-signed certificate
- A TLS-inspecting proxy re-signs certificates with its own CA
- Your organization has a private PKI infrastructure

## Step 1: Obtain the CA Certificate

Get the CA certificate that signed your server's TLS certificate. This is typically available from your security or infrastructure team.

You can also extract it from the server:

```bash
# Extract the CA certificate from a running server
openssl s_client -showcerts -connect git.internal.example.com:443 </dev/null 2>/dev/null \
  | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' > ca-bundle.crt
```

If there is a certificate chain, save all intermediate and root certificates into a single file:

```bash
# Verify the certificate
openssl x509 -in ca-bundle.crt -text -noout | head -20
```

## Step 2: Create the TLS CA Secret

Create a Kubernetes secret containing the CA certificate. Flux expects the CA certificate in the `ca.crt` key.

```bash
kubectl create secret generic flux-custom-ca \
  --namespace=flux-system \
  --from-file=ca.crt=./ca-bundle.crt
```

## Step 3: Declarative YAML Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: flux-custom-ca
  namespace: flux-system
type: Opaque
stringData:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJALa1b2c3d4e5MA0GCSqGSIb3DqEBCwUAMEUxCzAJBgNV
    ... (your root CA certificate) ...
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    MIIDYTCCAkmgAwIBAgIJALa1b2c3d4e6MA0GCSqGSIb3DqEBCwUAMEUxCzAJBgNV
    ... (intermediate CA certificate if applicable) ...
    -----END CERTIFICATE-----
```

Apply it:

```bash
kubectl apply -f flux-custom-ca.yaml
```

## Step 4: Reference the CA Secret in a GitRepository

Use the `certSecretRef` field to point to the CA secret.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: internal-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.example.com/team/internal-app.git
  ref:
    branch: main
  secretRef:
    name: internal-git-auth
  certSecretRef:
    name: flux-custom-ca
```

## Step 5: Reference the CA Secret in a HelmRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.internal.example.com
  certSecretRef:
    name: flux-custom-ca
```

## Step 6: Reference the CA Secret in a Bucket Source

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: internal-bucket
  namespace: flux-system
spec:
  interval: 10m
  provider: generic
  bucketName: flux-artifacts
  endpoint: minio.internal.example.com
  certSecretRef:
    name: flux-custom-ca
  secretRef:
    name: minio-credentials
```

## Step 7: Combining CA Bundle with Authentication

You can combine the CA certificate with Git authentication credentials in a single secret. Flux will use `ca.crt` for TLS verification and the other fields for authentication.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: internal-git-auth-with-ca
  namespace: flux-system
type: Opaque
stringData:
  username: "git-user"
  password: "git-token"
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJALa1b2c3d4e5MA0GCSqGSIb3DqEBCwUAMEUxCzAJBgNV
    ... (CA certificate content) ...
    -----END CERTIFICATE-----
```

Then reference it as both the auth and cert secret:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: internal-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.example.com/team/internal-app.git
  ref:
    branch: main
  secretRef:
    name: internal-git-auth-with-ca
  certSecretRef:
    name: internal-git-auth-with-ca
```

## Step 8: Verify the Configuration

```bash
# Check the source status
flux get sources git internal-app

# Describe for detailed information
kubectl describe gitrepository -n flux-system internal-app

# Force a reconciliation
flux reconcile source git internal-app

# View source controller logs for TLS errors
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep -i "tls\|x509\|certificate"
```

## Multiple CA Certificates

If different servers use different CAs, you can either bundle all CAs into one secret or create separate secrets for each source.

### Bundled Approach

Concatenate all CA certificates into a single file:

```bash
cat root-ca.crt intermediate-ca.crt git-ca.crt > combined-ca-bundle.crt

kubectl create secret generic flux-combined-ca \
  --namespace=flux-system \
  --from-file=ca.crt=./combined-ca-bundle.crt
```

### Separate Secrets Approach

```bash
kubectl create secret generic git-ca \
  --namespace=flux-system \
  --from-file=ca.crt=./git-ca.crt

kubectl create secret generic helm-ca \
  --namespace=flux-system \
  --from-file=ca.crt=./helm-ca.crt
```

Then reference the appropriate secret in each source resource.

## Troubleshooting

### x509: Certificate Signed by Unknown Authority

This is the most common error. It means the CA certificate is missing or incorrect.

```bash
# Verify the CA cert in the secret matches the server cert issuer
kubectl get secret flux-custom-ca -n flux-system -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -text -noout | grep Issuer

# Verify the server certificate chain
openssl s_client -connect git.internal.example.com:443 -CAfile ca-bundle.crt </dev/null
```

### Certificate Has Expired

Check the CA certificate validity:

```bash
kubectl get secret flux-custom-ca -n flux-system -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -dates -noout
```

### Wrong Key Name in Secret

Flux expects the key `ca.crt` specifically. Verify the key name:

```bash
kubectl get secret flux-custom-ca -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

## Conclusion

Providing a custom CA bundle through a Kubernetes secret allows Flux to trust internal certificates and connect securely to private Git servers, Helm repositories, and bucket sources. Use `certSecretRef` on your source resources and ensure the `ca.crt` key contains the full certificate chain needed for verification.
