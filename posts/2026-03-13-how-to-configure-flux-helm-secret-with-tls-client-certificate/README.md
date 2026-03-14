# How to Configure Flux Helm Secret with TLS Client Certificate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, Helm, HelmRepository, TLS, Client Certificate, MTLS

Description: How to configure Flux CD to authenticate with Helm repositories using mutual TLS (mTLS) client certificates.

---

## Introduction

Mutual TLS (mTLS) provides a strong form of authentication where both the client and server present certificates to verify each other's identity. Some organizations require mTLS for accessing private Helm chart repositories, especially in high-security environments.

Flux CD's Source Controller supports TLS client certificate authentication for `HelmRepository` resources. This guide walks through creating the necessary certificates, storing them in a Kubernetes Secret, and configuring Flux to use them.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- A Helm chart repository configured to require TLS client certificates
- A client certificate and private key signed by the repository's trusted CA
- `openssl` available on your local machine

## Step 1: Prepare Your TLS Certificates

You need three files for mTLS authentication:

1. **Client certificate** (`tls.crt`): The certificate presented by Flux to the server
2. **Client private key** (`tls.key`): The private key corresponding to the client certificate
3. **CA certificate** (`ca.crt`): The certificate authority that signed the server's certificate

If you need to generate a client certificate for testing, you can use the following commands:

### Generate a CA (if you do not already have one)

```bash
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 \
  -out ca.crt -subj "/CN=Helm Repo CA"
```

### Generate a Client Certificate

```bash
openssl genrsa -out tls.key 4096
openssl req -new -key tls.key -out client.csr \
  -subj "/CN=flux-source-controller/O=flux-system"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out tls.crt -days 365 -sha256
```

## Step 2: Create the Kubernetes Secret

Create a Secret of type `kubernetes.io/tls` with the client certificate, private key, and CA certificate:

```bash
kubectl create secret generic helm-tls-credentials \
  --namespace=flux-system \
  --from-file=tls.crt=./tls.crt \
  --from-file=tls.key=./tls.key \
  --from-file=ca.crt=./ca.crt
```

As a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-tls-credentials
  namespace: flux-system
type: Opaque
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    <your-client-certificate-content>
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN RSA PRIVATE KEY-----
    <your-client-private-key-content>
    -----END RSA PRIVATE KEY-----
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    <your-ca-certificate-content>
    -----END CERTIFICATE-----
```

Apply the manifest:

```bash
kubectl apply -f helm-tls-secret.yaml
```

## Step 3: Configure the HelmRepository Resource

Create a `HelmRepository` resource that references the TLS Secret:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: secure-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.secure.example.com
  certSecretRef:
    name: helm-tls-credentials
```

Apply the resource:

```bash
kubectl apply -f helmrepository.yaml
```

The Source Controller will use the `tls.crt` and `tls.key` for client authentication, and `ca.crt` to verify the server's certificate. Note that TLS certificate configuration uses `certSecretRef` (not `secretRef`), as the `secretRef` field is reserved for basic authentication credentials.

## Step 4: Combine with Basic Auth (Optional)

If your Helm repository requires both TLS client certificates and basic auth, use two separate secrets referenced by `secretRef` (for basic auth) and `certSecretRef` (for TLS):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-basic-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: your-username
  password: your-password
---
apiVersion: v1
kind: Secret
metadata:
  name: helm-tls-credentials
  namespace: flux-system
type: Opaque
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    <your-client-certificate-content>
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN RSA PRIVATE KEY-----
    <your-client-private-key-content>
    -----END RSA PRIVATE KEY-----
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    <your-ca-certificate-content>
    -----END CERTIFICATE-----
```

Then reference both in the `HelmRepository`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: secure-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.secure.example.com
  secretRef:
    name: helm-basic-credentials
  certSecretRef:
    name: helm-tls-credentials
```

## Step 5: Deploy a Chart from the Secured Repository

Create a `HelmRelease` that uses a chart from the mTLS-protected repository:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: secure-app
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: secure-app
      version: ">=1.0.0"
      sourceRef:
        kind: HelmRepository
        name: secure-charts
        namespace: flux-system
  values:
    replicas: 3
```

Apply the resource:

```bash
kubectl apply -f helmrelease.yaml
```

## Verification

Check the `HelmRepository` status:

```bash
flux get sources helm secure-charts
```

Detailed status and events:

```bash
kubectl describe helmrepository secure-charts -n flux-system
```

Verify the `HelmRelease` status:

```bash
flux get helmreleases -n flux-system
```

Test the connection manually using `curl` with the same certificates:

```bash
curl --cert tls.crt --key tls.key --cacert ca.crt \
  https://charts.secure.example.com/index.yaml
```

## Troubleshooting

### TLS Handshake Failed

If you see TLS handshake errors:

1. Verify the client certificate is signed by a CA trusted by the server.
2. Check the certificate has not expired:

```bash
openssl x509 -in tls.crt -noout -dates
```

3. Ensure the key matches the certificate:

```bash
openssl x509 -noout -modulus -in tls.crt | openssl md5
openssl rsa -noout -modulus -in tls.key | openssl md5
```

Both commands should output the same MD5 hash.

### Certificate Expired

If your client certificate has expired:

1. Generate a new certificate (Step 1).
2. Update the Secret:

```bash
kubectl create secret generic helm-tls-credentials \
  --namespace=flux-system \
  --from-file=tls.crt=./new-tls.crt \
  --from-file=tls.key=./new-tls.key \
  --from-file=ca.crt=./ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -
```

3. Reconcile the source:

```bash
flux reconcile source helm secure-charts
```

### Wrong CA Certificate

If the server's certificate is not trusted:

1. Obtain the correct CA certificate from your server administrator.
2. You can retrieve the server's certificate chain for inspection:

```bash
openssl s_client -connect charts.secure.example.com:443 -showcerts </dev/null 2>/dev/null
```

3. Update the `ca.crt` in the Secret with the correct CA.

### Secret Key Names

Flux expects specific key names in the Secret:

- `tls.crt`: Client certificate in PEM format
- `tls.key`: Client private key in PEM format
- `ca.crt`: CA certificate in PEM format

Using different key names will cause authentication to fail silently.

## Certificate Rotation

For production environments, implement a certificate rotation strategy:

1. Use cert-manager to automate certificate issuance and renewal.
2. Create a `Certificate` resource that writes to the same Secret:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: helm-client-cert
  namespace: flux-system
spec:
  secretName: helm-tls-credentials
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
  commonName: flux-source-controller
  duration: 720h
  renewBefore: 168h
  usages:
  - client auth
```

This ensures the client certificate is automatically renewed before expiration.

## Summary

TLS client certificate authentication provides strong mutual authentication between Flux and your Helm chart repository. By storing the client certificate, private key, and CA certificate in a Kubernetes Secret and referencing it from a `HelmRepository` resource, Flux can securely pull charts from mTLS-protected repositories. For production use, consider automating certificate rotation with cert-manager.
