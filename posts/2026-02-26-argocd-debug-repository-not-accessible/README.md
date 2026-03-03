# How to Debug 'Repository Not Accessible' Errors in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Git

Description: Learn how to systematically diagnose and fix 'repository not accessible' errors in ArgoCD, covering network issues, DNS problems, TLS errors, and authentication failures.

---

The "repository not accessible" error is one of the most common problems ArgoCD users face. It is also one of the most frustrating because the error message is generic and can be caused by a dozen different issues. This guide provides a systematic approach to diagnosing and fixing the root cause.

## Understanding the Error

When ArgoCD shows "repository not accessible" in the UI or CLI, it means the repo-server failed to connect to the Git repository. The error can appear when:

- Adding a new repository
- Syncing an application
- ArgoCD's periodic repository health check fails

The actual error message often includes additional details:

```text
rpc error: code = Unknown desc = error creating SSH agent: ...
rpc error: code = Unknown desc = authentication required
rpc error: code = Unknown desc = repository not found
rpc error: code = Unknown desc = dial tcp: lookup github.example.com: no such host
```

## Step 1: Check the Full Error Message

Start by getting the detailed error:

```bash
# Check repository status with full error
argocd repo list

# Get detailed info about a specific repo
argocd repo get https://github.com/your-org/your-repo.git

# Check the application controller logs
kubectl logs -n argocd deployment/argocd-application-controller --tail=100 | grep -i "error\|fail"

# Check the repo-server logs (most important)
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -i "error\|fail\|denied"
```

## Step 2: Diagnose Network Connectivity

The most fundamental check - can the repo-server pod reach the Git server?

```bash
# DNS resolution
kubectl exec -n argocd deployment/argocd-repo-server -- nslookup github.com

# TCP connectivity to HTTPS port
kubectl exec -n argocd deployment/argocd-repo-server -- \
  timeout 5 bash -c 'echo > /dev/tcp/github.com/443' && echo "Connected" || echo "Failed"

# TCP connectivity to SSH port
kubectl exec -n argocd deployment/argocd-repo-server -- \
  timeout 5 bash -c 'echo > /dev/tcp/github.com/22' && echo "Connected" || echo "Failed"

# Full HTTP check
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -v --connect-timeout 5 https://github.com 2>&1 | head -30
```

Common network issues:

```mermaid
flowchart TD
    A[Repository Not Accessible] --> B{DNS resolves?}
    B -->|No| C[Check DNS settings, CoreDNS]
    B -->|Yes| D{TCP port reachable?}
    D -->|No| E[Check firewall rules, NetworkPolicy]
    D -->|Yes| F{TLS handshake succeeds?}
    F -->|No| G[Check certificates, proxy]
    F -->|Yes| H{Auth succeeds?}
    H -->|No| I[Check credentials, token]
    H -->|Yes| J{Repo exists and is accessible?}
    J -->|No| K[Check repo URL, permissions]
    J -->|Yes| L[Check ArgoCD config]
```

## Step 3: Diagnose DNS Issues

If DNS resolution fails:

```bash
# Check CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS configuration
kubectl get configmap coredns -n kube-system -o yaml

# Try alternative DNS resolution
kubectl exec -n argocd deployment/argocd-repo-server -- \
  getent hosts github.com

# Check the pod's DNS config
kubectl exec -n argocd deployment/argocd-repo-server -- cat /etc/resolv.conf
```

Fixes:
- If using a custom DNS server, ensure it can resolve external domains
- Check if NetworkPolicy blocks DNS traffic (UDP port 53)
- Verify CoreDNS upstream forwarders are configured correctly

## Step 4: Diagnose TLS Issues

TLS errors are extremely common, especially with self-hosted Git servers and corporate proxies:

```bash
# Check the TLS certificate chain
kubectl exec -n argocd deployment/argocd-repo-server -- \
  openssl s_client -connect github.example.com:443 -servername github.example.com </dev/null 2>&1 | head -30

# Check if ArgoCD trusts the server's CA
kubectl get configmap argocd-tls-certs-cm -n argocd -o yaml
```

