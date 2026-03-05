# How to Set Up GitRepository Proxy Configuration in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Proxy, GitRepository, Network Configuration

Description: Learn how to configure Flux CD GitRepository resources to clone repositories through an HTTP or HTTPS proxy server.

---

In many enterprise environments, cluster nodes do not have direct internet access. All outbound traffic must pass through a corporate proxy server. This guide explains how to configure Flux GitRepository resources to use a proxy when cloning Git repositories, using the `spec.proxySecretRef` field.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- The Flux CLI (`flux`) installed locally
- Details of your proxy server (address, port, and credentials if required)
- `kubectl` access to your cluster

## Understanding Proxy Support in Flux

The Flux source controller supports HTTP and HTTPS proxies for GitRepository resources that use HTTPS URLs. When you configure `spec.proxySecretRef`, the source controller reads the proxy settings from a Kubernetes Secret and routes all Git operations through the specified proxy.

This is particularly useful in environments where:

- Cluster nodes sit behind a corporate firewall
- Egress traffic must be routed through an inspection proxy
- Network policies restrict direct outbound connections

## Step 1: Create a Secret with Proxy Configuration

The proxy Secret must contain an `address` key with the full proxy URL. If your proxy requires authentication, include the credentials in the URL.

```yaml
# proxy-secret.yaml
# Secret containing the proxy server address for Git operations
apiVersion: v1
kind: Secret
metadata:
  name: git-proxy
  namespace: flux-system
type: Opaque
stringData:
  # Proxy address without authentication
  address: http://proxy.corporate.example.com:8080
```

For proxies that require authentication, embed the username and password in the URL.

```yaml
# proxy-secret-with-auth.yaml
# Secret with authenticated proxy configuration
apiVersion: v1
kind: Secret
metadata:
  name: git-proxy
  namespace: flux-system
type: Opaque
stringData:
  # Proxy address with embedded credentials
  address: http://proxy-user:proxy-password@proxy.corporate.example.com:8080
```

Apply the secret to your cluster.

```bash
# Apply the proxy secret
kubectl apply -f proxy-secret.yaml
```

## Step 2: Configure the GitRepository with Proxy

Reference the proxy secret in your GitRepository resource using `spec.proxySecretRef`.

```yaml
# gitrepository-with-proxy.yaml
# GitRepository configured to use a corporate proxy for cloning
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  # Route Git clone operations through the proxy
  proxySecretRef:
    name: git-proxy
```

```bash
# Apply the GitRepository resource
kubectl apply -f gitrepository-with-proxy.yaml
```

## Step 3: Combining Proxy with Repository Authentication

If your Git repository also requires authentication, you can use both `spec.secretRef` (for Git credentials) and `spec.proxySecretRef` (for proxy settings) together.

```yaml
# gitrepository-proxy-and-auth.yaml
# GitRepository using both proxy and Git authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-private-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-private-app.git
  ref:
    branch: main
  # Git repository credentials
  secretRef:
    name: git-credentials
  # Proxy configuration
  proxySecretRef:
    name: git-proxy
---
# Git credentials secret
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <your-personal-access-token>
---
# Proxy secret
apiVersion: v1
kind: Secret
metadata:
  name: git-proxy
  namespace: flux-system
type: Opaque
stringData:
  address: http://proxy.corporate.example.com:8080
```

```bash
# Apply all resources
kubectl apply -f gitrepository-proxy-and-auth.yaml
```

## Step 4: Verify the Proxy Configuration

After applying the resources, check that the GitRepository reconciles successfully through the proxy.

```bash
# Check GitRepository status
flux get source git my-app

# For detailed status information
kubectl describe gitrepository my-app -n flux-system
```

A successful reconciliation indicates that the proxy connection is working.

```
NAME    REVISION              SUSPENDED   READY   MESSAGE
my-app  main@sha1:abc123def   False       True    stored artifact for revision 'main@sha1:abc123def'
```

## Step 5: Using HTTPS Proxy with Custom CA Certificates

If your proxy performs TLS inspection (MITM proxy), the source controller needs to trust the proxy's CA certificate. You can provide this through the Git credentials secret.

```yaml
# gitrepository-proxy-custom-ca.yaml
# GitRepository with proxy and custom CA for TLS inspection
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  secretRef:
    name: git-credentials-with-ca
  proxySecretRef:
    name: git-proxy
---
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials-with-ca
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <your-token>
  # CA certificate for TLS inspection proxy
  caFile: |
    -----BEGIN CERTIFICATE-----
    <your-proxy-ca-certificate-here>
    -----END CERTIFICATE-----
```

## Troubleshooting Proxy Issues

When the GitRepository fails to reconcile through a proxy, use these steps to diagnose the problem.

```bash
# Check source controller logs for proxy-related errors
kubectl logs -n flux-system deployment/source-controller | grep -i "proxy\|connect\|timeout"

# Verify the proxy secret exists and has the correct data
kubectl get secret git-proxy -n flux-system -o jsonpath='{.data.address}' | base64 -d

# Check network connectivity from the source controller pod
kubectl exec -n flux-system deployment/source-controller -- curl -x http://proxy.corporate.example.com:8080 -I https://github.com
```

Common issues include:

- **Connection refused**: The proxy address or port is incorrect. Verify the proxy URL in the secret.
- **407 Proxy Authentication Required**: Your proxy requires credentials but they are missing or incorrect. Update the secret with the correct username and password in the URL.
- **TLS certificate errors**: Your proxy performs TLS inspection. Provide the proxy CA certificate in the Git credentials secret via the `caFile` field.
- **Timeout errors**: The proxy may be unreachable from the cluster network. Verify that the source controller pods can reach the proxy address.

## Environment-Level Proxy Configuration

As an alternative to per-GitRepository proxy configuration, you can set proxy environment variables on the source controller deployment itself. This applies the proxy to all Git operations.

```bash
# Patch the source controller deployment with proxy environment variables
kubectl set env deployment/source-controller \
  -n flux-system \
  HTTP_PROXY=http://proxy.corporate.example.com:8080 \
  HTTPS_PROXY=http://proxy.corporate.example.com:8080 \
  NO_PROXY=.cluster.local,.svc,10.0.0.0/8
```

However, using `spec.proxySecretRef` is recommended over environment variables because it provides per-repository control and does not require modifying the Flux deployment directly.

## Summary

Configuring proxy support for Flux GitRepository resources is straightforward with the `spec.proxySecretRef` field. Create a Secret containing your proxy address, reference it from the GitRepository, and Flux will route all Git clone operations through the proxy. This approach works well in enterprise environments with restricted network access and supports authentication, custom CA certificates, and per-repository proxy settings.
