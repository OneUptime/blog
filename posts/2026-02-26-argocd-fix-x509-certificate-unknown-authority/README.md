# How to Fix x509 Certificate Signed by Unknown Authority in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TLS, Troubleshooting

Description: Step-by-step guide to diagnosing and fixing the x509 certificate signed by unknown authority error in ArgoCD for Git repos and API connections.

---

The "x509: certificate signed by unknown authority" error is one of the most common TLS issues in ArgoCD. It happens when ArgoCD tries to connect to a server whose certificate is signed by a CA that ArgoCD does not trust. This guide covers every scenario where this error occurs and how to fix each one.

## Understanding the Error

This error means ArgoCD is making an HTTPS connection to some server - typically a Git repository, Helm registry, or OIDC provider - and the server's TLS certificate was signed by a Certificate Authority that is not in ArgoCD's trusted certificate store.

Common scenarios include:

- Connecting to a self-hosted GitLab, GitHub Enterprise, or Bitbucket Server that uses a corporate CA
- Connecting to a Helm repository behind a corporate proxy with TLS inspection
- Connecting to an OIDC provider (like Keycloak) with a self-signed or internal certificate
- ArgoCD components communicating with each other using self-signed certificates

```mermaid
graph LR
    A[ArgoCD Repo Server] -->|HTTPS| B[Git Server]
    B -->|Certificate signed by| C[Corporate CA]
    A -->|Does not trust| C
    style C fill:#f96,stroke:#333
```

## Fix 1: Adding CA Certificates for Git Repositories

The most common case is connecting to a Git repository with a custom CA. ArgoCD stores trusted CA certificates in the `argocd-tls-certs-cm` ConfigMap.

First, get the server certificate or CA certificate from your Git server:

```bash
# Extract the certificate chain from the server

openssl s_client -connect git.example.com:443 -showcerts < /dev/null 2>/dev/null | \
  awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' > git-ca.crt

# Verify you have the right certificate
openssl x509 -in git-ca.crt -noout -subject -issuer
```

If the server uses a certificate chain, you need the certificate that signed the server certificate. That may be an intermediate CA from the chain, or the root CA from your administrator if the server does not send it:

```bash
# Extract all certificates in the chain
openssl s_client -connect git.example.com:443 -showcerts < /dev/null 2>/dev/null | \
  awk '/BEGIN CERTIFICATE/{n++; in_cert=1} in_cert{print > ("cert-" n ".pem")} /END CERTIFICATE/{in_cert=0}'

# Inspect each certificate and choose the issuing CA certificate
for cert in cert-*.pem; do openssl x509 -in "$cert" -noout -subject -issuer; done
```

Now add it to ArgoCD:

```bash
# Add the CA certificate to ArgoCD's trust store
kubectl create configmap argocd-tls-certs-cm \
  --from-file=git.example.com=git-ca.crt \
  -n argocd \
  --dry-run=client -o yaml | kubectl apply -f -
```

The key in the ConfigMap must be the hostname of the server. ArgoCD watches this ConfigMap and picks up changes automatically - no restart needed.

You can also add it via the ArgoCD CLI:

```bash
# Add certificate using the CLI
argocd cert add-tls git.example.com --from git-ca.crt
```

## Fix 2: Adding CA Certificates for Helm Repositories

For Helm repositories with custom CAs, the process is the same. The CA certificate goes into `argocd-tls-certs-cm`:

```bash
# Get the Helm repo CA certificate
openssl s_client -connect charts.example.com:443 -showcerts < /dev/null 2>/dev/null | \
  awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' > helm-ca.crt

# Add it to the ConfigMap
kubectl create configmap argocd-tls-certs-cm \
  --from-file=charts.example.com=helm-ca.crt \
  -n argocd \
  --dry-run=client -o yaml | kubectl apply -f -
```

If you already have certificates for other servers in the ConfigMap, make sure to include all of them:

```bash
# Get current ConfigMap data, add new cert, then apply
kubectl get configmap argocd-tls-certs-cm -n argocd -o yaml > tls-certs-cm.yaml
# Edit to add the new certificate data, then:
kubectl apply -f tls-certs-cm.yaml
```

