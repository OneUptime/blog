# How to Add a Helm Repository Behind a Corporate Proxy in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Proxy

Description: Learn how to configure ArgoCD to access Helm chart repositories through corporate HTTP and HTTPS proxies, including proxy authentication and TLS inspection handling.

---

Enterprise environments often route all outbound traffic through corporate proxies. If ArgoCD runs in such an environment and needs to pull Helm charts from external repositories, you need to configure proxy settings specifically for Helm repository access. This guide covers the complete setup, including proxies that perform TLS inspection.

## Understanding the Challenge

When ArgoCD fetches a Helm chart, the repo-server makes HTTP/HTTPS requests to download the repository index and chart archives. In a proxied environment, these requests must go through the corporate proxy:

```mermaid
sequenceDiagram
    participant RS as ArgoCD Repo Server
    participant Proxy as Corporate Proxy
    participant Helm as Helm Repository

    RS->>Proxy: HTTPS request for index.yaml
    Proxy->>Helm: Forwarded request
    Helm-->>Proxy: index.yaml response
    Proxy-->>RS: Proxied response
    RS->>Proxy: HTTPS request for chart.tgz
    Proxy->>Helm: Forwarded request
    Helm-->>Proxy: Chart archive
    Proxy-->>RS: Proxied chart archive
```

## Step 1: Configure Proxy Environment Variables

The ArgoCD repo-server needs proxy environment variables to route Helm requests through the corporate proxy:

```yaml
# argocd-repo-server-proxy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            - name: HTTP_PROXY
              value: "http://proxy.company.com:8080"
            - name: HTTPS_PROXY
              value: "http://proxy.company.com:8080"
            - name: NO_PROXY
              value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,.company.com,.svc,.local,argocd-redis,argocd-repo-server,argocd-server,argocd-dex-server"
```

Apply the patch:

```bash
kubectl patch deployment argocd-repo-server -n argocd --type strategic -p '
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        env:
        - name: HTTP_PROXY
          value: "http://proxy.company.com:8080"
        - name: HTTPS_PROXY
          value: "http://proxy.company.com:8080"
        - name: NO_PROXY
          value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,.company.com,.svc,.local,argocd-redis,argocd-repo-server,argocd-server,argocd-dex-server"
'
```

## Step 2: Configure NO_PROXY Correctly

The `NO_PROXY` variable is critical. Internal Helm repositories hosted within your corporate network should bypass the proxy:

```yaml
env:
  - name: NO_PROXY
    value: >-
      kubernetes.default.svc,
      10.0.0.0/8,
      172.16.0.0/12,
      192.168.0.0/16,
      .company.com,
      .svc,
      .local,
      .cluster.local,
      localhost,
      127.0.0.1,
      argocd-redis,
      argocd-repo-server,
      argocd-server,
      argocd-dex-server,
      charts.internal.company.com,
      artifactory.company.com
```

This ensures that requests to internal Helm repositories go direct, while requests to external repos like `https://charts.bitnami.com` go through the proxy.

## Step 3: Handle Proxy Authentication

If the proxy requires username and password:

```yaml
# Option 1: Inline in the URL (simple but credentials in plain text)
env:
  - name: HTTPS_PROXY
    value: "http://proxy-user:proxy-pass@proxy.company.com:8080"

# Option 2: Reference from a Secret (more secure)
env:
  - name: HTTPS_PROXY
    valueFrom:
      secretKeyRef:
        name: proxy-credentials
        key: HTTPS_PROXY
```

Create the proxy credentials secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: proxy-credentials
  namespace: argocd
stringData:
  HTTP_PROXY: "http://proxy-user:proxy-pass@proxy.company.com:8080"
  HTTPS_PROXY: "http://proxy-user:proxy-pass@proxy.company.com:8080"
  NO_PROXY: "kubernetes.default.svc,10.0.0.0/8,.company.com,.svc,.local"
