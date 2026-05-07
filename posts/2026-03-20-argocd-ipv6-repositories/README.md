# How to Configure ArgoCD Application Sources with IPv6 Git URLs - Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ArgoCD, GitOps, Kubernetes, Git, DevOps

Description: Configure ArgoCD to connect to Git repositories using IPv6 URLs, including SSH and HTTPS connections and repository credential management.

## Introduction

ArgoCD manages Kubernetes applications by syncing from Git repositories. When your Git server is only accessible over IPv6, or when you want to prefer IPv6 for repository connections, you need to configure ArgoCD's repository connections and ensure the underlying network supports IPv6.

## Prerequisites

- ArgoCD installed in an IPv6-capable Kubernetes cluster
- Git server accessible over IPv6 (GitLab, Gitea, or self-hosted)
- ArgoCD CLI installed

## Step 1: Verify ArgoCD Pods Have IPv6 Connectivity

```bash
# Check that ArgoCD pods have IPv6 addresses assigned
kubectl get pods -n argocd \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.podIPs[*]}{.ip}{" "}{end}{"\n"}{end}'

# Verify the argocd-repo-server pod has IPv6 interfaces
kubectl exec -n argocd deployment/argocd-repo-server -- \
    cat /proc/net/if_inet6

# Check ArgoCD's service IP families and addresses
kubectl get svc -n argocd \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.ipFamilies}{"\t"}{.spec.clusterIPs}{"\n"}{end}'
```

## Step 2: Add a Repository with IPv6 HTTPS URL

```bash
# Add a private Git repo accessible over IPv6 via HTTPS
argocd repo add https://[2001:db8::1]/org/repo.git \
    --username myuser \
    --password mypassword \
    --insecure-skip-server-verification  # Only for self-signed certs in testing

# Add with TLS client certificate authentication
argocd repo add https://[2001:db8::1]/org/repo.git \
    --username myuser \
    --password mypassword \
    --tls-client-cert-path /tmp/git-client.crt \
    --tls-client-cert-key-path /tmp/git-client.key
```

For self-signed or private CA server certificates, use ArgoCD's TLS certificate management (`argocd cert add-tls` or `argocd-tls-certs-cm`) instead of `--tls-client-cert-path`. The server certificate must still be valid for the host in the repository URL, so HTTPS over a literal IPv6 address requires the certificate to include that IPv6 address as an IP subjectAltName.

## Step 3: Add a Repository with IPv6 SSH URL

```bash
# Add SSH key for GitHub, GitLab, or Gitea over IPv6
# First generate or provide an SSH key
ssh-keygen -t ed25519 -f /tmp/argocd-git-key -N ""

# Add the public key to your Git server

# Register the server's SSH host key in ArgoCD
ssh-keyscan 2001:db8::1 | argocd cert add-ssh --batch

# Register the repo in ArgoCD using SSH with an IPv6 literal
argocd repo add ssh://git@[2001:db8::1]/org/repo.git \
    --ssh-private-key-path /tmp/argocd-git-key

# For GitHub (which has IPv6 connectivity via DNS):
argocd repo add git@github.com:org/repo.git \
    --ssh-private-key-path /tmp/argocd-git-key
```

## Step 4: Configure Repository via Kubernetes Secret

For GitOps-managed ArgoCD configuration:

```yaml
# argocd-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-git-repo-ipv6
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: "https://[2001:db8::1]/org/repo.git"
  username: "git-user"
  password: "git-token"
  # Optional: TLS client certificate in PEM format
  # tlsClientCertData: |
  #   -----BEGIN CERTIFICATE-----
  #   ...
  #   -----END CERTIFICATE-----
  # tlsClientCertKey: |
  #   -----BEGIN PRIVATE KEY-----
  #   ...
  #   -----END PRIVATE KEY-----
```

```bash
kubectl apply -f argocd-repo-secret.yaml
```

## Step 5: Create an ArgoCD Application from IPv6 Source

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    # Use IPv6 URL for the Git repository
    repoURL: https://[2001:db8::1]/org/my-app.git
    targetRevision: HEAD
    path: k8s/

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```bash
kubectl apply -f argocd-app.yaml

# Or via CLI
argocd app create my-app \
    --repo https://[2001:db8::1]/org/my-app.git \
    --path k8s/ \
    --dest-server https://kubernetes.default.svc \
    --dest-namespace production \
    --sync-policy automated \
    --auto-prune \
    --self-heal \
    --sync-option CreateNamespace=true
```

## Step 6: Verify Repository Connectivity

```bash
# Check repository connection status
argocd repo list

# Get detailed status for a specific repo
argocd repo get https://[2001:db8::1]/org/repo.git

# Force a connection status refresh
argocd repo get https://[2001:db8::1]/org/repo.git --refresh hard
```

## Troubleshooting IPv6 Repository Connections

```bash
# Check ArgoCD repo server logs for connection errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=50 | grep -i "error\|ipv6\|connection"

# Test SSH repository access from the ArgoCD repo server
kubectl exec -n argocd deployment/argocd-repo-server -- \
    git ls-remote ssh://git@[2001:db8::1]/org/repo.git HEAD

# Test HTTPS repository access from the ArgoCD repo server
kubectl exec -n argocd deployment/argocd-repo-server -- \
    git ls-remote https://[2001:db8::1]/org/repo.git HEAD
```

## Conclusion

ArgoCD supports IPv6 repository connections through standard Git URL notation. For HTTP and HTTPS URLs, IPv6 literals are enclosed in square brackets. For SSH connections to a literal IPv6 address, use the `ssh://` form instead of scp-style `git@host:path` syntax, and make sure the SSH host key is present in ArgoCD. Repository credentials are stored as Kubernetes Secrets with the `argocd.argoproj.io/secret-type: repository` label. The key requirement is that `argocd-repo-server` in the cluster has IPv6 network connectivity, which depends on your cluster and CNI being configured for dual-stack or IPv6-only networking. HTTPS over a literal IPv6 address also requires a server certificate that is valid for that IP address.
