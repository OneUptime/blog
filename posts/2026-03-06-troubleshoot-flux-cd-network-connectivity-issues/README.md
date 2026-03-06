# How to Troubleshoot Flux CD Network Connectivity Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Troubleshooting, Networking, Kubernetes, DNS, Firewall, Proxy, GitOps

Description: Learn how to diagnose and fix network connectivity issues in Flux CD, including DNS resolution failures, firewall blocks, proxy configuration, and network policies.

---

Network connectivity problems are among the most common causes of Flux CD failures. When controllers cannot reach Git repositories, Helm chart registries, or container registries, reconciliation stops with cryptic timeout errors. This guide walks through systematic network debugging for Flux CD.

## Common Symptoms of Network Issues

Before diving into diagnostics, here are the typical error messages that indicate network problems:

```text
# DNS resolution failure
failed to checkout and determine revision: unable to clone: dial tcp: lookup github.com: no such host

# Connection timeout
failed to checkout and determine revision: unable to clone: dial tcp 140.82.121.3:443: i/o timeout

# TLS handshake failure
failed to checkout and determine revision: unable to clone: tls: failed to verify certificate

# Connection refused
failed to fetch Helm repository index: dial tcp 10.0.0.5:443: connect: connection refused

# Proxy error
failed to checkout and determine revision: proxyconnect tcp: dial tcp proxy.corp.com:3128: i/o timeout
```

## Step 1: Test DNS Resolution

DNS is the most common source of network issues in Kubernetes:

```bash
# Test DNS resolution from inside the flux-system namespace
kubectl run dns-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- nslookup github.com

# Test DNS for a private Git server
kubectl run dns-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- nslookup git.internal.company.com

# Check the DNS configuration inside the pod
kubectl run dns-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- cat /etc/resolv.conf

# Check CoreDNS pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

### Fixing DNS Issues

If DNS resolution fails, check the CoreDNS ConfigMap:

```bash
# View the CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml
```

For private DNS zones, add a forward rule:

```yaml
# coredns-custom.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  internal.server: |
    internal.company.com:53 {
        forward . 10.0.0.2
    }
```

## Step 2: Test TCP Connectivity

```bash
# Test HTTPS connectivity to GitHub
kubectl run net-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- wget -qO- --timeout=10 https://github.com 2>&1 | head -5

# Test connectivity to a specific port
kubectl run net-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- nc -zv github.com 443 -w 10

# Test SSH connectivity (for SSH Git URLs)
kubectl run net-test --rm -it --restart=Never \
  -n flux-system \
  --image=alpine/git:latest \
  -- ssh -T -o ConnectTimeout=10 -o StrictHostKeyChecking=no git@github.com 2>&1

# Test connectivity to a Helm repository
kubectl run net-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- wget -qO- --timeout=10 https://charts.bitnami.com/bitnami/index.yaml 2>&1 | head -5

# Test connectivity to a container registry
kubectl run net-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- wget -qO- --timeout=10 https://registry-1.docker.io/v2/ 2>&1
```

## Step 3: Check Firewall Rules

If TCP connections time out, there may be firewall rules blocking egress traffic:

```bash
# Check if there are any NetworkPolicies affecting Flux pods
kubectl get networkpolicies -n flux-system

# Describe NetworkPolicies to see the rules
kubectl describe networkpolicies -n flux-system

# Check if the cluster has a default deny policy
kubectl get networkpolicies -A | grep -i deny
```

### Creating Network Policies That Allow Flux Egress

If your cluster uses a default-deny network policy, you need to explicitly allow Flux controllers to reach external services:

```yaml
# flux-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-flux-egress
  namespace: flux-system
spec:
  podSelector: {}  # Apply to all pods in flux-system
  policyTypes:
    - Egress
  egress:
    # Allow DNS resolution
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow HTTPS to external services (Git, Helm repos, registries)
    - to: []
      ports:
        - protocol: TCP
          port: 443
    # Allow SSH for Git over SSH
    - to: []
      ports:
        - protocol: TCP
          port: 22
    # Allow HTTP for internal services
    - to: []
      ports:
        - protocol: TCP
          port: 80
    # Allow communication within the cluster
    - to:
        - namespaceSelector: {}