```

## Step 4: Handle TLS Inspection

Many corporate proxies perform TLS inspection (also called SSL interception or man-in-the-middle), where the proxy decrypts and re-encrypts HTTPS traffic. This means the proxy presents its own CA certificate, which ArgoCD will not trust by default.

### Add Proxy CA Certificate

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  # Add proxy CA cert for each external host accessed through the proxy
  charts.bitnami.com: |
    -----BEGIN CERTIFICATE-----
    (proxy CA certificate)
    -----END CERTIFICATE-----
  prometheus-community.github.io: |
    -----BEGIN CERTIFICATE-----
    (proxy CA certificate - same cert for all proxied hosts)
    -----END CERTIFICATE-----
  grafana.github.io: |
    -----BEGIN CERTIFICATE-----
    (proxy CA certificate)
    -----END CERTIFICATE-----
```

### Mount Custom CA Bundle

A more scalable approach is mounting a complete CA bundle:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            - name: HTTP_PROXY
              value: "http://proxy.company.com:8080"
            - name: HTTPS_PROXY
              value: "http://proxy.company.com:8080"
            - name: NO_PROXY
              value: "kubernetes.default.svc,10.0.0.0/8,.company.com,.svc,.local"
            # Point to custom CA bundle for Helm operations
            - name: HELM_TLS_CA_FILE
              value: "/etc/ssl/custom/ca-bundle.crt"
          volumeMounts:
            - name: custom-ca
              mountPath: /etc/ssl/custom
              readOnly: true
      volumes:
        - name: custom-ca
          configMap:
            name: custom-ca-bundle
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-ca-bundle
  namespace: argocd
data:
  ca-bundle.crt: |
    # Corporate Proxy CA
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUK...
    -----END CERTIFICATE-----
    # Any additional CA certs
    -----BEGIN CERTIFICATE-----
    MIIDrzCCApegAwIBAgIQC...
    -----END CERTIFICATE-----
```

## Step 5: Add the Helm Repository

Now add the external Helm repository. The proxy handles the actual connection:

```yaml
# external-helm-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitnami-charts
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: bitnami
  url: https://charts.bitnami.com/bitnami
```

```bash
kubectl apply -f external-helm-repo.yaml
```

## Step 6: Deploy a Chart Through the Proxy

Test the setup by deploying a chart:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: redis
    targetRevision: 18.12.1
    helm:
      releaseName: redis
      values: |
        architecture: standalone
        auth:
          enabled: true
        master:
          persistence:
            size: 8Gi
  destination:
    server: https://kubernetes.default.svc
    namespace: redis
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Mixed Environment: Internal and External Repos

Most enterprises have both internal repos (no proxy needed) and external repos (proxy needed). The `NO_PROXY` variable handles this:

```yaml
# Internal repos bypass the proxy
env:
  - name: NO_PROXY
    value: "charts.internal.company.com,artifactory.company.com,10.0.0.0/8,.company.com,.svc"
```

Then register both types:

```yaml
# Internal repo (bypasses proxy)
apiVersion: v1
kind: Secret
metadata:
  name: internal-charts
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: internal
  url: https://charts.internal.company.com
  username: reader
  password: token
---
# External repo (goes through proxy)
apiVersion: v1
kind: Secret
metadata:
  name: external-bitnami
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: bitnami
  url: https://charts.bitnami.com/bitnami
```

## Verifying Proxy Configuration

```bash
# Check proxy env vars are set
kubectl exec -n argocd deployment/argocd-repo-server -- env | grep -i proxy

# Test connectivity through the proxy
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v https://charts.bitnami.com/bitnami/index.yaml 2>&1 | head -30

# Check if the Helm repo is accessible
argocd repo list

# Check repo-server logs for proxy-related errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=50 | grep -i "proxy\|tls\|cert"
```

## Troubleshooting

### "x509: certificate signed by unknown authority"

The proxy's CA certificate is not trusted. Add it to `argocd-tls-certs-cm` or mount a custom CA bundle.

### "Proxy Authentication Required" (407)

The proxy requires credentials that are not configured or are incorrect:

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v -x http://user:pass@proxy.company.com:8080 https://charts.bitnami.com 2>&1 | head -30
```

### Timeout Errors

Large Helm repository indexes can be slow through a proxy. Increase timeouts:

```yaml
env:
  - name: ARGOCD_EXEC_TIMEOUT
    value: "300s"
```

### Internal Repos Failing

Check that internal URLs are in `NO_PROXY`. A common mistake is forgetting to include the internal Helm repository hostname.

For more on configuring Git proxy settings in ArgoCD, see the [Git proxy settings guide](https://oneuptime.com/blog/post/2026-02-26-argocd-git-proxy-settings/view).
