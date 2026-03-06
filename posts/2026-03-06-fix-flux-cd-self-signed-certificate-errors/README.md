# How to Fix Flux CD Self-Signed Certificate Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, tls, self-signed certificate, ca bundle, gitops, kubernetes, troubleshooting, cert-manager

Description: A step-by-step guide to resolving TLS certificate verification errors in Flux CD when working with self-signed certificates, private CAs, and TLS-intercepting proxies.

---

When Flux CD connects to Git repositories, Helm repositories, or container registries that use self-signed certificates or private certificate authorities, TLS verification fails with certificate errors. This guide covers how to configure Flux to trust your custom certificates.

## Understanding the Problem

Flux CD controllers verify TLS certificates by default. If your internal services use certificates signed by a private CA or self-signed certificates, the controllers will reject connections because the CA is not in their trust store.

Common error messages:

```
x509: certificate signed by unknown authority
x509: certificate has expired or is not yet valid
tls: failed to verify certificate: x509: certificate signed by unknown authority
```

## Step 1: Identify Which Resource Has the TLS Error

```bash
# Check all sources for certificate errors
flux get sources all

# Check GitRepository status
kubectl get gitrepositories -A -o wide

# Check HelmRepository status
kubectl get helmrepositories -A -o wide

# Look for x509 errors in controller logs
kubectl logs -n flux-system deployment/source-controller | grep -i "x509\|certificate\|tls"
```

## Step 2: Obtain Your CA Certificate

Before configuring Flux, you need the CA certificate that signed the server's certificate.

```bash
# Extract the CA certificate from a running server
openssl s_client -showcerts -connect gitlab.mycompany.com:443 </dev/null 2>/dev/null | \
  openssl x509 -outform PEM > ca-cert.pem

# View the certificate details
openssl x509 -in ca-cert.pem -text -noout

# If there is a certificate chain, extract all certificates
openssl s_client -showcerts -connect gitlab.mycompany.com:443 </dev/null 2>/dev/null | \
  awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{ print }' > ca-chain.pem
```

## Step 3: Configure GitRepository with Custom CA

Flux CD supports custom CA certificates directly on source resources via a secret reference.

```yaml
# Create a secret with the CA certificate
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-ca-cert
  namespace: flux-system
type: Opaque
stringData:
  # The key MUST be "ca.crt" or "caFile"
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIFazCCA1OgAwIBAgIUEX9wSBhIQKpOqhzMBolMuas3VGMwDQYJKoZIhvcNAQEL
    BQAwRTELMAkGA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
    ... (your CA certificate content) ...
    -----END CERTIFICATE-----
```

```bash
# Create the secret from a file
kubectl create secret generic gitlab-ca-cert \
  --namespace=flux-system \
  --from-file=ca.crt=./ca-cert.pem
```

Reference the CA certificate in the GitRepository:

```yaml
# GitRepository with custom CA certificate
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://gitlab.mycompany.com/myorg/fleet-infra.git
  ref:
    branch: main
  secretRef:
    # Authentication secret (username/password or token)
    name: git-credentials
  certSecretRef:
    # Secret containing the CA certificate
    name: gitlab-ca-cert
```

## Step 4: Configure HelmRepository with Custom CA

```yaml
# HelmRepository with custom CA
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.mycompany.com
  certSecretRef:
    # Secret containing the CA certificate
    name: helm-ca-cert
  secretRef:
    # Optional: authentication credentials
    name: helm-credentials
```

Create the CA secret:

```bash
kubectl create secret generic helm-ca-cert \
  --namespace=flux-system \
  --from-file=ca.crt=./ca-cert.pem
```

## Step 5: Configure OCIRepository with Custom CA

For OCI-based repositories (Helm charts stored in container registries):

```yaml
# OCIRepository with custom CA
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: internal-oci
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.mycompany.com/charts
  certSecretRef:
    name: registry-ca-cert
```

## Step 6: Configure Global CA Trust for All Controllers

If multiple resources need the same CA certificate, configure it globally on the controllers instead of per-resource.

### Method 1: Mount CA Certificate as a Volume

```yaml
# ca-volume-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          volumeMounts:
            # Mount the CA certificate into the trust store
            - name: custom-ca
              mountPath: /etc/ssl/certs/custom-ca.crt
              subPath: ca.crt
              readOnly: true
      volumes:
        - name: custom-ca
          secret:
            secretName: custom-ca-cert
```

Apply via Kustomize:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: ca-volume-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: source-controller
  - path: ca-volume-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: helm-controller
  - path: ca-volume-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: image-reflector-controller
```

### Method 2: Use SSL_CERT_FILE Environment Variable

```yaml
# ssl-env-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            # Point to the custom CA bundle
            - name: SSL_CERT_FILE
              value: /etc/ssl/certs/custom-ca-bundle.crt
          volumeMounts:
            - name: ca-bundle
              mountPath: /etc/ssl/certs/custom-ca-bundle.crt
              subPath: ca-bundle.crt
              readOnly: true
      volumes:
        - name: ca-bundle
          configMap:
            name: custom-ca-bundle
