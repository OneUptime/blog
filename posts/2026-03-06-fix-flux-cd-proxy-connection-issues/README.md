# How to Fix Flux CD Proxy Connection Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, proxy, http proxy, https proxy, gitops, kubernetes, troubleshooting, corporate network

Description: A detailed guide to configuring Flux CD to work behind HTTP/HTTPS proxies, including proxy authentication, NO_PROXY settings, and proxy secret configuration.

---

Many enterprise environments route external traffic through HTTP/HTTPS proxies. Flux CD controllers need to reach external Git repositories and container registries, so they must be properly configured to use the proxy. This guide covers every aspect of proxy configuration for Flux CD.

## Understanding Proxy Requirements for Flux CD

Flux CD controllers make outbound connections to:

- **Git repositories** (GitHub, GitLab, Bitbucket, self-hosted)
- **Container registries** (Docker Hub, ECR, GCR, ACR)
- **Helm repositories** (Artifact Hub, ChartMuseum)
- **Webhook endpoints** (for notifications)

Each of these connections may need to go through your proxy.

## Step 1: Identify the Connection Failure

Check which controller is failing and what it is trying to reach.

```bash
# Check all Flux sources for errors
flux get sources all

# Check specific controller logs
kubectl logs -n flux-system deployment/source-controller | grep -i "timeout\|proxy\|refused\|dial"
kubectl logs -n flux-system deployment/helm-controller | grep -i "timeout\|proxy\|refused\|dial"
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "timeout\|proxy\|refused\|dial"
```

Typical error messages when proxy is needed but not configured:

```
dial tcp: i/o timeout
connection refused
context deadline exceeded
TLS handshake timeout
```

## Step 2: Configure Proxy via Controller Environment Variables

The standard approach is to set proxy environment variables on the Flux controller deployments.

### Method 1: Patch Deployments Directly

```bash
# Set proxy environment variables on source-controller
kubectl set env deployment/source-controller -n flux-system \
  HTTP_PROXY=http://proxy.example.com:8080 \
  HTTPS_PROXY=http://proxy.example.com:8080 \
  NO_PROXY=".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

# Set on helm-controller
kubectl set env deployment/helm-controller -n flux-system \
  HTTP_PROXY=http://proxy.example.com:8080 \
  HTTPS_PROXY=http://proxy.example.com:8080 \
  NO_PROXY=".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

# Set on image-reflector-controller
kubectl set env deployment/image-reflector-controller -n flux-system \
  HTTP_PROXY=http://proxy.example.com:8080 \
  HTTPS_PROXY=http://proxy.example.com:8080 \
  NO_PROXY=".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

# Set on notification-controller
kubectl set env deployment/notification-controller -n flux-system \
  HTTP_PROXY=http://proxy.example.com:8080 \
  HTTPS_PROXY=http://proxy.example.com:8080 \
  NO_PROXY=".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

### Method 2: Use Kustomize Patches (Recommended for GitOps)

Create a patch file in your Flux repository that persists across reconciliations:

```yaml
# clusters/production/flux-system/proxy-patch.yaml
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
            # HTTP proxy for unencrypted connections
            - name: HTTP_PROXY
              value: "http://proxy.example.com:8080"
            # HTTPS proxy for encrypted connections
            - name: HTTPS_PROXY
              value: "http://proxy.example.com:8080"
            # Addresses that should bypass the proxy
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

Apply the patch to all controllers via Kustomize:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Apply proxy settings to all controller deployments
  - path: proxy-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: source-controller
  - path: proxy-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: helm-controller
  - path: proxy-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: kustomize-controller
  - path: proxy-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: notification-controller
  - path: proxy-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: image-reflector-controller
  - path: proxy-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: image-automation-controller
```

## Step 3: Configure Proxy with Authentication

If your proxy requires a username and password:

```yaml
# proxy-patch-with-auth.yaml
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
            - name: HTTP_PROXY
              # Include credentials in the proxy URL
              value: "http://user:password@proxy.example.com:8080"
            - name: HTTPS_PROXY
              value: "http://user:password@proxy.example.com:8080"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

### Using a Secret for Proxy Credentials

To avoid storing credentials in plain text:

```yaml
# Create a secret with proxy credentials
apiVersion: v1
kind: Secret
metadata:
  name: proxy-credentials
  namespace: flux-system
type: Opaque
stringData:
  HTTP_PROXY: "http://user:password@proxy.example.com:8080"
  HTTPS_PROXY: "http://user:password@proxy.example.com:8080"
  NO_PROXY: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
---
# Patch to reference the secret
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
          envFrom:
            # Load all proxy variables from the secret
            - secretRef:
                name: proxy-credentials
```

## Step 4: Configure NO_PROXY Correctly

The NO_PROXY variable is critical. Incorrect values will cause Flux controllers to route internal cluster traffic through the proxy, breaking service-to-service communication.