Common TLS issues and fixes:

### Self-Signed Certificate
```yaml
# Add the CA cert to ArgoCD
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  github.example.com: |
    -----BEGIN CERTIFICATE-----
    (your CA certificate)
    -----END CERTIFICATE-----
```

### Corporate Proxy Intercepting TLS
Add the proxy's CA certificate to the same ConfigMap.

### Skip TLS Verification (Testing Only)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-insecure
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.example.com/org/repo.git
  insecure: "true"
```

## Step 5: Diagnose Authentication Issues

If the network is fine but authentication fails:

```bash
# Test HTTPS credentials manually
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git ls-remote https://username:token@github.com/org/repo.git 2>&1

# Test SSH connectivity
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -T git@github.com 2>&1

# Check stored credentials
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository -o name
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repo-creds -o name
```

### Credential-Specific Checks

**HTTPS Token Expired**:
```bash
# Verify the token works
curl -H "Authorization: token ghp_your_token" https://api.github.com/user
```

**SSH Key Issues**:
```bash
# Check known hosts
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml

# Test SSH with verbose output
kubectl exec -n argocd deployment/argocd-repo-server -- \
  ssh -vvv -o StrictHostKeyChecking=no git@github.com 2>&1 | tail -20
```

**GitHub App Issues**:
```bash
# Check repo-server logs for GitHub App errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -i "github.*app\|jwt\|installation"
```

## Step 6: Check Repository URL

A surprisingly common issue is an incorrect repository URL:

```bash
# Verify the exact URL format
# GitHub HTTPS: https://github.com/org/repo.git
# GitHub SSH: git@github.com:org/repo.git
# GitLab: https://gitlab.com/org/repo.git
# Bitbucket Server: https://bitbucket.company.com/scm/PROJECT/repo.git
# Azure DevOps: https://dev.azure.com/org/project/_git/repo

# Check if the repo exists (public)
curl -s -o /dev/null -w "%{http_code}" https://github.com/org/repo
```

## Step 7: Check NetworkPolicies

Kubernetes NetworkPolicies can block the repo-server from reaching external Git hosts:

```bash
# Check for NetworkPolicies in the argocd namespace
kubectl get networkpolicies -n argocd

# Describe them to see the rules
kubectl describe networkpolicies -n argocd
```

If NetworkPolicies exist, ensure they allow egress traffic from the repo-server to:
- TCP port 443 (HTTPS Git)
- TCP port 22 (SSH Git)
- TCP port 53 / UDP port 53 (DNS)

```yaml
# Example NetworkPolicy allowing repo-server egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-repo-server-egress
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-repo-server
  policyTypes:
    - Egress
  egress:
    - ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
```

## Step 8: Check Proxy Settings

If you are behind a corporate proxy:

```bash
# Verify proxy environment variables
kubectl exec -n argocd deployment/argocd-repo-server -- env | grep -i proxy

# Test with explicit proxy
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -x http://proxy.company.com:8080 https://github.com 2>&1
```

## Quick Reference Checklist

When you encounter "repository not accessible", run through this checklist:

1. Can the pod resolve the hostname? (DNS)
2. Can the pod reach the host on the required port? (Firewall/NetworkPolicy)
3. Does the TLS handshake succeed? (Certificates)
4. Do the credentials work? (Authentication)
5. Is the repository URL correct? (Typos, wrong format)
6. Is the proxy configured correctly? (Enterprise environments)
7. Are the ArgoCD components healthy? (Pod restarts, resource limits)

```bash
# One-liner health check
kubectl get pods -n argocd && argocd repo list && argocd app list
```

For ongoing monitoring of your ArgoCD repository connectivity and sync health, consider setting up monitoring with [OneUptime](https://oneuptime.com/blog/post/2026-01-25-gitops-argocd-kubernetes/view) to catch these issues before they affect deployments.