```

Create a ConfigMap with the full CA bundle:

```bash
# Combine system CAs with your custom CA
cat /etc/ssl/certs/ca-certificates.crt ca-cert.pem > ca-bundle.crt

# Create the ConfigMap
kubectl create configmap custom-ca-bundle \
  --namespace=flux-system \
  --from-file=ca-bundle.crt=./ca-bundle.crt
```

## Step 7: Handle TLS-Intercepting Proxies

Corporate proxies that perform TLS inspection (MITM) present their own certificate for all HTTPS connections. You need to trust the proxy's CA certificate.

```bash
# Extract the proxy's CA certificate
openssl s_client -showcerts -proxy proxy.example.com:8080 \
  -connect github.com:443 </dev/null 2>/dev/null | \
  openssl x509 -outform PEM > proxy-ca.pem

# Create a secret with the proxy CA
kubectl create secret generic proxy-ca-cert \
  --namespace=flux-system \
  --from-file=ca.crt=./proxy-ca.pem
```

Then configure both proxy environment variables and the CA certificate:

```yaml
# Combined proxy and CA patch
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.example.com:8080"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8"
          volumeMounts:
            - name: proxy-ca
              mountPath: /etc/ssl/certs/proxy-ca.crt
              subPath: ca.crt
              readOnly: true
      volumes:
        - name: proxy-ca
          secret:
            secretName: proxy-ca-cert
```

## Step 8: Configure Bootstrap with Custom CA

When bootstrapping Flux in an environment with self-signed certificates:

```bash
# Bootstrap with a custom CA file
flux bootstrap git \
  --url=https://gitlab.mycompany.com/myorg/fleet-infra.git \
  --branch=main \
  --path=clusters/production \
  --ca-file=./ca-cert.pem \
  --token-auth

# The --ca-file flag tells Flux to trust this CA during bootstrap
# and stores it in the Git secret
```

## Step 9: Use cert-manager for Automated Certificate Management

If you use cert-manager, you can automate CA trust distribution:

```yaml
# ClusterIssuer for internal CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-key-pair
---
# Certificate for your internal Git server
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: gitlab-tls
  namespace: gitlab
spec:
  secretName: gitlab-tls-cert
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  dnsNames:
    - gitlab.mycompany.com
```

Export the CA certificate from cert-manager:

```bash
# Extract the CA cert from cert-manager's secret
kubectl get secret internal-ca-key-pair -n cert-manager \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > internal-ca.crt

# Create a Flux-compatible secret
kubectl create secret generic internal-ca-cert \
  --namespace=flux-system \
  --from-file=ca.crt=./internal-ca.crt
```

## Step 10: Verify Certificate Configuration

After configuring the CA certificate, verify that Flux can connect.

```bash
# Force reconciliation
flux reconcile source git flux-system

# Check the source status
kubectl get gitrepositories -n flux-system

# Verify from a debug pod
kubectl run -n flux-system tls-test --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl --cacert /dev/stdin -s -o /dev/null -w "%{http_code}" \
  https://gitlab.mycompany.com < <(kubectl get secret gitlab-ca-cert -n flux-system -o jsonpath='{.data.ca\.crt}' | base64 -d)
```

## Step 11: Full Debugging Checklist

```bash
# 1. Identify the exact TLS error
kubectl logs -n flux-system deployment/source-controller | grep -i "x509\|tls\|cert"

# 2. Extract server certificate for inspection
openssl s_client -showcerts -connect gitlab.mycompany.com:443 </dev/null 2>/dev/null | \
  openssl x509 -text -noout | grep -A2 "Issuer"

# 3. Verify the CA secret exists and has content
kubectl get secret gitlab-ca-cert -n flux-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | head -5

# 4. Verify certSecretRef is set on the source
kubectl get gitrepository my-repo -n flux-system \
  -o jsonpath='{.spec.certSecretRef}'

# 5. Check certificate expiry
kubectl get secret gitlab-ca-cert -n flux-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -noout -dates

# 6. Force reconciliation
flux reconcile source git flux-system

# 7. Check source-controller logs after reconciliation
kubectl logs -n flux-system deployment/source-controller --tail=20
```

## Summary

Fixing Flux CD self-signed certificate errors involves:

- **Creating a secret with the CA certificate** and referencing it via `certSecretRef` on source resources
- **Using volume mounts** for global CA trust across all controllers
- **Extracting proxy CA certificates** when behind TLS-intercepting proxies
- **Using --ca-file** during bootstrap for initial setup
- **Keeping CA certificates updated** especially when they are rotated

The key insight is that each Flux source resource (GitRepository, HelmRepository, OCIRepository) supports `certSecretRef` for per-resource CA configuration, while global trust requires volume mounts on the controller deployments.
