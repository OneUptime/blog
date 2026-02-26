# Understanding ArgoCD argocd-cmd-params-cm: Every Key Explained

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration, Performance

Description: A complete reference to every key in the ArgoCD argocd-cmd-params-cm ConfigMap, covering server flags, controller tuning, repo server settings, and performance optimization.

---

The `argocd-cmd-params-cm` ConfigMap controls the command-line parameters passed to ArgoCD components at startup. Unlike `argocd-cm` which handles runtime configuration, this ConfigMap controls how the ArgoCD server, application controller, and repo server behave at a fundamental level. Changes to this ConfigMap require a pod restart to take effect.

## Location and Restart Requirement

```bash
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml
```

After modifying this ConfigMap, restart the affected component:

```bash
# Restart all components
kubectl rollout restart deployment -n argocd

# Or restart specific components
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout restart deployment argocd-repo-server -n argocd
kubectl rollout restart statefulset argocd-application-controller -n argocd
```

## ArgoCD Server Parameters

### server.insecure

Disable TLS on the ArgoCD server. Used when TLS is terminated at the Ingress or load balancer:

```yaml
data:
  server.insecure: "true"
```

### server.basehref

Base href for the ArgoCD UI when running behind a reverse proxy with a subpath:

```yaml
data:
  server.basehref: "/argocd"
```

### server.rootpath

Root path for the ArgoCD API server:

```yaml
data:
  server.rootpath: "/argocd"
```

### server.staticassets

Path to static UI assets:

```yaml
data:
  server.staticassets: "/shared/app"
```

### server.disable.auth

Disable authentication entirely (dangerous - for testing only):

```yaml
data:
  server.disable.auth: "false"
```

### server.enable.gzip

Enable gzip compression for API responses:

```yaml
data:
  server.enable.gzip: "true"
```

### server.x.frame.options

Set the X-Frame-Options header for the UI:

```yaml
data:
  server.x.frame.options: "sameorigin"    # or "deny"
```

### server.content.security.policy

Set Content-Security-Policy header:

```yaml
data:
  server.content.security.policy: "frame-ancestors 'self'"
```

### server.repo.server.timeout.seconds

Timeout for repo server calls:

```yaml
data:
  server.repo.server.timeout.seconds: "60"
```

### server.repo.server.plaintext

Use plaintext (no TLS) for repo server communication:

```yaml
data:
  server.repo.server.plaintext: "true"
```

### server.repo.server.strict.tls

Enforce strict TLS verification for repo server:

```yaml
data:
  server.repo.server.strict.tls: "false"
```

### server.login.attempts.ratelimit

Rate limit login attempts to prevent brute force:

```yaml
data:
  server.login.attempts.ratelimit: "0"    # 0 = disabled
```

### server.app.state.cache.expiration

Cache duration for application state:

```yaml
data:
  server.app.state.cache.expiration: "1h"
```

## Application Controller Parameters

### controller.status.processors

Number of concurrent status processing workers:

```yaml
data:
  controller.status.processors: "20"    # Default: 20
```

Increase this for large installations with many applications.

### controller.operation.processors

Number of concurrent sync operation workers:

```yaml
data:
  controller.operation.processors: "10"    # Default: 10
```

### controller.self.heal.timeout.seconds

How long to wait before reverting manual changes (self-heal):

```yaml
data:
  controller.self.heal.timeout.seconds: "5"    # Default: 5
```

### controller.repo.server.timeout.seconds

Timeout for the controller communicating with the repo server:

```yaml
data:
  controller.repo.server.timeout.seconds: "60"    # Default: 60
```

### controller.repo.server.plaintext

Use plaintext for controller to repo server communication:

```yaml
data:
  controller.repo.server.plaintext: "true"
```

### controller.repo.server.strict.tls

Enforce strict TLS for controller to repo server:

```yaml
data:
  controller.repo.server.strict.tls: "false"
```

### controller.resource.health.persist

Persist resource health status to the Application resource:

```yaml
data:
  controller.resource.health.persist: "true"
```

### controller.sharding.algorithm

Algorithm for distributing applications across controller replicas:

```yaml
data:
  # Options: legacy, round-robin, consistent-hashing
  controller.sharding.algorithm: "round-robin"
```

### controller.kubectl.parallelism.limit

Limit concurrent kubectl operations:

```yaml
data:
  controller.kubectl.parallelism.limit: "20"    # Default: 20
```

### controller.log.format

Log format for the controller:

```yaml
data:
  controller.log.format: "json"    # or "text"
```

### controller.log.level

Log verbosity level:

```yaml
data:
  controller.log.level: "info"    # debug, info, warn, error
```

### controller.app.state.cache.expiration

Duration to cache application state in the controller:

```yaml
data:
  controller.app.state.cache.expiration: "1h"
```

### controller.default.cache.expiration

Default cache TTL for the controller:

```yaml
data:
  controller.default.cache.expiration: "24h"
```

## Repo Server Parameters

### reposerver.parallelism.limit

Maximum number of concurrent manifest generation requests:

```yaml
data:
  reposerver.parallelism.limit: "0"    # 0 = unlimited
```

### reposerver.log.format

Log format for the repo server:

```yaml
data:
  reposerver.log.format: "json"
```

### reposerver.log.level

Log verbosity for the repo server:

```yaml
data:
  reposerver.log.level: "info"
```

### reposerver.enable.git.submodule

Enable Git submodule support:

```yaml
data:
  reposerver.enable.git.submodule: "true"
```

### reposerver.git.request.timeout

Timeout for Git operations:

```yaml
data:
  reposerver.git.request.timeout: "120"    # seconds
```

### reposerver.git.lsremote.parallelism.limit

Concurrent Git ls-remote operations:

```yaml
data:
  reposerver.git.lsremote.parallelism.limit: "0"    # 0 = unlimited
```

### reposerver.max.combined.directory.manifests.size

Maximum size for combined directory manifests:

```yaml
data:
  reposerver.max.combined.directory.manifests.size: "10M"
```

### reposerver.plugin.tar.exclusions

File patterns to exclude when sending to config management plugins:

```yaml
data:
  reposerver.plugin.tar.exclusions: "node_modules,.git"
```

## Redis Parameters

### redis.server

Redis server address:

```yaml
data:
  redis.server: "argocd-redis:6379"
```

### redis.compression

Enable Redis compression:

```yaml
data:
  redis.compression: "gzip"    # or "none"
```

### redis.db

Redis database number:

```yaml
data:
  redis.db: "0"
```

### redis.username and redis.password

Redis authentication (better to use a Secret reference):

```yaml
data:
  redis.username: ""
  redis.password: ""
```

### redis.sentinels

Redis Sentinel endpoints for high availability:

```yaml
data:
  redis.sentinels: "redis-sentinel-0:26379,redis-sentinel-1:26379,redis-sentinel-2:26379"
```

### redis.sentinel.master

Redis Sentinel master name:

```yaml
data:
  redis.sentinel.master: "mymaster"
```

## ApplicationSet Controller Parameters

### applicationsetcontroller.policy

Default sync policy for ApplicationSet-generated applications:

```yaml
data:
  # Options: sync, create-only, create-update, create-delete
  applicationsetcontroller.policy: "sync"
```

### applicationsetcontroller.log.level

Log level for the ApplicationSet controller:

```yaml
data:
  applicationsetcontroller.log.level: "info"
```

### applicationsetcontroller.enable.progressive.syncs

Enable progressive sync for ApplicationSets:

```yaml
data:
  applicationsetcontroller.enable.progressive.syncs: "true"
```

## Notifications Controller Parameters

### notificationscontroller.log.level

Log level for the notifications controller:

```yaml
data:
  notificationscontroller.log.level: "info"
```

### notificationscontroller.log.format

Log format:

```yaml
data:
  notificationscontroller.log.format: "json"
```

## Performance Tuning Example

Here is a tuned configuration for a large-scale ArgoCD installation managing 500+ applications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Server optimization
  server.insecure: "true"
  server.enable.gzip: "true"
  server.repo.server.timeout.seconds: "120"

  # Controller scaling
  controller.status.processors: "50"
  controller.operation.processors: "25"
  controller.kubectl.parallelism.limit: "40"
  controller.self.heal.timeout.seconds: "5"
  controller.repo.server.timeout.seconds: "120"
  controller.log.format: "json"

  # Repo server optimization
  reposerver.parallelism.limit: "50"
  reposerver.git.request.timeout: "180"
  reposerver.log.format: "json"

  # Redis compression
  redis.compression: "gzip"
```

## Summary

The `argocd-cmd-params-cm` ConfigMap is your primary tool for tuning ArgoCD performance and behavior at the component level. Unlike `argocd-cm`, changes here require pod restarts. Focus on the controller processor counts and repo server parallelism limits for performance tuning, and use the server settings for ingress and security configuration. For runtime configuration that does not require restarts, see the [argocd-cm](https://oneuptime.com/blog/post/2026-02-26-understanding-argocd-cm-configmap-every-key-explained/view) guide.
