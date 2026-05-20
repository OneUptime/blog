# How to Configure Git Credential Caching in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Performance

Description: Learn how to configure Git credential caching in ArgoCD to reduce authentication overhead, minimize API calls to credential providers, and improve repo server performance.

---

Every time ArgoCD fetches from a private Git repository, it needs credentials that Git can use for that request. For HTTPS repositories, this usually means providing a username and password or token through ArgoCD's askpass integration. For organizations with hundreds of applications all pointing to private repositories, this creates operational overhead and can add latency when tokens have to be generated from providers like GitHub Apps or OAuth token endpoints.

Git credential caching can reduce some repeated Git credential prompts by storing credentials in memory for a configurable period. ArgoCD also has its own repository and token caches. This guide covers how these layers fit together for better performance and reliability.

## How ArgoCD Handles Git Credentials

ArgoCD stores repository credentials in Kubernetes Secrets within the argocd namespace. When the repo server needs to fetch from a repository, it resolves the appropriate credentials and exposes them to the Git client through ArgoCD's askpass helper. The flow looks like this:

```mermaid
flowchart LR
    A[Repo Server] --> B{Credentials Cached?}
    B -->|Yes| C[Use Cached Credentials]
    B -->|No| D[Fetch from K8s Secret]
    D --> E[Provide Credentials via Askpass]
    E --> F[Cache Credentials]
    C --> G[Git Fetch Operation]
    F --> G
```

Without caching, every Git operation may need ArgoCD to provide credentials again. With caching, subsequent operations can reuse cached credential material where the authentication method supports it.

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

Git has a built-in credential helper system that can cache credentials in memory. ArgoCD runs Git with `HOME=/dev/null`, so a user-level file such as `/home/argocd/.gitconfig` is not used. If you need to customize Git configuration in the repo server, mount it as system Git configuration at `/etc/gitconfig` or build it into a custom image:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-repo-server-gitconfig
  namespace: argocd
data:
  gitconfig: |
    [credential]
      helper = cache --timeout=3600 --socket=/tmp/git-credential-cache.sock

    [credential "https://github.com"]
      helper = cache --timeout=7200 --socket=/tmp/git-credential-cache.sock

    [credential "https://gitlab.internal.corp.com"]
      helper = cache --timeout=1800 --socket=/tmp/git-credential-cache.sock
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
          mountPath: /etc/gitconfig
          subPath: gitconfig
      volumes:
      - name: gitconfig
        configMap:
          name: argocd-repo-server-gitconfig
```

The `--timeout` value is in seconds. The example above caches GitHub credentials for 2 hours and internal GitLab credentials for 30 minutes. The explicit `--socket` keeps the cache socket on a writable local path; the helper stores credentials in the credential-cache daemon's memory and forgets them when the timeout expires or the daemon exits.

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

GitHub App installation tokens expire after 1 hour by default. ArgoCD handles GitHub App authentication natively and caches the GitHub App installation transport/token internally, so Git credential-helper caching is not required to avoid regenerating a token for every Git operation. Configure the repository or credential template with GitHub App credentials:

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

ArgoCD automatically handles token generation and caching for GitHub App credentials. The default cache duration is 60 minutes and can be adjusted with `ARGOCD_GITHUB_APP_CREDS_EXPIRATION_DURATION`, which is specified in minutes, so you do not need to configure Git credential-helper caching for this authentication method.

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
  reposerver.default.cache.expiration: "24h0m0s"
  # Cache expiration for repo state, including app lists, app details,
  # manifest generation, and revision metadata
  reposerver.repo.cache.expiration: "24h0m0s"
  # Enable repo server parallelism limit
  reposerver.parallelism.limit: "10"
```

The repo server maintains a local clone of each repository. When ArgoCD needs to check for changes, it can perform a `git fetch` instead of a full clone. This is much faster and usually needs less authentication work because the repository is already checked out locally.

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

With persistent caching, restarts no longer have to discard every local clone. If you run multiple repo server replicas, use storage that matches your replica model, such as one writable volume per replica or a storage class that supports the access mode you need.

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
      mountPath: /etc/gitconfig
      subPath: gitconfig
    - name: repo-cache
      mountPath: /tmp

  env:
    - name: ARGOCD_EXEC_TIMEOUT
      value: "3m"

configs:
  params:
    reposerver.default.cache.expiration: "24h0m0s"
    reposerver.repo.cache.expiration: "24h0m0s"
```

## Monitoring Credential Cache Effectiveness

Track how well your credential caching is working by monitoring Git operation metrics:

```promql
# Rate of Git requests - useful for correlating repo-server load
rate(argocd_git_request_total[5m])

# Git request duration
histogram_quantile(0.95,
  rate(argocd_git_request_duration_seconds_bucket[5m])
)

# Failed Git fetch requests
rate(argocd_git_fetch_fail_total[5m])
```

A spike in Git fetch failures might indicate that cached credentials have expired and the underlying credentials themselves are invalid. Check the repo-server logs for the exact Git authentication error.

## Troubleshooting Credential Cache Issues

**Git configuration not being applied:**

```bash
# Check if the gitconfig is mounted correctly
kubectl exec -n argocd deployment/argocd-repo-server -- git config --system --get-all credential.helper

# Clear the credential-cache daemon if you need to force Git to forget cached credentials
kubectl exec -n argocd deployment/argocd-repo-server -- git credential-cache exit
```

**Stale cached credentials after rotation:**

When you rotate repository credentials (update the Kubernetes Secret), the cached version might still be used until it expires. Force a cache clear by restarting the repo server:

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- git credential-cache exit
```

If you need to clear all repo-server in-memory state as well, restart the repo server:

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

Credential caching can be a useful optimization in large ArgoCD deployments, especially alongside ArgoCD's built-in repository and token caches. Start with a moderate cache timeout, monitor the metrics, and adjust based on your authentication patterns and security requirements.
