# How to Troubleshoot GitOps IPv6 Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GitOps, Troubleshooting, ArgoCD, Flux CD, Kubernetes

Description: Diagnose and resolve IPv6 connectivity issues in GitOps pipelines, covering Git server reachability, TLS certificate problems, SSH known_hosts formatting, and DNS resolution failures for IPv6...

## Introduction

GitOps IPv6 connectivity issues arise between the GitOps controller (ArgoCD repo-server or Flux source-controller) and the Git server, Helm registry, or OCI registry. Failures manifest as "application not synced" in ArgoCD or "GitRepository not ready" in Flux. This guide provides systematic troubleshooting steps, from pod-level IPv6 connectivity to protocol-specific debugging.

## Step 1: Verify Pod has IPv6 Connectivity

```bash
# Check IPv6 in ArgoCD repo-server pod

kubectl exec -n argocd deployment/argocd-repo-server -- ip -6 addr show
# Should show a usable non-link-local IPv6 address (global or ULA, not just fe80::)

# Check IPv6 in Flux source-controller pod
kubectl exec -n flux-system deployment/source-controller -- ip -6 addr show

# If no non-link-local IPv6: cluster CNI is not providing IPv6 to pods
# Check cluster CNI configuration (Calico, Cilium, etc.)
kubectl get configmap -n kube-system -o yaml | grep -i ipv6

# Check node has IPv6
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.addresses[*]}{.type}={.address}{" "}{end}{"\n"}{end}'
# Look for InternalIP or ExternalIP values containing IPv6 addresses
```

## Step 2: Test Git Server Connectivity from Pod

```bash
# HTTPS connectivity to IPv6 Git server
kubectl exec -n argocd deployment/argocd-repo-server -- \
    curl -6 -v "https://[2001:db8::10]:443" 2>&1 | head -40

# Common errors and meanings:
# "connect: Network is unreachable" → no IPv6 route in pod
# "connect: Connection refused" → Git server not listening on IPv6
# "SSL certificate problem" → TLS trust or SAN problem
# "Connection timed out" → firewall blocking IPv6 to Git server

# SSH connectivity
kubectl exec -n argocd deployment/argocd-repo-server -- \
    ssh -6 -o ConnectTimeout=10 -T "git@2001:db8::10" 2>&1

# DNS resolution (should return AAAA record)
kubectl exec -n flux-system deployment/source-controller -- \
    nslookup git.example.com
# Look for "Address: 2001:db8::10" in output
```

## Step 3: Diagnose HTTPS/TLS Issues

```bash
# Check TLS certificate has correct IPv6 SAN
openssl s_client -connect "[2001:db8::10]:443" -6 < /dev/null 2>&1 | \
    openssl x509 -noout -text | grep -A5 "Subject Alternative"

# Expected: an IP Address entry for 2001:db8::10
# If missing: "x509: cannot validate certificate for 2001:db8::10 because it doesn't contain any IP SANs"

# Fix: regenerate TLS certificate with IPv6 SAN
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt \
    -days 365 -nodes \
    -subj "/CN=git.example.com" \
    -addext "subjectAltName=IP:2001:db8::10,DNS:git.example.com"

# Check if ArgoCD has the correct CA for the Git server
kubectl get configmap argocd-tls-certs-cm -n argocd -o yaml | grep -A10 "git.example.com"

# Add CA certificate to ArgoCD config
kubectl edit configmap argocd-tls-certs-cm -n argocd
# Add under data:
# git.example.com: |
#   -----BEGIN CERTIFICATE-----
#   ...CA cert for IPv6 Git server...
#   -----END CERTIFICATE-----
```

## Step 4: Diagnose SSH known_hosts Issues