## Fix 3: Adding CA Certificates for OIDC/SSO Providers

If the error occurs during SSO login and ArgoCD is configured directly with `oidc.config`, add the OIDC provider's CA certificate to `argocd-cm` as `rootCA`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  oidc.config: |
    name: Keycloak
    issuer: https://keycloak.example.com/realms/argocd
    clientID: argocd
    clientSecret: $oidc.keycloak.clientSecret
    rootCA: |
      -----BEGIN CERTIFICATE-----
      ... encoded certificate data here ...
      -----END CERTIFICATE-----
```

If you use a Dex connector in `dex.config`, mount the CA into the Dex container and reference the mounted file from the connector configuration:

```yaml
data:
  dex.config: |
    connectors:
      - type: oidc
        id: keycloak
        name: Keycloak
        config:
          issuer: https://keycloak.example.com/realms/argocd
          clientID: argocd
          clientSecret: $oidc.keycloak.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          rootCAs:
            - /etc/ssl/certs/keycloak-ca.crt
```

## Fix 4: System-Wide CA Certificate Bundle

If you have multiple services with custom CAs, you can replace the entire CA certificate bundle in ArgoCD containers. This is done by mounting a custom CA bundle:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      volumes:
        - name: custom-ca-bundle
          configMap:
            name: custom-ca-bundle
      containers:
        - name: argocd-repo-server
          env:
            - name: SSL_CERT_FILE
              value: /etc/ssl/custom-certs/ca-certificates.crt
          volumeMounts:
            - name: custom-ca-bundle
              mountPath: /etc/ssl/custom-certs
```

Create the ConfigMap with your full CA bundle:

```bash
# Combine system CAs with your custom CAs
cat /etc/ssl/certs/ca-certificates.crt custom-ca.crt > combined-ca-bundle.crt

kubectl create configmap custom-ca-bundle \
  --from-file=ca-certificates.crt=combined-ca-bundle.crt \
  -n argocd
```

## Fix 5: Internal Component Communication

If the error occurs between ArgoCD components (API server to repo server, for example), the issue is with the internal TLS certificates:

```bash
# Check the repo server's TLS certificate
kubectl get secret argocd-repo-server-tls -n argocd -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -subject -issuer -dates

# If strict TLS is enabled and the certificate is expired or invalid, replace it
kubectl create secret generic argocd-repo-server-tls \
  --from-file=tls.crt=/path/to/tls.crt \
  --from-file=tls.key=/path/to/tls.key \
  --from-file=ca.crt=/path/to/ca.crt \
  -n argocd \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment argocd-repo-server -n argocd
```

## The Nuclear Option: Skip TLS Verification

For development environments only, you can skip TLS verification. Never do this in production:

```bash
# Add a repository with TLS verification disabled
argocd repo add https://git.example.com/org/repo.git \
  --insecure-skip-server-verification \
  --username admin \
  --password secret
```

Or in the repository secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://git.example.com/org/repo.git
  insecure: "true"  # Skips TLS verification - NOT for production
```

## Debugging Steps

When you encounter this error, follow this systematic debugging approach:

```bash
# 1. Identify which connection is failing
kubectl logs deployment/argocd-repo-server -n argocd | grep x509

# 2. Get the server's certificate chain
openssl s_client -connect git.example.com:443 -showcerts < /dev/null

# 3. Check what CAs ArgoCD currently trusts
kubectl get configmap argocd-tls-certs-cm -n argocd -o yaml

# 4. Verify the CA certificate matches
openssl verify -CAfile your-ca.crt server-cert.crt
```

## Conclusion

The x509 unknown authority error always comes down to one thing: ArgoCD does not trust the CA that signed the server's certificate. The fix is always to add the correct CA certificate to ArgoCD's trust store. Use the `argocd-tls-certs-cm` ConfigMap for Git and Helm repositories, `rootCA` or Dex connector CA settings for OIDC providers, and environment variables for system-wide trust. Avoid skipping TLS verification in production - it defeats the entire purpose of certificate-based security.

For more TLS configuration options, see our guide on [configuring ArgoCD with external certificate managers](https://oneuptime.com/blog/post/2026-02-26-argocd-external-certificate-managers/view).
