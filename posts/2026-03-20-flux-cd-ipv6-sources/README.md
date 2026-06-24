# How to Configure Flux CD Source Controllers with IPv6 - Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Flux CD, GitOps, Kubernetes, Source Controller, DevOps

Description: Configure Flux CD source controllers to sync from Git repositories and Helm registries accessible over IPv6, including GitRepository and HelmRepository resources with IPv6 URLs.

## Introduction

Flux CD's source-controller manages connections to Git repositories, Helm repositories, and OCI registries. In IPv6 or dual-stack Kubernetes clusters, Flux can connect to sources over IPv6 by specifying IPv6 URLs in the source custom resources.

## Step 1: Verify Flux Is Running with IPv6

```bash
# Check Flux pods have IPv6 connectivity

kubectl get pods -n flux-system

# Verify source-controller can reach IPv6 endpoints
kubectl exec -n flux-system deployment/source-controller -- \
    sh -c "ip -f inet6 addr show && wget -qO- https://ipv6.icanhazip.com" 2>/dev/null || \
    kubectl exec -n flux-system deployment/source-controller -- \
    ip -f inet6 addr show

# Check Flux service endpoints
kubectl get endpoints -n flux-system
```

## Step 2: Configure a GitRepository Source with IPv6

```yaml
# gitrepo-ipv6.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  interval: 1m0s
  # IPv6 URL for the Git server
  url: https://[2001:db8::10]/org/my-app.git
  ref:
    branch: main
  secretRef:
    name: git-credentials-ipv6
```

```yaml
# git-credentials-ipv6.yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials-ipv6
  namespace: flux-system
type: Opaque
stringData:
  username: git-user
  password: ghp_XXXXXXXXXX  # Personal access token
  # For self-signed TLS:
  # ca.crt: |
  #   -----BEGIN CERTIFICATE-----
  #   ...
  #   -----END CERTIFICATE-----
```

```bash
kubectl apply -f git-credentials-ipv6.yaml
kubectl apply -f gitrepo-ipv6.yaml

# Check the GitRepository status
flux get sources git
# Or:
kubectl get gitrepository -n flux-system my-app-repo
```

## Step 3: Configure SSH-Based GitRepository with IPv6

```bash
# Generate SSH key pair for Flux
ssh-keygen -t ed25519 -C flux-source-controller -f /tmp/flux-deploy-key -N ""

# Add public key to the Git server as a deploy key
cat /tmp/flux-deploy-key.pub

# Create the Kubernetes secret with the private key
kubectl create secret generic git-ssh-credentials-ipv6 \
    -n flux-system \
    --from-file=identity=/tmp/flux-deploy-key \
    --from-literal=known_hosts="$(ssh-keyscan -6 -H 2001:db8::10 2>/dev/null)"
```

```yaml
# gitrepo-ssh-ipv6.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-ssh-repo
  namespace: flux-system
spec:
  interval: 1m0s
  # SSH URL with IPv6 address
  url: ssh://git@[2001:db8::10]/org/my-app.git
  ref:
    branch: main
  secretRef:
    name: git-ssh-credentials-ipv6
```

## Step 4: Configure HelmRepository with IPv6

```yaml
# helmrepo-ipv6.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts-ipv6
  namespace: flux-system
spec:
  interval: 10m0s
  # Helm repository hosted on an IPv6-accessible server
  url: https://[2001:db8::20]/charts
  secretRef:
    name: helm-repo-credentials
```

```yaml
# helm-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: helm-user
  password: helm-password
```

## Step 5: Configure Kustomization to Use the IPv6 Source

```yaml
# kustomization-ipv6.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m0s
  sourceRef:
    kind: GitRepository
    name: my-app-repo  # References the IPv6 GitRepository
  path: ./k8s/
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
```

## Step 6: Verify Flux Source Synchronization

```bash
# Check all Flux sources
flux get sources all

# Watch for GitRepository to sync
flux get sources git --watch

# Check detailed status and any errors
kubectl describe gitrepository -n flux-system my-app-repo

# Force a manual reconciliation
flux reconcile source git my-app-repo

# Check source-controller logs for IPv6-related issues
kubectl logs -n flux-system deployment/source-controller --tail=50 | \
    grep -E "error|Warning|ipv6|connection|my-app-repo"
```

## Troubleshooting

```bash
# If sync fails with "connection refused" or "no route to host":
# Check source-controller network connectivity
kubectl exec -n flux-system deployment/source-controller -- \
    wget -O- https://[2001:db8::10]/api/v1/repos/org/my-app

# Verify hostname resolution inside the source-controller Pod
# If you expect IPv6, look for an AAAA answer
kubectl exec -n flux-system deployment/source-controller -- \
    nslookup gitea.example.com

# Check if certificate validation fails (for self-signed certs)
# Add ca.crt to the Secret with the PEM-encoded CA certificate
```

## Conclusion

Flux CD source controllers support IPv6 repository connections by specifying IPv6 addresses in bracket notation in the `url` field of GitRepository and HelmRepository resources. The source-controller connects to these sources as long as the Flux pods have IPv6 network access (provided by the underlying Kubernetes cluster's network plugin). SSH-based connections require capturing the host key of the IPv6 Git server for `known_hosts` verification.
