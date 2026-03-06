# How to Use flux create secret proxy for Proxy Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, proxy, secret, configuration, gitops, kubernetes, networking, enterprise

Description: A practical guide to configuring proxy settings for Flux using the flux create secret proxy command in enterprise environments.

---

## Introduction

Many enterprise environments require all outbound traffic to pass through HTTP/HTTPS proxy servers. The `flux create secret proxy` command creates Kubernetes secrets that configure Flux controllers to route their traffic through proxy servers when accessing Git repositories, Helm repositories, OCI registries, and other external services.

This guide covers proxy configuration for Flux in enterprise environments, including authenticated proxies, proxy exceptions, and troubleshooting common proxy-related issues.

## Prerequisites

- Flux CLI v2.0 or later installed
- kubectl configured with cluster access
- Flux installed on your Kubernetes cluster
- Proxy server address and credentials (if required)

```bash
# Verify Flux installation
flux check

# Test proxy connectivity from your machine
curl -x http://proxy.company.com:3128 https://github.com
```

## Understanding Proxy Configuration in Flux

```mermaid
graph LR
    A[Flux Controller] -->|HTTP/HTTPS via Proxy| B[Proxy Server]
    B -->|Forward Request| C[External Services]
    C -->|Git Repos| D[GitHub / GitLab]
    C -->|Helm Charts| E[Chart Repositories]
    C -->|OCI Artifacts| F[Container Registries]

    A -->|Direct Connection| G[Internal Services<br/>NO_PROXY]
```

## Basic Usage

### Simple Proxy Without Authentication

```bash
# Create a proxy secret with just the proxy address
# This configures HTTP and HTTPS proxy settings
flux create secret proxy proxy-config \
  --address=http://proxy.company.com:3128 \
  --namespace=flux-system
```

### Proxy With Authentication

```bash
# Create a proxy secret with username and password
flux create secret proxy proxy-auth \
  --address=http://proxy.company.com:3128 \
  --username=proxyuser \
  --password=${PROXY_PASSWORD} \
  --namespace=flux-system
```

### Proxy With Embedded Credentials in URL

```bash
# Alternatively, embed credentials in the proxy address URL
flux create secret proxy proxy-embedded \
  --address=http://proxyuser:proxypass@proxy.company.com:3128 \
  --namespace=flux-system
```

## Referencing Proxy Secrets

### GitRepository with Proxy

```yaml
# git-repo-with-proxy.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/myrepo
  ref:
    branch: main
  secretRef:
    name: git-auth
  proxySecretRef:
    name: proxy-config
```

```bash
# Apply the GitRepository resource
kubectl apply -f git-repo-with-proxy.yaml

# Verify it syncs through the proxy
flux get sources git
```

### HelmRepository with Proxy

```yaml
# helm-repo-with-proxy.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
  proxySecretRef:
    name: proxy-config
```

### OCIRepository with Proxy

```yaml
# oci-repo-with-proxy.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-artifacts
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/myorg/app-config
  ref:
    tag: latest
  secretRef:
    name: oci-auth
  proxySecretRef:
    name: proxy-config
```

## Enterprise Proxy Scenarios

### Corporate Proxy with NTLM Authentication

```bash
# Some corporate proxies use NTLM authentication
# Use a CNTLM proxy relay as an intermediary

# First, set up CNTLM as a DaemonSet or sidecar in your cluster
# Then point Flux to the CNTLM relay
flux create secret proxy corp-proxy \
  --address=http://cntlm-relay.proxy-system.svc.cluster.local:3128 \
  --namespace=flux-system
```

### HTTPS Proxy (CONNECT Method)

```bash
# For HTTPS proxies that use the CONNECT method
flux create secret proxy https-proxy \
  --address=https://secure-proxy.company.com:3129 \
  --username=proxyuser \
  --password=${PROXY_PASSWORD} \
  --namespace=flux-system
```

### SOCKS5 Proxy

```bash
# Configure a SOCKS5 proxy
flux create secret proxy socks-proxy \
  --address=socks5://socks-proxy.company.com:1080 \
  --namespace=flux-system
```

### Multiple Proxy Configurations

```bash
# Create different proxy secrets for different services

# Proxy for external Git repositories
flux create secret proxy git-proxy \
  --address=http://git-proxy.company.com:3128 \
  --username=gitproxy \
  --password=${GIT_PROXY_PASSWORD} \
  --namespace=flux-system

# Proxy for external container registries
flux create secret proxy registry-proxy \
  --address=http://registry-proxy.company.com:3128 \
  --username=regproxy \
  --password=${REG_PROXY_PASSWORD} \
  --namespace=flux-system
```

