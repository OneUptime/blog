# How to Configure Git HTTP/HTTPS Proxy in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Networking

Description: Learn how to configure HTTP and HTTPS proxy settings for Git operations in ArgoCD when your cluster sits behind a corporate proxy or firewall.

---

In many enterprise environments, Kubernetes clusters do not have direct internet access. All outbound traffic must route through an HTTP or HTTPS proxy. This is standard corporate network architecture, but it creates a problem for ArgoCD because the repo server needs to reach external Git repositories to fetch application manifests.

Without proper proxy configuration, ArgoCD cannot clone or fetch from your Git repositories, and every sync operation fails with connection errors. This guide walks you through configuring HTTP and HTTPS proxy settings for Git operations in ArgoCD.

## Understanding the Network Path

When ArgoCD fetches from a Git repository over HTTPS, the traffic flows through several network hops:

```mermaid
flowchart LR
    A[ArgoCD Repo Server] --> B[Kubernetes Pod Network]
    B --> C[Corporate Proxy]
    C --> D[Internet]
    D --> E[Git Server - GitHub/GitLab]
```

The proxy sits between your cluster's pod network and the internet. ArgoCD's repo server needs to know about this proxy so it can route its Git HTTPS traffic through it.

## Configuring Proxy via Environment Variables

The most straightforward approach is setting standard proxy environment variables on the ArgoCD repo server deployment:

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
        # HTTP proxy for non-TLS traffic
        - name: HTTP_PROXY
          value: "http://proxy.corp.example.com:8080"
        # HTTPS proxy for TLS traffic (most Git operations)
        - name: HTTPS_PROXY
          value: "http://proxy.corp.example.com:8080"
        # Hosts that should bypass the proxy
        - name: NO_PROXY
          value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com,argocd-repo-server,argocd-application-controller,argocd-server"
```

The NO_PROXY variable is critical. It tells the Git client which addresses should bypass the proxy entirely. You should include:

- `kubernetes.default.svc` - The Kubernetes API server
- Your cluster's internal IP ranges (pod and service CIDRs)
- Internal DNS domains for self-hosted Git servers
- ArgoCD component service names to keep internal traffic direct

## Configuring Proxy via Helm Values

If you manage ArgoCD with Helm, set the proxy in your values file:

```yaml
# values.yaml
repoServer:
  env:
    - name: HTTP_PROXY
      value: "http://proxy.corp.example.com:8080"
    - name: HTTPS_PROXY
      value: "http://proxy.corp.example.com:8080"
    - name: NO_PROXY
      value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com"

# Also configure proxy for the application controller
# if it needs to reach external clusters
controller:
  env:
    - name: HTTP_PROXY
      value: "http://proxy.corp.example.com:8080"
    - name: HTTPS_PROXY
      value: "http://proxy.corp.example.com:8080"
    - name: NO_PROXY
      value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com"

# And the API server for webhook callbacks
server:
  env:
    - name: HTTP_PROXY
      value: "http://proxy.corp.example.com:8080"
    - name: HTTPS_PROXY
      value: "http://proxy.corp.example.com:8080"
    - name: NO_PROXY
      value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com"
```

Apply with:

```bash
helm upgrade argocd argo/argo-cd \
  -n argocd \
  -f values.yaml
```

## Configuring Proxy via Git Configuration

For more granular control over which repositories use a proxy, you can configure proxy settings in the Git configuration file directly:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-repo-server-gitconfig
  namespace: argocd
data:
  gitconfig: |
    [http "https://github.com"]
      proxy = http://proxy.corp.example.com:8080

    [http "https://gitlab.com"]
      proxy = http://proxy.corp.example.com:8080

    [http "https://git.internal.corp.com"]
      # No proxy for internal Git servers
      proxy = ""
```

Mount this ConfigMap in the repo server:

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
        - name: gitconfig
          mountPath: /home/argocd/.gitconfig
          subPath: gitconfig
      volumes:
      - name: gitconfig
        configMap:
          name: argocd-repo-server-gitconfig
