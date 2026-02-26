# How to Configure Git Credential Caching in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Performance

Description: Learn how to configure Git credential caching in ArgoCD to reduce authentication overhead, minimize API calls to credential providers, and improve repo server performance.

---

Every time ArgoCD fetches from a private Git repository, it needs to authenticate. For HTTPS repositories, this means sending credentials with each request. For organizations with hundreds of applications all pointing to private repositories, this creates significant authentication overhead and can trigger rate limiting from credential providers like GitHub Apps or OAuth token endpoints.

Git credential caching reduces this overhead by storing authenticated sessions in memory for a configurable period. This guide covers how to configure credential caching in ArgoCD for better performance and reliability.

## How ArgoCD Handles Git Credentials

ArgoCD stores repository credentials in Kubernetes Secrets within the argocd namespace. When the repo server needs to fetch from a repository, it retrieves the appropriate credentials and passes them to the Git client. The flow looks like this:

```mermaid
flowchart LR
    A[Repo Server] --> B{Credentials Cached?}
    B -->|Yes| C[Use Cached Credentials]
    B -->|No| D[Fetch from K8s Secret]
    D --> E[Authenticate with Git Server]
    E --> F[Cache Credentials]
    C --> G[Git Fetch Operation]
    F --> G
```

Without caching, every Git operation triggers a fresh credential lookup and authentication handshake. With caching, subsequent operations reuse the authenticated session.

## Configuring Repository Credential Templates

Before diving into credential caching, ensure you are using credential templates. These allow ArgoCD to share a single set of credentials across multiple repositories that match a URL pattern:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  username: x-access-token
```

This template applies to all repositories under `https://github.com/myorg`. Instead of configuring credentials for each repository individually, ArgoCD matches the URL prefix and uses the template credentials. This is the first layer of reducing credential management overhead.

## Configuring Git Credential Helper Caching

Git has a built-in credential helper system that can cache credentials in memory. Configure this by mounting a custom gitconfig into the repo server:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-repo-server-gitconfig
  namespace: argocd
data:
  gitconfig: |
    [credential]
      helper = cache --timeout=3600

    [credential "https://github.com"]
      helper = cache --timeout=7200

    [credential "https://gitlab.internal.corp.com"]
      helper = cache --timeout=1800
```

Mount it into the repo server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        volumeMounts:
        - name: gitconfig
          mountPath: /home/argocd/.gitconfig
          subPath: gitconfig
      volumes:
      - name: gitconfig
        configMap:
          name: argocd-repo-server-gitconfig
```

The `--timeout` value is in seconds. The example above caches GitHub credentials for 2 hours and internal GitLab credentials for 30 minutes.

## Understanding Cache Lifetime Trade-offs

The cache timeout creates a trade-off between performance and security:

**Short timeout (300-900 seconds):**
- Credentials refreshed frequently
- Lower risk if a credential is compromised
- More authentication requests to Git servers
- Better for short-lived tokens (OAuth, GitHub App installation tokens)

**Long timeout (3600-86400 seconds):**
- Fewer authentication requests
- Better performance for large ArgoCD installations
- Credentials stay in memory longer if compromised
- Better for long-lived personal access tokens

For most environments, a timeout between 1800 and 3600 seconds (30 minutes to 1 hour) provides a good balance.

## Configuring Credential Caching with GitHub App Tokens

GitHub App installation tokens expire after 1 hour by default. ArgoCD handles GitHub App authentication natively, but the token refresh process adds latency. Configure caching to minimize redundant token generation:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ... (your private key)
    -----END RSA PRIVATE KEY-----
```

ArgoCD automatically handles token generation and caching for GitHub App credentials. The tokens are refreshed before they expire, so you do not need to configure additional caching for this authentication method.

## Repo Server Cache Configuration

Beyond Git credential caching, the ArgoCD repo server has its own caching layer for repository data. This reduces the frequency of full Git clones:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Cache expiration for repository data
  reposerver.default.cache.expiration: "24h"
  # Enable repo server parallelism limit
  reposerver.parallelism.limit: "10"
```

The repo server maintains a local clone of each repository. When ArgoCD needs to check for changes, it performs a `git fetch` instead of a full clone. This is much faster and uses fewer credentials authentications because the repository is already checked out locally.

## Persistent Repository Cache

By default, the repo server stores its local repository cache in an emptyDir volume. This means the cache is lost when the pod restarts, and ArgoCD needs to re-clone all repositories. Configure a persistent volume to retain the cache:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        volumeMounts:
        - name: repo-cache
          mountPath: /tmp
      volumes:
      - name: repo-cache
        persistentVolumeClaim:
          claimName: argocd-repo-server-cache
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: argocd-repo-server-cache
  namespace: argocd
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: gp3
```

With persistent caching, restarts no longer trigger a full re-authentication and clone cycle for all repositories. The repo server picks up where it left off.

## Configuring Helm Values for Credential Caching

If you manage ArgoCD with Helm, configure credential caching in your values:

```yaml
# values.yaml
repoServer:
  volumes:
    - name: gitconfig
      configMap:
        name: argocd-repo-server-gitconfig
    - name: repo-cache
      persistentVolumeClaim:
        claimName: argocd-repo-server-cache

  volumeMounts:
    - name: gitconfig
      mountPath: /home/argocd/.gitconfig
      subPath: gitconfig
    - name: repo-cache
      mountPath: /tmp

  env:
    - name: ARGOCD_EXEC_TIMEOUT
      value: "3m"

configs:
  params:
    reposerver.default.cache.expiration: "24h"
```

## Monitoring Credential Cache Effectiveness

Track how well your credential caching is working by monitoring Git operation metrics:

```promql
# Rate of Git requests - should decrease with effective caching
rate(argocd_git_request_total[5m])

# Git request duration - should decrease as cached operations are faster
histogram_quantile(0.95,
  rate(argocd_git_request_duration_seconds_bucket[5m])
)

# Failed authentication requests
rate(argocd_git_request_total{grpc_code="Unauthenticated"}[5m])
```

A spike in unauthenticated errors might indicate that cached credentials have expired and the underlying credentials themselves are invalid.

## Troubleshooting Credential Cache Issues

**Credentials not being cached:**

```bash
# Check if the gitconfig is mounted correctly
kubectl exec -n argocd deployment/argocd-repo-server -- cat /home/argocd/.gitconfig

# Check if the credential helper daemon is running
kubectl exec -n argocd deployment/argocd-repo-server -- git credential-cache --daemon
```

**Stale cached credentials after rotation:**

When you rotate repository credentials (update the Kubernetes Secret), the cached version might still be used until it expires. Force a cache clear by restarting the repo server:

```bash
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

**Memory pressure from credential caching:**

The credential cache stores data in memory. For installations with many repositories, this can add to memory consumption. Monitor the repo server's memory usage and adjust resource limits accordingly:

```yaml
resources:
  requests:
    memory: 256Mi
  limits:
    memory: 1Gi
```

Credential caching is a simple optimization that pays off significantly in large ArgoCD deployments. Start with a moderate cache timeout, monitor the metrics, and adjust based on your authentication patterns and security requirements.