```yaml
# Use different proxy secrets for different sources
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/myrepo
  ref:
    branch: main
  proxySecretRef:
    name: git-proxy
---
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-artifacts
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/myorg/app-config
  ref:
    tag: latest
  proxySecretRef:
    name: registry-proxy
```

## Exporting Proxy Secrets

```bash
# Export proxy secret as YAML for declarative management
flux create secret proxy proxy-config \
  --address=http://proxy.company.com:3128 \
  --username=proxyuser \
  --password=${PROXY_PASSWORD} \
  --namespace=flux-system \
  --export > proxy-secret.yaml

# View the generated YAML
cat proxy-secret.yaml

# Encrypt before storing in Git
sops --encrypt --in-place proxy-secret.yaml
```

## Global Proxy Configuration

If all Flux controllers need to use the proxy, you can configure it at the controller level using environment variables.

```bash
# Patch the source-controller deployment to use proxy environment variables
kubectl set env deployment/source-controller \
  -n flux-system \
  HTTP_PROXY=http://proxy.company.com:3128 \
  HTTPS_PROXY=http://proxy.company.com:3128 \
  NO_PROXY=10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1

# Patch the helm-controller similarly
kubectl set env deployment/helm-controller \
  -n flux-system \
  HTTP_PROXY=http://proxy.company.com:3128 \
  HTTPS_PROXY=http://proxy.company.com:3128 \
  NO_PROXY=10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1
```

For a declarative approach using Kustomize patches:

```yaml
# kustomization-proxy-patch.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: "(source-controller|helm-controller|notification-controller)"
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            containers:
              - name: manager
                env:
                  - name: HTTP_PROXY
                    value: "http://proxy.company.com:3128"
                  - name: HTTPS_PROXY
                    value: "http://proxy.company.com:3128"
                  - name: NO_PROXY
                    value: "10.0.0.0/8,.cluster.local,.svc,localhost,127.0.0.1"
```

## Updating Proxy Credentials

```bash
# When proxy credentials change, update the secret
flux create secret proxy proxy-config \
  --address=http://proxy.company.com:3128 \
  --username=proxyuser \
  --password=${NEW_PROXY_PASSWORD} \
  --namespace=flux-system \
  --export | kubectl apply -f -

# Force reconciliation of affected sources
flux reconcile source git app-repo
flux reconcile source helm bitnami
```

## Troubleshooting

### Testing Proxy Connectivity

```bash
# Test proxy connectivity from within the cluster
kubectl run proxy-test --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl -x http://proxy.company.com:3128 -v https://github.com

# Test proxy authentication
kubectl run proxy-auth-test --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl -x http://proxyuser:proxypass@proxy.company.com:3128 -v https://github.com
```

### Common Errors

```bash
# Error: "proxyconnect tcp: dial tcp: lookup proxy.company.com: no such host"
# The proxy hostname cannot be resolved from within the cluster
# Verify DNS resolution
kubectl run dns-test --rm -it --restart=Never \
  --image=busybox -- nslookup proxy.company.com

# Error: "proxyconnect tcp: tls: first record does not look like a TLS handshake"
# You are using http:// for an HTTPS proxy or vice versa
# Try switching the protocol in the proxy address

# Error: "407 Proxy Authentication Required"
# Proxy credentials are missing or incorrect
# Verify the username and password

# Check source controller logs for proxy-related errors
kubectl logs deployment/source-controller -n flux-system | grep -i proxy
```

### Verifying Proxy Secret Contents

```bash
# Check that the proxy secret has the correct keys
kubectl get secret proxy-config -n flux-system -o json | jq '.data | keys'

# Decode the address to verify it is correct
kubectl get secret proxy-config -n flux-system -o jsonpath='{.data.address}' | base64 -d
```

## Best Practices

1. **Use per-source proxy configuration** with `proxySecretRef` rather than global environment variables for fine-grained control.
2. **Configure NO_PROXY** for internal services to avoid routing cluster-internal traffic through the proxy.
3. **Use dedicated proxy credentials** for Flux rather than sharing credentials with other services.
4. **Monitor proxy logs** for connection issues and blocked requests.
5. **Test proxy connectivity** from within the cluster before configuring Flux.
6. **Document proxy exceptions** needed for Flux to function correctly.

## Summary

The `flux create secret proxy` command simplifies proxy configuration for Flux in enterprise environments. By creating proxy secrets and referencing them in source resources, you can route Flux traffic through corporate proxies while maintaining fine-grained control over which sources use which proxy. This is essential for organizations with strict network security policies that require all outbound traffic to pass through proxy servers.
