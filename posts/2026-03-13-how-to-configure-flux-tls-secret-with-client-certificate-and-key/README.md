# How to Configure Flux TLS Secret with Client Certificate and Key

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, TLS, Client Certificate, Mutual TLS, mTLS, Security

Description: How to configure Flux CD with client TLS certificates for mutual TLS authentication against Git servers, Helm repositories, and OCI registries.

---

## Introduction

Mutual TLS (mTLS) adds a layer of authentication where both the client and server present certificates to verify their identity. Some organizations require mTLS for accessing Git servers, Helm repositories, or OCI registries. Flux CD supports client certificate authentication through a TLS secret that includes the client certificate, private key, and optionally a CA certificate. This guide covers the full setup.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- A client certificate file in PEM format (`client.crt`)
- A client private key file in PEM format (`client.key`)
- The CA certificate that signed the server certificate (`ca.crt`)
- A server configured to require client certificate authentication

## Step 1: Generate or Obtain Client Certificates

If you need to generate client certificates, you can use `openssl`.

```bash
# Generate a private key for the client
openssl genrsa -out client.key 4096

# Create a certificate signing request (CSR)
openssl req -new -key client.key -out client.csr \
  -subj "/CN=flux-source-controller/O=flux-system"

# Sign the CSR with your CA
openssl x509 -req -in client.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client.crt -days 365 \
  -sha256
```

Verify the certificate:

```bash
openssl x509 -in client.crt -text -noout | head -15
openssl verify -CAfile ca.crt client.crt
```

## Step 2: Create the TLS Secret with kubectl

Create a `kubernetes.io/tls` type secret with the client certificate and key, plus the CA certificate.

```bash
kubectl create secret tls flux-mtls-secret \
  --namespace=flux-system \
  --cert=client.crt \
  --key=client.key
```

Then patch the secret to add the CA certificate:

```bash
kubectl patch secret flux-mtls-secret -n flux-system \
  --type=json \
  -p="[{\"op\":\"add\",\"path\":\"/data/ca.crt\",\"value\":\"$(base64 -w 0 ca.crt)\"}]"
```

## Step 3: Create the Secret as a Generic Secret

Alternatively, create the secret with all three files at once using a generic secret type:

```bash
kubectl create secret generic flux-mtls-secret \
  --namespace=flux-system \
  --from-file=tls.crt=client.crt \
  --from-file=tls.key=client.key \
  --from-file=ca.crt=ca.crt
```

## Step 4: Declarative YAML Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: flux-mtls-secret
  namespace: flux-system
type: Opaque
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    MIIEpDCCAoygAwIBAgIRAKz1b2c3d4e5f6g7h8i9j0kLMN0wDQYJKoZIhvcNAQEL
    ... (your client certificate) ...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA1b2c3d4e5f6g7h8i9j0kLMNOPQRSTUVWXYZabcdefghijklm
    ... (your client private key) ...
    -----END RSA PRIVATE KEY-----
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJALa1b2c3d4e5MA0GCSqGSIb3DqEBCwUAMEUxCzAJBgNV
    ... (CA certificate) ...
    -----END CERTIFICATE-----
```

Apply it:

```bash
kubectl apply -f flux-mtls-secret.yaml
```

## Step 5: Reference the Secret in a GitRepository

For GitRepository, use `secretRef` (not `certSecretRef`, which does not exist on GitRepository). The source controller reads `tls.crt` and `tls.key` for client authentication and `ca.crt` for server verification from the `secretRef` secret.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: secure-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.secure.example.com/team/secure-app.git
  ref:
    branch: main
  secretRef:
    name: flux-mtls-secret
```

Note: HelmRepository and other source types (OCIRepository, Bucket) use `certSecretRef` for TLS certificates. GitRepository is different -- it uses `secretRef` for both authentication credentials and TLS certificates.

## Step 6: Reference the Secret in a HelmRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: secure-charts
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.secure.example.com
  certSecretRef:
    name: flux-mtls-secret
```

## Step 7: Combining mTLS with Basic Authentication

If the server requires both mTLS and username/password authentication:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: secure-git-full-auth
  namespace: flux-system
type: Opaque
stringData:
  username: "git-user"
  password: "git-token"
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    ... (client certificate) ...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN RSA PRIVATE KEY-----
    ... (client private key) ...
    -----END RSA PRIVATE KEY-----
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    ... (CA certificate) ...
    -----END CERTIFICATE-----
```

For GitRepository, reference this single secret using `secretRef` -- it handles both authentication and TLS:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: secure-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.secure.example.com/team/secure-app.git
  ref:
    branch: main
  secretRef:
    name: secure-git-full-auth
```

For HelmRepository, you would use both `secretRef` (for credentials) and `certSecretRef` (for TLS):

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: secure-charts
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.secure.example.com
  secretRef:
    name: secure-helm-auth
  certSecretRef:
    name: secure-helm-auth
```

## Step 8: Verify the Configuration

```bash
# Check source status
flux get sources git secure-app

# Describe for detailed status and conditions
kubectl describe gitrepository -n flux-system secure-app

# Force reconciliation
flux reconcile source git secure-app

# Check source controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep -i "tls\|certificate\|handshake"
```

## Step 9: Test Client Certificate Locally

Before applying to Flux, verify the mTLS setup works using `curl`:

```bash
curl -v \
  --cert client.crt \
  --key client.key \
  --cacert ca.crt \
  https://git.secure.example.com/
```

## Certificate Renewal

Client certificates expire. Plan for renewal before expiration.

```bash
# Check certificate expiry
openssl x509 -in client.crt -dates -noout

# After generating new certificates, update the secret
kubectl create secret generic flux-mtls-secret \
  --namespace=flux-system \
  --from-file=tls.crt=new-client.crt \
  --from-file=tls.key=new-client.key \
  --from-file=ca.crt=ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -

# Force reconciliation to pick up new certificates
flux reconcile source git secure-app
```

## Troubleshooting

### TLS Handshake Error

If the server rejects the client certificate, verify it was signed by a CA the server trusts:

```bash
openssl verify -CAfile server-trusted-ca.crt client.crt
```

### Key Mismatch

Ensure the private key matches the certificate:

```bash
# These two commands should output the same modulus
openssl x509 -noout -modulus -in client.crt | openssl md5
openssl rsa -noout -modulus -in client.key | openssl md5
```

### Wrong Secret Key Names

Flux expects these specific keys:
- `tls.crt` for the client certificate
- `tls.key` for the client private key
- `ca.crt` for the CA certificate

Verify them:

```bash
kubectl get secret flux-mtls-secret -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

## Conclusion

Configuring Flux with client TLS certificates enables mutual TLS authentication against secured repositories. By including `tls.crt`, `tls.key`, and `ca.crt` in a Kubernetes secret and referencing it appropriately -- with `secretRef` for GitRepository or `certSecretRef` for HelmRepository, OCIRepository, and Bucket -- Flux source controller can authenticate and establish secure connections to mTLS-protected endpoints.