```bash
# Essential NO_PROXY entries for Kubernetes clusters
NO_PROXY=".cluster.local,.svc,localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

Explanation of each entry:

```yaml
# .cluster.local  - Kubernetes internal DNS suffix
# .svc            - Kubernetes service DNS
# localhost        - Local loopback
# 127.0.0.1       - Local loopback IP
# 10.0.0.0/8      - Common pod/service CIDR range
# 172.16.0.0/12   - Common pod/service CIDR range
# 192.168.0.0/16  - Common pod/service CIDR range
```

### Find Your Cluster's Actual CIDR Ranges

```bash
# Get the service CIDR
kubectl cluster-info dump | grep -m1 service-cluster-ip-range

# Get the pod CIDR
kubectl cluster-info dump | grep -m1 cluster-cidr

# Add both to NO_PROXY
```

## Step 5: Configure Proxy for Git over SSH

HTTP/HTTPS proxy environment variables do not apply to SSH connections. For Git repositories accessed via SSH, you need a different approach.

```yaml
# Use HTTPS instead of SSH for Git repositories behind a proxy
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  # Use HTTPS URL instead of SSH
  url: https://github.com/myorg/fleet-infra.git
  ref:
    branch: main
  secretRef:
    name: flux-system
```

If you must use SSH through a proxy, configure a proxy command:

```yaml
# Advanced: SSH proxy via ProxyCommand
# This requires a custom container image or init container
# with socat or ncat installed
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
            - name: GIT_SSH_COMMAND
              value: "ssh -o ProxyCommand='socat - PROXY:proxy.example.com:%h:%p,proxyport=8080'"
```

## Step 6: Configure Proxy for Helm Repositories

Helm repository access also needs proxy configuration:

```yaml
# HelmRepository with proxy - uses the controller's proxy env vars
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
  # No special proxy config needed if controller env vars are set
```

For OCI Helm repositories:

```yaml
# OCI HelmRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 30m
  type: oci
  url: oci://ghcr.io/stefanprodan/charts
  # Proxy env vars on image-reflector-controller apply here
```

## Step 7: Verify Proxy Configuration

After applying proxy settings, verify the controllers are using them.

```bash
# Check environment variables on source-controller
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].env}' | python3 -m json.tool

# Verify connectivity through the proxy
kubectl exec -n flux-system deployment/source-controller -- env | grep -i proxy

# Force reconciliation to test
flux reconcile source git flux-system

# Check for successful source fetch
kubectl get gitrepositories -n flux-system
```

## Step 8: Bootstrap Flux Behind a Proxy

When bootstrapping Flux in a proxied environment, the bootstrap command itself needs proxy access.

```bash
# Set proxy variables in your shell before bootstrapping
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

# Run the bootstrap
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production

# After bootstrap, apply the Kustomize proxy patches
# so the deployed controllers also use the proxy
```

## Step 9: Debug Proxy Issues

```bash
# Test proxy connectivity from a debug pod
kubectl run -n flux-system proxy-test --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl -x http://proxy.example.com:8080 \
  -s -o /dev/null -w "%{http_code}" \
  https://github.com

# Check if proxy is intercepting TLS (MITM)
kubectl run -n flux-system tls-test --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl -x http://proxy.example.com:8080 \
  -v https://github.com 2>&1 | grep "issuer"

# If the proxy performs TLS inspection, see the
# self-signed certificate guide for CA bundle configuration
```

## Step 10: Full Debugging Checklist

```bash
# 1. Check controller env vars
for deploy in source-controller helm-controller kustomize-controller notification-controller; do
  echo "=== $deploy ==="
  kubectl get deployment $deploy -n flux-system \
    -o jsonpath='{.spec.template.spec.containers[0].env}' 2>/dev/null
  echo
done

# 2. Verify controllers are running after env changes
kubectl get pods -n flux-system

# 3. Check source-controller logs for connectivity
kubectl logs -n flux-system deployment/source-controller --tail=30

# 4. Test proxy from inside the cluster
kubectl run proxy-test -n flux-system --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl -x http://proxy.example.com:8080 https://github.com

# 5. Verify NO_PROXY includes cluster CIDRs
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="NO_PROXY")].value}'

# 6. Force reconciliation
flux reconcile source git flux-system
```

## Summary

Fixing Flux CD proxy issues requires:

- **Setting HTTP_PROXY, HTTPS_PROXY, and NO_PROXY** on all Flux controller deployments
- **Using Kustomize patches** to persist proxy settings across reconciliations
- **Configuring NO_PROXY correctly** to exclude cluster-internal CIDRs
- **Switching to HTTPS** for Git repositories if SSH cannot traverse the proxy
- **Handling proxy authentication** via URL-embedded credentials or Kubernetes secrets

If your proxy performs TLS interception, you will also need to configure custom CA certificates, which is covered in the self-signed certificate troubleshooting guide.
