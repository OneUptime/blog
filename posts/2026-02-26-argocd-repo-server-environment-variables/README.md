# How to Configure ArgoCD Repo Server Environment Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Repo Server, Performance Tuning

Description: Learn how to configure ArgoCD repo server environment variables to optimize manifest generation, Git operations, caching, and resource usage for production deployments.

---

The ArgoCD repo server is responsible for cloning Git repositories, rendering manifests (Helm, Kustomize, Jsonnet), and caching the results. It is the most resource-intensive component when dealing with large repositories or complex manifest generation. Tuning its environment variables directly impacts how fast your applications reconcile and how much memory and CPU the repo server consumes.

This guide covers the key environment variables for the repo server and how to configure them for different workload sizes.

## How the Repo Server Works

When ArgoCD needs to check or sync an application, the flow is:

```mermaid
graph TD
    A[Controller requests manifests] --> B[Repo Server]
    B --> C[Check cache]
    C -->|Cache hit| D[Return cached manifests]
    C -->|Cache miss| E[Clone/fetch Git repo]
    E --> F[Run config tool - Helm/Kustomize/etc]
    F --> G[Cache result]
    G --> D
```

Environment variables control each step: Git operations, manifest generation, caching, and parallelism.

## Setting Environment Variables

Use the `argocd-cmd-params-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  reposerver.log.level: "info"
  reposerver.parallelism.limit: "0"
```

Or set directly on the Deployment:

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
          env:
            - name: ARGOCD_REPO_SERVER_PARALLELISM_LIMIT
              value: "10"
```

## Parallelism and Concurrency

### Manifest Generation Parallelism

The most important tuning parameter. Controls how many manifest generation requests the repo server handles simultaneously:

```yaml
data:
  # Max concurrent manifest generation requests
  # Default: 0 (unlimited)
  reposerver.parallelism.limit: "10"
```

Setting this too high causes memory spikes when multiple large Helm charts render simultaneously. Setting it too low creates a bottleneck:

| Application Count | Recommended Parallelism |
|---|---|
| Under 50 | 0 (unlimited) |
| 50 to 200 | 10 |
| 200 to 500 | 20 |
| 500+ | 30 to 50 |

Monitor the repo server to find the right value for your workload:

```bash
# Check repo server CPU and memory

kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-repo-server

# Check for queued requests
kubectl logs -n argocd deployment/argocd-repo-server | grep -i "queue\|waiting"
```

## Git Configuration

### Git Request Timeout

```yaml
data:
  # Timeout for Git HTTP requests (default: 15s)
  reposerver.git.request.timeout: "120s"
```

Increase this for large repositories or slow network connections.

### Git Fetch Retry

```yaml
env:
  # Number of retries for Git fetch operations
  - name: ARGOCD_GIT_ATTEMPTS_COUNT
    value: "3"
```

### Git Repository Credentials

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: https://github.com/example/private-repo.git
  username: git
  password: token
```

### Git LFS Support

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: https://github.com/example/private-repo.git
  # Enable Git LFS for this repository
  enableLfs: "true"
```

## Logging Configuration

```yaml
data:
  # Log level: debug, info, warn, error
  reposerver.log.level: "info"

  # Log format: text or json
  reposerver.log.format: "json"
```

Use `json` format for production with log aggregation:

```yaml
data:
  reposerver.log.format: "json"
  reposerver.log.level: "info"
```

## Exec Timeout

Controls the timeout for config management tool execution (Helm template, kustomize build, etc.):

```yaml
data:
  # Repo server RPC timeout for controller requests (default: 60)
  controller.repo.server.timeout.seconds: "180"
```

```yaml
env:
  # Timeout for tool execution (default: 90s)
  - name: ARGOCD_EXEC_TIMEOUT
    value: "180s"
```

Increase this if you have:
- Complex Helm charts with many dependencies
- Large Kustomize bases with remote resources
- Custom plugins that take time to generate manifests

## TLS Configuration

```yaml
data:
  # Disable TLS on the repo server (when using service mesh or internal network)
  reposerver.disable.tls: "false"

  # TLS protocol settings
  reposerver.tls.minversion: "1.2"
  reposerver.tls.maxversion: "1.3"
  reposerver.tls.ciphers: "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
