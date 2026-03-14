# How to Fix x509 certificate signed by unknown authority Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, TLS, Certificates, X509

Description: Learn how to diagnose and fix the 'x509 certificate signed by unknown authority' error in Flux when connecting to services with custom or self-signed certificates.

---

When Flux controllers connect to Git repositories, Helm registries, or OCI endpoints that use self-signed or enterprise CA certificates, you will see:

```text
source-controller: failed to checkout and determine revision: unable to clone 'https://git.internal.example.com/my-org/my-repo.git': x509: certificate signed by unknown authority
```

or:

```text
helm-controller: failed to download chart: Get "https://charts.internal.example.com/my-chart-1.0.0.tgz": x509: certificate signed by unknown authority
```

This error means the TLS certificate presented by the remote server was signed by a Certificate Authority (CA) that the Flux controller does not trust.

## Root Causes

### 1. Self-Signed Certificates

Internal services using self-signed TLS certificates will not be trusted by default because the signing CA is not in the controller's trust store.

### 2. Enterprise/Private CA

Organizations using an internal PKI with a private root CA need to make that CA certificate available to Flux controllers.

### 3. TLS Intercepting Proxy

Corporate proxies that perform TLS inspection replace the original certificate with one signed by the proxy's CA, which Flux does not trust.

### 4. Expired or Renewed CA Certificate

A previously trusted CA certificate may have been renewed or rotated, and the new CA is not yet distributed to the cluster.

## Diagnostic Steps

### Step 1: Identify the Failing Source

```bash
flux get sources git -A
flux get sources helm -A
```

### Step 2: Inspect the Server Certificate

```bash
kubectl run -it --rm debug --image=alpine --restart=Never -n flux-system -- \
  sh -c "apk add openssl && echo | openssl s_client -connect git.internal.example.com:443 -servername git.internal.example.com 2>/dev/null | openssl x509 -noout -issuer -subject -dates"
```

### Step 3: Check If a CA Bundle Is Configured

```bash
kubectl get gitrepository my-repo -n flux-system -o jsonpath='{.spec.certSecretRef}'
```

If empty, no custom CA is configured.

### Step 4: Verify the CA Certificate

Download the CA certificate and verify it matches:

```bash
openssl verify -CAfile ca.crt server.crt
```

## How to Fix

### Fix 1: Add the CA Certificate to the Source Resource

Create a secret containing the CA certificate:

```bash
kubectl create secret generic internal-ca-cert \
  --namespace=flux-system \
  --from-file=ca.crt=/path/to/ca-certificate.pem
```

Reference it in your GitRepository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.example.com/my-org/my-repo.git
  certSecretRef:
    name: internal-ca-cert
  secretRef:
    name: git-credentials
```

For HelmRepository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.internal.example.com
  certSecretRef:
    name: internal-ca-cert
```

### Fix 2: Add CA to the Controller Trust Store

For controllers that do not support `certSecretRef`, mount the CA certificate into the controller pod:

```yaml
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
            - name: ca-certs
              mountPath: /etc/ssl/certs/internal-ca.pem
              subPath: ca.crt
              readOnly: true
      volumes:
        - name: ca-certs
          secret:
            secretName: internal-ca-cert
```

### Fix 3: Use the Flux CLI to Bootstrap with Custom CA

When bootstrapping Flux, specify the CA file:

```bash
flux bootstrap git \
  --url=https://git.internal.example.com/my-org/fleet-infra.git \
  --branch=main \
  --path=clusters/my-cluster \
  --ca-file=/path/to/ca-certificate.pem
```

### Fix 4: Force Reconciliation

```bash
flux reconcile source git my-repo
```

## Prevention

Maintain a central secret containing your organization's CA certificates and reference it from all Flux source resources. Include CA certificate deployment in your cluster bootstrapping process. Set up monitoring to detect certificate expiration before it causes failures.
