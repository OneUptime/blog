# How to Fix connection refused Error in Flux Source Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Source Controller, Networking, DNS

Description: Learn how to diagnose and fix the "connection refused" error in the Flux source-controller when it cannot reach Git repositories or Helm registries.

---

When the Flux source-controller cannot establish a connection to a remote repository or registry, you will see errors like:

```
source-controller: failed to checkout and determine revision: unable to clone 'https://github.com/my-org/my-repo.git': dial tcp 140.82.121.3:443: connect: connection refused
```

or:

```
source-controller: failed to fetch Helm repository index: Get "https://charts.example.com/index.yaml": dial tcp 10.0.0.50:443: connect: connection refused
```

This error means the source-controller pod was able to resolve the hostname to an IP address but could not establish a TCP connection to the remote service.

## Root Causes

### 1. Network Policies Blocking Egress

Kubernetes NetworkPolicies may restrict outbound traffic from the `flux-system` namespace, preventing the source-controller from reaching external services.

### 2. Firewall Rules

Cluster-level or infrastructure firewalls may block outbound connections on the required ports (typically 443 for HTTPS or 22 for SSH).

### 3. Proxy Configuration Missing

In environments that require an HTTP proxy for outbound access, the source-controller may not have the proxy environment variables configured.

### 4. Remote Service Is Down

The Git hosting service, Helm repository, or OCI registry may be temporarily unavailable.

### 5. DNS Resolution Returns Wrong IP

DNS may resolve to an incorrect or stale IP address, especially in private network configurations.

## Diagnostic Steps

### Step 1: Check Source Status

```bash
flux get sources git -A
flux get sources helm -A
```

### Step 2: Test Connectivity from Inside the Cluster

```bash
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n flux-system -- \
  curl -v https://github.com
```

### Step 3: Check Network Policies

```bash
kubectl get networkpolicies -n flux-system
```

Review any policies that might restrict egress:

```bash
kubectl describe networkpolicy -n flux-system
```

### Step 4: Verify DNS Resolution

```bash
kubectl run -it --rm debug --image=busybox --restart=Never -n flux-system -- \
  nslookup github.com
```

### Step 5: Check Source Controller Logs

```bash
kubectl logs -n flux-system deploy/source-controller --since=5m | grep "connection refused"
```

## How to Fix

### Fix 1: Update Network Policies to Allow Egress

Create or update a NetworkPolicy to allow the source-controller to reach external services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-egress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Fix 2: Configure HTTP Proxy

If your environment requires a proxy, patch the source-controller deployment:

```bash
kubectl patch deployment source-controller -n flux-system --type=json \
  -p='[
    {"op":"add","path":"/spec/template/spec/containers/0/env/-","value":{"name":"HTTPS_PROXY","value":"http://proxy.example.com:3128"}},
    {"op":"add","path":"/spec/template/spec/containers/0/env/-","value":{"name":"HTTP_PROXY","value":"http://proxy.example.com:3128"}},
    {"op":"add","path":"/spec/template/spec/containers/0/env/-","value":{"name":"NO_PROXY","value":".cluster.local,.svc,10.0.0.0/8"}}
  ]'
```

### Fix 3: Update Firewall Rules

Work with your infrastructure team to allow outbound traffic from the cluster nodes to the required endpoints. For GitHub, you need to allow access to:

- `github.com` on port 443 (HTTPS) or port 22 (SSH)
- `*.githubusercontent.com` on port 443

### Fix 4: Use an In-Cluster Git Mirror

If external access is restricted by policy, set up an in-cluster Git mirror:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://git-mirror.internal.svc.cluster.local/my-org/my-repo.git
  secretRef:
    name: git-mirror-credentials
```

### Fix 5: Force Reconciliation

After resolving network issues:

```bash
flux reconcile source git flux-system
```

## Prevention

Document the network requirements for Flux controllers and include them in your cluster provisioning automation. Test connectivity to all required endpoints as part of cluster validation. Use monitoring to detect network policy changes that could break Flux connectivity.