```

This approach lets you route traffic to GitHub through the proxy while keeping traffic to your internal GitLab instance direct. It is more flexible than blanket environment variables.

## Handling Proxy Authentication

Many corporate proxies require authentication. You can include credentials directly in the proxy URL:

```yaml
env:
  - name: HTTPS_PROXY
    value: "http://username:password@proxy.corp.example.com:8080"
```

For better security, store the proxy credentials in a Kubernetes Secret and reference them:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: proxy-credentials
  namespace: argocd
type: Opaque
stringData:
  HTTPS_PROXY: "http://username:password@proxy.corp.example.com:8080"
  HTTP_PROXY: "http://username:password@proxy.corp.example.com:8080"
---
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
        env:
        - name: NO_PROXY
          value: "kubernetes.default.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

## Handling Proxy TLS Certificates

Corporate proxies often perform TLS inspection, which means they terminate and re-encrypt HTTPS traffic using their own CA certificate. ArgoCD's Git client will reject these connections unless it trusts the proxy's CA certificate.

To add custom CA certificates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  # Add your corporate CA certificate
  proxy.corp.example.com: |
    -----BEGIN CERTIFICATE-----
    MIIDkTCCAnmgAwIBAgIUB... (your CA cert)
    -----END CERTIFICATE-----
```

You can also mount the certificate bundle directly:

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
        # Point Git to the custom CA bundle
        - name: GIT_SSL_CAINFO
          value: /etc/ssl/certs/corporate-ca.pem
        volumeMounts:
        - name: corporate-ca
          mountPath: /etc/ssl/certs/corporate-ca.pem
          subPath: ca.pem
      volumes:
      - name: corporate-ca
        configMap:
          name: corporate-ca-cert
```

## Verifying Proxy Configuration

After configuring the proxy, verify that ArgoCD can reach your Git repositories:

```bash
# Check if the repo server has the proxy variables set
kubectl exec -n argocd deployment/argocd-repo-server -- env | grep -i proxy

# Test Git connectivity through the proxy from within the pod
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://github.com/argoproj/argocd-example-apps.git

# Check the repo server logs for proxy-related errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -i "proxy\|connect"

# Verify ArgoCD can list the repository
argocd repo list
```

## Common Proxy Issues and Fixes

**"proxyconnect tcp: tls: first record does not look like a TLS handshake"**

This happens when you use `https://` in the proxy URL but the proxy expects plain HTTP. Change HTTPS_PROXY to use `http://` instead (the proxy URL protocol is separate from the target URL protocol):

```yaml
# Correct - proxy itself uses HTTP even for proxying HTTPS traffic
HTTPS_PROXY: "http://proxy.corp.example.com:8080"

# Wrong - unless your proxy requires TLS connections to itself
HTTPS_PROXY: "https://proxy.corp.example.com:8080"
```

**"x509: certificate signed by unknown authority"**

The proxy is performing TLS inspection. Add the proxy's CA certificate as described in the TLS section above.

**"dial tcp: i/o timeout" for internal services**

Your NO_PROXY is missing entries for internal services. Add the relevant IP ranges and domain names. Make sure to include the Kubernetes service CIDR and pod CIDR.

**Git operations to internal repos also routing through proxy**

The NO_PROXY variable needs to include your internal Git server's hostname:

```yaml
NO_PROXY: "kubernetes.default.svc,10.0.0.0/8,.internal.corp.com,git.corp.example.com"
```

## Monitoring Proxy Health

Once the proxy is configured, monitor Git operation success rates to catch proxy-related issues:

```promql
# Track Git operation success rate
rate(argocd_git_request_total{grpc_code="OK"}[5m])
  / rate(argocd_git_request_total[5m])
```

A sudden drop in this metric often indicates proxy issues. Combine this with monitoring your proxy infrastructure to get end-to-end visibility into the connectivity chain.

Proxy configuration in ArgoCD is mostly about getting the environment variables and NO_PROXY list right. Once configured correctly, it works transparently and you should not need to touch it again unless your network topology changes.