```

```bash
# Apply the network policy
kubectl apply -f flux-network-policy.yaml
```

## Step 4: Configure Proxy Settings

Many corporate environments route traffic through an HTTP proxy:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Add proxy environment variables to source-controller
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                env:
                  - name: HTTPS_PROXY
                    value: "http://proxy.corp.com:3128"
                  - name: HTTP_PROXY
                    value: "http://proxy.corp.com:3128"
                  - name: NO_PROXY
                    value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
  # Add proxy to kustomize-controller
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                env:
                  - name: HTTPS_PROXY
                    value: "http://proxy.corp.com:3128"
                  - name: HTTP_PROXY
                    value: "http://proxy.corp.com:3128"
                  - name: NO_PROXY
                    value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
  # Add proxy to helm-controller
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                env:
                  - name: HTTPS_PROXY
                    value: "http://proxy.corp.com:3128"
                  - name: HTTP_PROXY
                    value: "http://proxy.corp.com:3128"
                  - name: NO_PROXY
                    value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

### Testing Proxy Connectivity

```bash
# Test connectivity through the proxy
kubectl run proxy-test --rm -it --restart=Never \
  -n flux-system \
  --image=curlimages/curl:latest \
  --env="HTTPS_PROXY=http://proxy.corp.com:3128" \
  -- curl -v --max-time 10 https://github.com 2>&1 | tail -20
```

## Step 5: Handle TLS Certificate Issues

### Custom CA Certificates

If your Git server or registry uses a self-signed certificate or a private CA:

```bash
# Create a secret with the CA certificate
kubectl create secret generic custom-ca \
  -n flux-system \
  --from-file=ca.crt=/path/to/ca-certificate.pem
```

Reference the CA in your GitRepository:

```yaml
# git-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://git.internal.company.com/my-org/my-repo.git
  secretRef:
    name: git-credentials
  ref:
    branch: main
  certSecretRef:
    name: custom-ca  # Reference the CA certificate secret
```

For Helm repositories with custom CA:

```yaml
# helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.internal.company.com
  certSecretRef:
    name: custom-ca
```

## Step 6: Debug Inter-Cluster Communication

Flux controllers need to communicate with the Kubernetes API server and with each other:

```bash
# Check if source-controller service is accessible
kubectl get svc -n flux-system

# Test connectivity to source-controller from another pod
kubectl run svc-test --rm -it --restart=Never \
  -n flux-system \
  --image=busybox:1.36 \
  -- wget -qO- --timeout=5 http://source-controller.flux-system.svc.cluster.local./healthz

# Check if the Kubernetes API server is reachable from Flux pods
kubectl exec -n flux-system deployment/source-controller -- \
  wget -qO- --timeout=5 https://kubernetes.default.svc.cluster.local/healthz \
  --no-check-certificate 2>&1
```

## Network Diagnostic Script

```bash
#!/bin/bash
# flux-network-diagnostic.sh - Complete network connectivity check

NAMESPACE="flux-system"
TARGETS=(
  "github.com:443"
  "registry-1.docker.io:443"
  "ghcr.io:443"
  "charts.bitnami.com:443"
)

echo "=== DNS Resolution ==="
for target in "${TARGETS[@]}"; do
  HOST=$(echo "$target" | cut -d: -f1)
  kubectl run "dns-$RANDOM" --rm -it --restart=Never \
    -n "$NAMESPACE" --image=busybox:1.36 \
    -- nslookup "$HOST" 2>/dev/null | grep -A2 "Name:"
done
echo ""

echo "=== TCP Connectivity ==="
for target in "${TARGETS[@]}"; do
  HOST=$(echo "$target" | cut -d: -f1)
  PORT=$(echo "$target" | cut -d: -f2)
  echo -n "$target: "
  kubectl run "tcp-$RANDOM" --rm -it --restart=Never \
    -n "$NAMESPACE" --image=busybox:1.36 \
    -- nc -zv "$HOST" "$PORT" -w 5 2>&1 | grep -o "open\|timed out\|refused"
done
echo ""

echo "=== Network Policies ==="
kubectl get networkpolicies -n "$NAMESPACE" -o wide
echo ""

echo "=== Controller Environment Variables ==="
for dep in source-controller kustomize-controller helm-controller; do
  echo "--- $dep ---"
  kubectl get deployment "$dep" -n "$NAMESPACE" \
    -o jsonpath='{.spec.template.spec.containers[0].env}' 2>/dev/null | jq . 2>/dev/null || echo "No env vars set"
done
```

## Summary

Network connectivity issues in Flux CD can stem from DNS resolution failures, firewall rules, missing proxy configuration, or TLS certificate problems. Start by testing DNS and TCP connectivity from within the flux-system namespace using test pods. Check for NetworkPolicies that might block egress traffic. For corporate environments, configure proxy settings via environment variables on each controller deployment. For private infrastructure with custom CAs, use `certSecretRef` on your source resources.
