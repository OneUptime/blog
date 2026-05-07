# How to Configure ArgoCD Application Sources with IPv6 Git URLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ArgoCD, GitOps, Git, Kubernetes, HTTPS

Description: Configure ArgoCD to connect to Git repositories over IPv6, including HTTPS and SSH repository URLs with IPv6 addresses, trust configuration, and troubleshooting connection issues.

## Introduction

ArgoCD connects to Git repositories as application sources for GitOps deployments. When Git servers are on IPv6 networks, ArgoCD can connect using literal IPv6 URLs or hostnames that resolve to AAAA records. This involves adding repositories with IPv6 addresses in the URL, configuring TLS trust for HTTPS endpoints, and ensuring the ArgoCD cluster's DNS can resolve Git hostnames to AAAA records.

## Add a Git Repository with IPv6 HTTPS URL

```bash
# ArgoCD CLI: add a Git repository over IPv6

argocd repo add "https://[2001:db8::1]:443/org/myrepo.git" \
    --username git \
    --password "$GIT_TOKEN" \
    --insecure-skip-server-verification    # Only for testing

# If the Git server uses a self-signed certificate or custom CA,
# add the CA certificate for the HTTPS server first
argocd cert add-tls gitea.example.com --from /tmp/git-ca.crt

# With TLS certificate verification (recommended for production)
argocd repo add "https://gitea.example.com/org/myrepo.git" \
    --username git \
    --password "$GIT_TOKEN"
# Hostname must resolve to an AAAA record for IPv6 connectivity

# List repositories
argocd repo list
```

## ArgoCD Repository Secret with IPv6

```yaml
# argocd-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-repo-ipv6
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  # HTTPS repository with IPv6 address
  url: "https://[2001:db8::1]:443/org/myrepo.git"
  username: git
  password: "your-token"
  # Configure custom CA trust separately in argocd-tls-certs-cm
  insecure: "false"
```

```bash
kubectl apply -f argocd-repo-secret.yaml
```

## ArgoCD with SSH Git Repository over IPv6

```yaml
# argocd-ssh-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-ipv6
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  # SSH URL over IPv6
  # Hostnames that resolve to AAAA records are usually the easiest option
  url: "ssh://git@gitserver.example.com/org/myrepo.git"
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
  insecure: "false"
```

```bash
# For SSH with IPv6, configure DNS to return an AAAA record for gitserver.example.com
# and add the server's SSH host keys to ArgoCD

# Get SSH host key from IPv6 Git server
ssh-keyscan -6 gitserver.example.com | argocd cert add-ssh --batch

# If you need a literal IPv6 SSH URL instead of a hostname, use ssh:// with brackets
# Example: ssh://git@[2001:db8::1]/org/myrepo.git
```

## ArgoCD Application Using IPv6 Repository

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default

  source:
    # Repository added above with IPv6 URL
    repoURL: "https://[2001:db8::1]:443/org/myrepo.git"
    targetRevision: main
    path: kubernetes/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## ArgoCD Network Configuration for IPv6

```bash
# Ensure ArgoCD's repo-server pod can reach IPv6 Git servers
# For hostname-based URLs, the Kubernetes cluster's DNS must return AAAA records
# ArgoCD does not require a separate "force IPv6" setting for outbound Git connections

# Test end-to-end connectivity to a literal IPv6 Git URL from the repo-server pod
kubectl exec -n argocd deployment/argocd-repo-server -- \
    git ls-remote "https://[2001:db8::1]:443/org/myrepo.git"
```

## Configure ArgoCD TLS Trust for IPv6 Git Server

```yaml
# argocd-tls-certs-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  # Custom CA for a hostname that resolves to an AAAA record
  gitea.example.com: |
    -----BEGIN CERTIFICATE-----
    MIIBxxx...   # CA cert for IPv6 Git server
    -----END CERTIFICATE-----
```

## Troubleshoot ArgoCD IPv6 Git Connectivity

```bash
# Check ArgoCD repo-server logs for connection errors
kubectl logs -n argocd deployment/argocd-repo-server | grep -i "err\|ipv6\|connect"

# Test Git access directly from repo-server pod using a literal IPv6 URL
kubectl exec -n argocd deployment/argocd-repo-server -- \
    git ls-remote "https://[2001:db8::1]:443/org/myrepo.git"

# Test hostname-based access that depends on AAAA resolution
kubectl exec -n argocd deployment/argocd-repo-server -- \
    git ls-remote "https://gitea.example.com/org/myrepo.git"

# Verify TLS certificate includes an IPv6 SAN when using a literal IPv6 HTTPS URL
openssl s_client -connect "[2001:db8::1]:443" -6 </dev/null 2>&1 | \
    openssl x509 -noout -text | grep -A3 "Subject Alternative"
# Should show: IP Address:2001:db8::1
```

## Conclusion

ArgoCD connects to Git repositories over IPv6 using HTTPS URLs with bracket notation (`https://[2001:db8::1]:443/`) or SSH URLs that use either hostnames resolving to AAAA records or bracketed IPv6 literals in `ssh://` form. Repository secrets reference these URLs and include repository credentials or SSH keys. Custom HTTPS trust for Git servers is configured through the ArgoCD `argocd-tls-certs-cm` ConfigMap or the `argocd cert add-tls` command. For SSH over IPv6, add the server's host key to ArgoCD's known_hosts using `argocd cert add-ssh`. Ensure the Kubernetes cluster's DNS returns AAAA records for Git hostnames when using hostnames rather than literal IPv6 addresses in repository URLs.
