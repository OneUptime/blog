# How to Store TLS Certificates in Git with SOPS and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, TLS, Certificates, Security

Description: Learn how to safely store TLS certificates and private keys in Git using SOPS encryption and deploy them automatically with Flux CD.

---

TLS certificates and their private keys are essential for securing communication in Kubernetes clusters. While cert-manager can automate certificate issuance, many scenarios require manually managed certificates: wildcard certificates from enterprise CAs, client certificates for mutual TLS, or certificates for services that do not support ACME. This guide shows how to store these certificates securely in Git using SOPS and deploy them with Flux.

## When to Store TLS Certificates in Git

Use this approach when:

- You receive certificates from an enterprise certificate authority
- You need wildcard certificates that cert-manager cannot issue
- You manage client certificates for mTLS between services
- You need certificates for non-HTTP protocols
- You want full Git history of certificate changes

For certificates that can be automatically issued and renewed, consider cert-manager managed by Flux instead.

## Preparing the TLS Secret

Start with your certificate files. A typical set includes:

- `tls.crt` - the certificate (and optionally the CA chain)
- `tls.key` - the private key

Create a Kubernetes TLS secret manifest:

```yaml
# infrastructure/tls/wildcard-cert.sops.yaml (before encryption)
apiVersion: v1
kind: Secret
metadata:
  name: wildcard-tls
  namespace: istio-system
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUJ5H3...
    ... (certificate content) ...
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    MIIFYDCCBEigAwIBAgIQQAF3...
    ... (intermediate CA) ...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    MIIEvgIBADANBgkqhkiG9w0B...
    ... (private key content) ...
    -----END PRIVATE KEY-----
```

Using `stringData` instead of `data` lets you paste the PEM content directly without base64 encoding.

## Encrypting with SOPS

For TLS secrets, you typically want to encrypt only the certificate data while leaving the metadata readable. Configure `.sops.yaml`:

```yaml
creation_rules:
  - path_regex: .*tls.*\.sops\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
    encrypted_regex: "^(tls\\.crt|tls\\.key|ca\\.crt)$"
  - path_regex: .*\.sops\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

The `encrypted_regex` ensures only the certificate and key values are encrypted, keeping the secret name, namespace, and type visible for code review.

Encrypt the file:

```bash
sops --encrypt --in-place infrastructure/tls/wildcard-cert.sops.yaml
```

After encryption:

```yaml
apiVersion: v1
kind: Secret
metadata:
    name: wildcard-tls
    namespace: istio-system
type: kubernetes.io/tls
stringData:
    tls.crt: ENC[AES256_GCM,data:long-encrypted-string...,type:str]
    tls.key: ENC[AES256_GCM,data:long-encrypted-string...,type:str]
sops:
    age:
        - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
    lastmodified: "2026-03-05T00:00:00Z"
    version: 3.8.1
```

## Deploying with Flux

Create a Kustomization that references the TLS secrets directory and enables SOPS decryption:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tls-certificates
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

Add a `kustomization.yaml` in the TLS directory:

```yaml
# infrastructure/tls/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - wildcard-cert.sops.yaml
```

## Using TLS Secrets with Ingress

Reference the TLS secret in an Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: default
spec:
  tls:
    - hosts:
        - "*.example.com"
      secretName: wildcard-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

For cross-namespace usage, the TLS secret must exist in the same namespace as the Ingress. You can duplicate the encrypted secret manifest for multiple namespaces or use a tool like Reflector to mirror secrets across namespaces.

## Storing CA Certificates

For mutual TLS or custom CA trust, store the CA certificate separately:

```yaml
# infrastructure/tls/ca-bundle.sops.yaml (before encryption)
apiVersion: v1
kind: Secret
metadata:
  name: custom-ca-bundle
  namespace: default
type: Opaque
stringData:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIFYDCCBEigAwIBAgIQQAF3...
    ... (CA certificate) ...
    -----END CERTIFICATE-----
```

Mount the CA certificate in pods that need to trust it:

```yaml
containers:
  - name: my-app
    image: my-app:latest
    volumeMounts:
      - name: ca-cert
        mountPath: /etc/ssl/custom
        readOnly: true
    env:
      - name: SSL_CERT_FILE
        value: /etc/ssl/custom/ca.crt
volumes:
  - name: ca-cert
    secret:
      secretName: custom-ca-bundle
```

## Managing Certificate Renewal

When a certificate is renewed, update the encrypted file:

```bash
# Decrypt, update, re-encrypt
sops infrastructure/tls/wildcard-cert.sops.yaml
# Editor opens with decrypted content
# Replace the certificate and key, save, close
```

Alternatively, create a fresh plaintext file and encrypt it:

```bash
# Create new plaintext manifest with updated certs
cat > /tmp/wildcard-cert.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: wildcard-tls
  namespace: istio-system
type: kubernetes.io/tls
stringData:
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    ... (new certificate) ...
    -----END CERTIFICATE-----
  tls.key: |
    -----BEGIN PRIVATE KEY-----
    ... (new private key) ...
    -----END PRIVATE KEY-----
EOF

sops --encrypt /tmp/wildcard-cert.yaml > infrastructure/tls/wildcard-cert.sops.yaml
rm /tmp/wildcard-cert.yaml
```

Commit and push. Flux will reconcile and update the secret in the cluster:

```bash
git add infrastructure/tls/wildcard-cert.sops.yaml
git commit -m "Renew wildcard TLS certificate, expires 2027-03-05"
git push
```

## Monitoring Certificate Expiration

Even with manual certificates, you should monitor expiration dates. Deploy a certificate monitoring tool via Flux:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: x509-certificate-exporter
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: x509-certificate-exporter
      sourceRef:
        kind: HelmRepository
        name: enix
        namespace: flux-system
  values:
    secretsExporter:
      includeNamespaces:
        - istio-system
        - default
```

This exports Prometheus metrics for certificate expiration, which you can alert on.

## Security Considerations

When storing TLS certificates in Git with SOPS:

- **Never commit unencrypted private keys.** Use a pre-commit hook to detect PEM private key blocks in unencrypted files.
- **Limit key access.** Only the Flux kustomize-controller and designated operators should have the SOPS decryption key.
- **Audit certificate changes.** Git history provides a complete audit trail of certificate rotations.
- **Use separate encryption keys** for TLS secrets if your security policy requires isolation from application secrets.

## Conclusion

Storing TLS certificates in Git with SOPS and Flux provides a fully auditable, version-controlled approach to certificate management. The private keys are encrypted at rest in your repository and decrypted only by the Flux kustomize-controller at reconciliation time. This approach works well for enterprise CA certificates, wildcard certificates, and mutual TLS configurations that cannot be automated with cert-manager.
