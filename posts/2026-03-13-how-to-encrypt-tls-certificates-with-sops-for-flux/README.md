# How to Encrypt TLS Certificates with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, TLS, Certificates, Ingress

Description: Learn how to encrypt TLS certificate private keys and certificates using SOPS for secure GitOps management with Flux.

---

TLS certificates and their private keys are among the most sensitive assets in a Kubernetes cluster. When managing TLS secrets through a GitOps workflow with Flux, these credentials must be encrypted before being committed to Git. This guide covers encrypting TLS certificates with SOPS and deploying them through Flux.

## Why Encrypt TLS Secrets in Git

TLS private keys must never be stored in plaintext in a Git repository. A leaked private key allows an attacker to impersonate your service, decrypt intercepted traffic, and perform man-in-the-middle attacks. SOPS encryption ensures the private key is protected at rest while enabling GitOps-managed certificate deployment.

## Prerequisites

You need:

- A Kubernetes cluster with Flux and SOPS decryption configured
- SOPS and age CLI tools installed
- TLS certificate and private key files
- An age key pair with the private key stored in the flux-system namespace

## Creating a TLS Secret Manifest

If you have certificate and key files, create a Kubernetes TLS secret:

```bash
kubectl create secret tls my-tls-secret \
  --cert=tls.crt \
  --key=tls.key \
  --namespace=default \
  --dry-run=client -o yaml > tls-secret.yaml
```

This generates:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-tls-secret
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi...base64-encoded-cert...
  tls.key: LS0tLS1CRUdJTi...base64-encoded-key...
```

## Using stringData for PEM Files

For easier management, use `stringData` with PEM-formatted certificates:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-tls-secret
  namespace: default
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    MIIFazCCA1OgAwIBAgIUEt...
    ...certificate content...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    MIIEvgIBADANBgkqhkiG9w...
    ...private key content...
    -----END PRIVATE KEY-----
```

## Configuring SOPS for TLS Secrets

Set up `.sops.yaml` to encrypt TLS secret data:

```yaml
creation_rules:
  - path_regex: .*tls.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData)$
```

## Encrypting the TLS Secret

Encrypt the manifest:

```bash
sops --encrypt --in-place tls-secret.yaml
```

After encryption, the certificate and key values are encrypted while metadata remains readable:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-tls-secret
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: ENC[AES256_GCM,data:...,type:str]
  tls.key: ENC[AES256_GCM,data:...,type:str]
sops:
  # ... metadata ...
```

## Including CA Certificates

For mTLS or custom CA chains, include the CA certificate:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-tls-secret
  namespace: default
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    ...server certificate...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    ...private key...
    -----END PRIVATE KEY-----
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    ...CA certificate...
    -----END CERTIFICATE-----
```

## Deploying with Flux

Create a Flux Kustomization to deploy the encrypted TLS secret:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tls-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/tls
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Using TLS Secrets with Ingress

Reference the TLS secret in an Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: default
spec:
  tls:
    - hosts:
        - myapp.example.com
      secretName: my-tls-secret
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
```

## Wildcard TLS Certificates

For wildcard certificates shared across multiple services:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: wildcard-tls
  namespace: default
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    ...wildcard certificate for *.example.com...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    ...private key...
    -----END PRIVATE KEY-----
```

Encrypt and deploy this in a shared namespace, then reference it from multiple Ingress resources.

## Multi-Environment TLS Secrets

Organize TLS secrets by environment:

```text
infrastructure/
  tls/
    dev/
      tls-secret.yaml          # SOPS encrypted, dev cert
    staging/
      tls-secret.yaml          # SOPS encrypted, staging cert
    production/
      tls-secret.yaml          # SOPS encrypted, production cert
```

Use environment-specific SOPS keys:

```yaml
creation_rules:
  - path_regex: infrastructure/tls/production/.*\.yaml$
    age: age1prodkey...
    encrypted_regex: ^(data|stringData)$

  - path_regex: infrastructure/tls/.*\.yaml$
    age: age1devkey...
    encrypted_regex: ^(data|stringData)$
```

## Certificate Renewal

When certificates expire and need renewal, update the encrypted secret:

```bash
# Decrypt the existing secret
sops --decrypt tls-secret.yaml > /tmp/tls-decrypted.yaml

# Replace certificate and key content in /tmp/tls-decrypted.yaml

# Re-encrypt
sops --encrypt /tmp/tls-decrypted.yaml > tls-secret.yaml
rm /tmp/tls-decrypted.yaml
```

Commit and push. Flux automatically updates the secret in the cluster.

## Verifying the Deployment

After deployment, verify the TLS secret and certificate:

```bash
# Check the secret exists
kubectl get secret my-tls-secret -n default

# Verify the certificate details
kubectl get secret my-tls-secret -n default -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout

# Check Ingress TLS configuration
kubectl describe ingress myapp-ingress -n default
```

## Conclusion

Encrypting TLS certificates with SOPS in Flux provides a secure GitOps approach to certificate management. Private keys are protected in Git, and Flux handles decryption and deployment transparently. For production environments, consider combining this approach with cert-manager for automated certificate issuance and renewal, using SOPS-encrypted secrets only for externally provided certificates.
