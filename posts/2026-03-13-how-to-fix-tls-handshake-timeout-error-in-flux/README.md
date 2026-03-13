# How to Fix TLS handshake timeout Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, TLS, Networking, Source Controller

Description: Learn how to diagnose and fix the "TLS handshake timeout" error in Flux CD when controllers cannot establish secure connections to remote endpoints.

---

When Flux controllers attempt to connect to remote services over HTTPS, you may see:

```
source-controller: failed to checkout and determine revision: unable to clone 'https://github.com/my-org/my-repo.git': net/http: TLS handshake timeout
```

or:

```
helm-controller: failed to download chart: Get "https://charts.example.com/my-chart-1.0.0.tgz": net/http: TLS handshake timeout
```

This error means the TCP connection was established successfully, but the TLS negotiation did not complete within the expected time.

## Root Causes

### 1. Firewall Doing Deep Packet Inspection

Some corporate firewalls inspect TLS traffic and may delay or interfere with the TLS handshake process. The firewall intercepts the connection for analysis, causing the handshake to exceed its timeout.

### 2. Proxy Not Handling HTTPS CONNECT

If an HTTP proxy is configured but does not properly support the CONNECT method for HTTPS tunneling, the TLS handshake will stall.

### 3. MTU Issues

Network path MTU (Maximum Transmission Unit) mismatches can cause large TLS handshake packets to be silently dropped, especially in overlay networks or when using VPNs.

### 4. DNS Resolves but Connection Is Blocked

The connection reaches a host that accepts TCP connections but does not respond to TLS Client Hello messages, possibly due to IP-level filtering.

### 5. Overloaded Remote Server

The remote Git host or registry may be under heavy load and unable to complete TLS negotiations in time.

## Diagnostic Steps

### Step 1: Check Source Controller Logs

```bash
kubectl logs -n flux-system deploy/source-controller --since=10m | grep "TLS handshake"
```

### Step 2: Test TLS Handshake from the Cluster

```bash
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n flux-system -- \
  curl -vvv --connect-timeout 10 https://github.com 2>&1 | head -30
```

### Step 3: Test with OpenSSL

```bash
kubectl run -it --rm debug --image=alpine --restart=Never -n flux-system -- \
  sh -c "apk add openssl && echo | openssl s_client -connect github.com:443 -servername github.com"
```

### Step 4: Check MTU Settings

```bash
kubectl run -it --rm debug --image=busybox --restart=Never -n flux-system -- \
  ping -c 3 -M do -s 1400 github.com
```

If this fails with packet-too-big errors, MTU is likely the issue.

### Step 5: Check for Proxy Configuration

```bash
kubectl get deployment source-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].env}' | jq .
```

## How to Fix

### Fix 1: Fix MTU Settings

If MTU is the problem, reduce the MTU on the cluster network. For Calico:

```bash
kubectl patch felixconfiguration default --type=merge -p '{"spec":{"mtuIfacePattern":"^(en|eth|wl).*","ipipMTU":1400,"vxlanMTU":1380}}'
```

For other CNI plugins, consult the specific documentation for adjusting MTU values.

### Fix 2: Configure Proxy with CONNECT Support

Ensure the proxy supports HTTPS CONNECT and configure it:

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
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.example.com:3128"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12"
```

### Fix 3: Allowlist Flux Traffic in the Firewall

Request that your network team excludes Flux source-controller traffic from deep packet inspection for known safe endpoints like GitHub, or add the specific endpoints to a TLS inspection bypass list.

### Fix 4: Use SSH Instead of HTTPS

Switch to SSH for Git access, which uses a different port and protocol that may not be subject to TLS inspection:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/my-org/my-repo.git
  secretRef:
    name: ssh-credentials
```

Create the SSH key secret:

```bash
kubectl create secret generic ssh-credentials \
  --namespace=flux-system \
  --from-file=identity=./id_ed25519 \
  --from-file=identity.pub=./id_ed25519.pub \
  --from-file=known_hosts=./known_hosts
```

### Fix 5: Force Reconciliation

```bash
flux reconcile source git my-repo
```

## Prevention

Test TLS connectivity to all required endpoints during cluster provisioning. Document any proxy or firewall requirements. Use SSH transport for Git repositories in environments with TLS inspection. Monitor TLS handshake latency as part of your cluster health checks.
