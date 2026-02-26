# How to Configure Git Proxy Settings in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Proxy, Networking

Description: Learn how to configure ArgoCD to access Git repositories through corporate proxies, including HTTPS proxies, SOCKS proxies, and no-proxy exclusions.

---

In many enterprise environments, outbound internet access from Kubernetes clusters goes through a corporate proxy. If your ArgoCD installation needs to reach external Git repositories like GitHub.com or GitLab.com, you need to configure proxy settings on the ArgoCD repo-server. This guide covers HTTP proxies, SOCKS proxies, proxy authentication, and the common pitfalls that cause failures.

## Understanding Which ArgoCD Components Need Proxy Settings

ArgoCD has several components, but not all of them need proxy configuration:

```mermaid
flowchart LR
    A[argocd-repo-server] -->|Needs proxy| B[External Git repos]
    C[argocd-server] -->|Needs proxy| D[External Dex/OIDC providers]
    E[argocd-application-controller] -->|Usually no proxy| F[Internal K8s API]
    A -->|No proxy needed| G[Internal Git repos]
```

The **repo-server** is the primary component that clones Git repositories, so it needs proxy settings for any external repositories. The **argocd-server** may need proxy settings if it communicates with external SSO providers. The **application-controller** talks to the Kubernetes API, which is usually internal and should not go through a proxy.

## Configuring HTTP/HTTPS Proxy

The standard approach is to set environment variables on the ArgoCD components:

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
              value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.company.com,.svc,.local"
```

Apply with a strategic merge patch:

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
          value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.company.com,.svc,.local"
'
```

## Understanding NO_PROXY

The `NO_PROXY` variable is critical. Without it, internal traffic (like Kubernetes API calls or connections to internal Git servers) would be routed through the proxy and fail.

Common entries for `NO_PROXY`:

```bash
# Kubernetes service DNS
kubernetes.default.svc

# Kubernetes pod and service CIDR ranges
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16

# Internal domains
.company.com
.internal

# Kubernetes internal suffixes
.svc
.local
.cluster.local

# Localhost
localhost
127.0.0.1
```

A comprehensive example:

```yaml
env:
  - name: NO_PROXY
    value: >-
      kubernetes.default.svc,
      kubernetes.default.svc.cluster.local,
      10.0.0.0/8,
      172.16.0.0/12,
      192.168.0.0/16,
      .company.com,
      .svc,
      .local,
      .cluster.local,
      localhost,
      127.0.0.1,
      argocd-repo-server,
      argocd-server,
      argocd-redis,
      argocd-dex-server,
      argocd-applicationset-controller
```

## Proxy with Authentication

If your corporate proxy requires authentication:

```yaml
env:
  - name: HTTP_PROXY
    value: "http://proxy-user:proxy-password@proxy.company.com:8080"
  - name: HTTPS_PROXY
    value: "http://proxy-user:proxy-password@proxy.company.com:8080"
```

For better security, store the proxy credentials in a Secret:

```yaml
# proxy-creds-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: proxy-credentials
  namespace: argocd
stringData:
  HTTP_PROXY: "http://proxy-user:password@proxy.company.com:8080"
  HTTPS_PROXY: "http://proxy-user:password@proxy.company.com:8080"
  NO_PROXY: "kubernetes.default.svc,10.0.0.0/8,.company.com,.svc,.local"
---
# Reference from the deployment
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
          envFrom:
            - secretRef:
                name: proxy-credentials
```

## SOCKS Proxy Configuration

Some organizations use SOCKS proxies. Git supports SOCKS5 proxies natively:

```yaml
env:
  - name: ALL_PROXY
    value: "socks5://socks-proxy.company.com:1080"
  - name: NO_PROXY
    value: "kubernetes.default.svc,10.0.0.0/8,.company.com,.svc,.local"
```

For SSH Git operations through a SOCKS proxy, you need to configure the SSH client:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-config
  namespace: argocd
data:
  ssh_config: |
    Host github.com
      ProxyCommand nc -X 5 -x socks-proxy.company.com:1080 %h %p
      IdentityFile /app/config/ssh/ssh_known_hosts
```

Mount this as the SSH config in the repo-server.

## Git-Specific Proxy Settings

In addition to environment variables, you can configure proxy settings directly in Git's configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-git-config
  namespace: argocd
data:
  .gitconfig: |
    [http]
        proxy = http://proxy.company.com:8080
    [https]
        proxy = http://proxy.company.com:8080
    [http "https://internal-gitlab.company.com"]
        proxy = ""
```

Mount this in the repo-server:

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
          volumeMounts:
            - name: git-config
              mountPath: /home/argocd/.gitconfig
              subPath: .gitconfig
      volumes:
        - name: git-config
          configMap:
            name: argocd-git-config
```

This approach is useful when you need different proxy settings for different Git hosts.

## Proxy for the ArgoCD Server

If your ArgoCD server needs to reach external OIDC/SSO providers through a proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          env:
            - name: HTTP_PROXY
              value: "http://proxy.company.com:8080"
            - name: HTTPS_PROXY
              value: "http://proxy.company.com:8080"
            - name: NO_PROXY
              value: "kubernetes.default.svc,10.0.0.0/8,.company.com,.svc,.local,argocd-repo-server,argocd-redis,argocd-dex-server"
```

## Handling Proxy CA Certificates

Corporate proxies that perform TLS inspection (man-in-the-middle SSL) require you to trust the proxy's CA certificate. Add it to ArgoCD's trusted certificates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  # Add proxy CA cert for all external HTTPS connections
  github.com: |
    -----BEGIN CERTIFICATE-----
    (proxy CA certificate)
    -----END CERTIFICATE-----
  gitlab.com: |
    -----BEGIN CERTIFICATE-----
    (proxy CA certificate)
    -----END CERTIFICATE-----
```

Alternatively, mount a custom CA bundle:

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
            - name: GIT_SSL_CAINFO
              value: "/etc/ssl/custom/ca-bundle.crt"
          volumeMounts:
            - name: custom-ca
              mountPath: /etc/ssl/custom
      volumes:
        - name: custom-ca
          configMap:
            name: custom-ca-bundle
```

## Verifying Proxy Configuration

After applying proxy settings, verify they work:

```bash
# Check environment variables are set
kubectl exec -n argocd deployment/argocd-repo-server -- env | grep -i proxy

# Test connectivity through the proxy
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v https://github.com 2>&1 | head -20

# Test Git clone through the proxy
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://github.com/argoproj/argocd-example-apps.git

# Check ArgoCD repo status
argocd repo list
```

## Troubleshooting

### "Could not resolve proxy" Error

The proxy hostname cannot be resolved from inside the pod. Verify DNS resolution:

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- nslookup proxy.company.com
```

### "Proxy Authentication Required" (407)

Your proxy requires credentials but they are not configured or are incorrect:

```bash
# Test with explicit credentials
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -x http://user:pass@proxy.company.com:8080 https://github.com
```

### Internal Repos Failing Through Proxy

Your `NO_PROXY` setting is missing internal domains:

```bash
# Verify NO_PROXY includes all internal hosts
kubectl exec -n argocd deployment/argocd-repo-server -- echo $NO_PROXY
```

### SSL Errors Through Proxy

The proxy is doing TLS inspection and its CA is not trusted:

```bash
# Test with verbose SSL output
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v https://github.com 2>&1 | grep -i "ssl\|cert\|verify"
```

Proxy configuration is one of those things that is annoying to set up but essential in enterprise environments. Get it right once, document it, and you will not have to think about it again until the proxy infrastructure changes.