```bash
# ArgoCD SSH error: "SSH known hosts not found"
argocd cert list --cert-type ssh | grep -E "git.example.com|2001:db8::10"

# Check the known_hosts data in the ArgoCD ConfigMap
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o jsonpath='{.data.ssh_known_hosts}'

# Correct format for IPv6 in OpenSSH known_hosts:
# 2001:db8::10 ssh-rsa AAAAB3Nz...
# or for non-standard SSH ports:
# [2001:db8::10]:2222 ssh-ed25519 AAAAC3Nz...

# Collect host keys in known_hosts format
ssh-keyscan -6 2001:db8::10 2>/dev/null
# For non-standard SSH ports:
ssh-keyscan -6 -p 2222 2001:db8::10 2>/dev/null

# Add host keys to ArgoCD
ssh-keyscan -6 2001:db8::10 2>/dev/null | argocd cert add-ssh --batch

# Or edit declarative config
kubectl edit configmap argocd-ssh-known-hosts-cm -n argocd
# Add under data.ssh_known_hosts:
# 2001:db8::10 ssh-ed25519 AAAAC3Nz...
```

## Step 5: Diagnose Flux-Specific Issues

```bash
# Flux: check GitRepository status
kubectl describe gitrepository myapp -n flux-system
# Look at Status.Conditions for error messages

# Check source-controller logs
kubectl logs -n flux-system deployment/source-controller --tail=100 | \
    grep -E "error|failed|ipv6|connect|timeout"

# Common Flux errors:
# "failed to clone repository: ...connection refused"
# → Git server not reachable over IPv6
# Fix: check server binding with ss -tlnp on Git server

# "x509: certificate is not valid for..."
# → TLS cert SAN doesn't match IPv6 address
# Fix: add IPv6 SAN to cert or use insecure skip

# "ssh: handshake failed: knownhosts: knownhosts: key mismatch"
# → Server key changed or wrong key in secret
# Re-scan: ssh-keyscan -6 2001:db8::10

# Force reconcile to test fix
flux reconcile source git myapp -n flux-system --timeout=60s
```

## Step 6: Cluster-Level IPv6 Routing

```bash
# Ensure pods can route to IPv6 Git servers
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- \
    traceroute6 2001:db8::10

# Check if cluster has a default IPv6 route
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- \
    ip -6 route show
# Expected: default via ... (cluster's IPv6 gateway)

# If no default IPv6 route: check cluster CNI IPv6 configuration
# For Calico:
kubectl get felixconfiguration default -o yaml | grep -i ipv6
# For Cilium:
kubectl get configmap cilium-config -n kube-system -o yaml | grep -i ipv6
```

## Diagnostic Script for GitOps IPv6

```bash
#!/bin/bash
# diagnose-gitops-ipv6.sh

NAMESPACE=${1:-"flux-system"}
TARGET="deployment/source-controller"
GIT_URL=${2:-"https://[2001:db8::10]:443"}

echo "=== Pod IPv6 Status ==="
kubectl exec -n "$NAMESPACE" "$TARGET" -- ip -6 addr show 2>/dev/null

echo "=== DNS Resolution ==="
kubectl exec -n "$NAMESPACE" "$TARGET" -- nslookup git.example.com 2>/dev/null

echo "=== Connectivity Test ==="
kubectl exec -n "$NAMESPACE" "$TARGET" -- curl -6 -I "$GIT_URL" 2>&1 | head -20

echo "=== Recent Errors ==="
kubectl logs -n "$NAMESPACE" "$TARGET" --tail=20 | grep -i "error\|fail"
```

## Conclusion

Troubleshooting GitOps IPv6 connectivity follows a layered approach: confirm the controller pod has IPv6 (a usable non-link-local address), test raw connectivity with `curl -6` and `ssh -6` from inside the pod, check TLS certificates have IPv6 SAN entries, and verify SSH known_hosts entries use the raw IPv6 literal for the default SSH port or the `[ipv6]:port` bracket format for non-standard ports. ArgoCD errors appear in `argocd app get` and pod logs; Flux errors appear in `kubectl describe gitrepository`. Force reconciliation with `argocd app sync` or `flux reconcile source git` after applying fixes to confirm resolution. For cluster-wide IPv6 routing issues, verify the CNI plugin is configured with IPv6 support and the cluster has a default IPv6 route.