```

## Custom Environment Variables for Plugins

Pass custom environment variables through the Application spec. Argo CD prefixes user-supplied plugin variables with `ARGOCD_ENV_` before plugin commands receive them:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: example-plugin-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/config.git
    targetRevision: HEAD
    path: app
    plugin:
      env:
        # Plugin receives these as ARGOCD_ENV_CLUSTER_NAME, ARGOCD_ENV_REGION, and ARGOCD_ENV_REGISTRY_URL
        - name: CLUSTER_NAME
          value: "production-east"
        - name: REGION
          value: "us-east-1"
        - name: REGISTRY_URL
          value: "123456789.dkr.ecr.us-east-1.amazonaws.com"
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

For Helm plugins or built-in Helm rendering, set Helm environment variables on the repo server container:

```yaml
env:
  - name: HELM_CACHE_HOME
    value: "/tmp/helm-cache"
  - name: HELM_CONFIG_HOME
    value: "/tmp/helm-config"
  - name: HELM_DATA_HOME
    value: "/tmp/helm-data"
```

The `ARGOCD_ENV_` prefixed variables are available to the plugin during manifest generation. See [How to Use Build Environment in Custom Plugins](https://oneuptime.com/blog/post/2026-02-26-argocd-build-environment-custom-plugins/view) for detailed usage.

## Proxy Configuration

For repo servers that need to access Git through a proxy:

```yaml
env:
  # HTTP proxy for Git operations
  - name: HTTP_PROXY
    value: "http://proxy.example.com:3128"
  - name: HTTPS_PROXY
    value: "http://proxy.example.com:3128"
  - name: NO_PROXY
    value: "argocd-server,argocd-application-controller,kubernetes.default.svc"
```

## Volume Configuration

The repo server uses temporary storage for Git clones and manifest rendering. Configure the volume size:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 10Gi    # Increase for large repos
```

For very large repositories, consider using a PersistentVolumeClaim:

```yaml
volumes:
  - name: tmp
    persistentVolumeClaim:
      claimName: argocd-repo-server-tmp
```

## Scaling the Repo Server

For production with many applications, scale the repo server horizontally:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
spec:
  replicas: 3    # Scale to multiple replicas
  template:
    spec:
      containers:
        - name: argocd-repo-server
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
```

Each replica handles manifest generation independently. The controller distributes requests across replicas.

## Production Configuration Example

Complete production configuration for a medium-scale deployment:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Logging
  reposerver.log.level: "info"
  reposerver.log.format: "json"

  # Parallelism
  reposerver.parallelism.limit: "20"

  # Timeouts
  controller.repo.server.timeout.seconds: "180"
  reposerver.git.request.timeout: "120s"
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: argocd-repo-server
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
          env:
            - name: ARGOCD_GIT_ATTEMPTS_COUNT
              value: "3"
            - name: ARGOCD_EXEC_TIMEOUT
              value: "180s"
            - name: ARGOCD_ENV_CLUSTER_NAME
              value: "production"
            - name: HELM_CACHE_HOME
              value: "/tmp/helm-cache"
            - name: HELM_CONFIG_HOME
              value: "/tmp/helm-config"
            - name: HELM_DATA_HOME
              value: "/tmp/helm-data"
```

## Monitoring Repo Server Health

Key metrics to watch:

```promql
# Git request duration
argocd_git_request_duration_seconds

# Git request count
argocd_git_request_total

# Requests waiting on repository locks
argocd_repo_pending_request_total

# Parallelism wait duration
argocd_repo_parallelism_wait_duration_seconds
```

```bash
# Check repo server resource usage
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-repo-server

# Check for OOMKilled containers
kubectl describe pods -n argocd -l app.kubernetes.io/name=argocd-repo-server | grep -i OOMKilled

# View repo server logs for errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=100
```

## Troubleshooting Common Issues

**Out of memory during Helm rendering:** Increase memory limits and reduce parallelism:

```yaml
resources:
  limits:
    memory: 8Gi
reposerver.parallelism.limit: "5"
```

**Slow manifest generation:** Check for large Git repos and increase the exec timeout. Consider using Git sparse checkout or splitting large repos.

**Git authentication failures:** Verify proxy settings and credential caching. Check the repo server logs for specific errors:

```bash
kubectl logs -n argocd deployment/argocd-repo-server | grep -i "auth\|credential\|denied"
```

## Summary

The ArgoCD repo server handles the heavy lifting of Git operations and manifest generation. Tuning its environment variables - particularly parallelism limits, timeouts, and resource allocation - is essential for production performance. Start with the parallelism limit based on your application count, set appropriate timeouts for your repository sizes, and scale horizontally when a single replica is not enough. Monitor the key metrics to identify bottlenecks and adjust configuration as your deployment footprint grows.
