# How to Configure ArgoCD Component Log Levels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Logging, Observability

Description: Learn how to configure and manage log levels for each ArgoCD component, from debug troubleshooting to production-optimized logging.

---

ArgoCD consists of several components that each produce their own logs - the API server, application controller, repo server, Dex, and Redis. Controlling the log verbosity for each component independently is essential for effective troubleshooting without drowning in noise. This guide covers how to configure log levels, log formats, and component-specific logging strategies.

## ArgoCD Log Level Options

ArgoCD supports the following log levels, from most verbose to least:

- **debug** - Detailed information for diagnosing problems
- **info** - General operational messages (default)
- **warn** - Warning conditions that might need attention
- **error** - Error conditions that need immediate attention

Each component can be configured independently, so you can run the API server at `info` level while setting the application controller to `debug` when troubleshooting sync issues.

## Configuring Log Levels via Command-Line Arguments

The simplest way to set log levels is through command-line arguments on each component's deployment:

### API Server Log Level

```yaml
# Set debug log level on the ArgoCD API server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          command:
            - argocd-server
            - --loglevel
            - debug
```

### Application Controller Log Level

```yaml
# Set debug log level on the application controller
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-application-controller
          command:
            - argocd-application-controller
            - --loglevel
            - debug
```

### Repo Server Log Level

```yaml
# Set debug log level on the repo server
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
          command:
            - argocd-repo-server
            - --loglevel
            - debug
```

## Configuring Log Levels via Helm

With the ArgoCD Helm chart, you can set log levels for all components in your values file:

```yaml
# values.yaml - log level configuration for all components
server:
  # API server log level
  logLevel: info
  # Log format: text or json
  logFormat: json

controller:
  # Application controller log level
  logLevel: info
  logFormat: json

repoServer:
  # Repo server log level
  logLevel: info
  logFormat: json

dex:
  # Dex log level
  logLevel: info
```

Apply with Helm:

```bash
# Apply log level configuration
helm upgrade argocd argo/argo-cd \
  --namespace argocd \
  -f values.yaml
```

## Configuring Log Format

ArgoCD supports two log formats: `text` (human-readable) and `json` (machine-parseable). For production environments shipping logs to a centralized system, JSON is strongly recommended:

```yaml
# Set JSON log format for all components
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          command:
            - argocd-server
            - --logformat
            - json
            - --loglevel
            - info
```

Here is what each format looks like:

Text format:
```
time="2026-02-26T10:15:30Z" level=info msg="Syncing application" app=my-app
```

JSON format:
```json
{"level":"info","msg":"Syncing application","app":"my-app","time":"2026-02-26T10:15:30Z"}
```

JSON format is easier to parse with tools like jq and integrates better with log management platforms like ELK, Loki, and OneUptime.

## Dynamic Log Level Changes

You can change ArgoCD log levels at runtime without restarting pods using the ArgoCD CLI:

```bash
# Set API server log level to debug at runtime
argocd admin settings set --loglevel debug

# Check current log level
kubectl logs -n argocd deploy/argocd-server --tail=5 | head -1
```

Alternatively, you can use the Kubernetes API to patch the deployment:

```bash
# Dynamically change repo server log level to debug
kubectl set env deploy/argocd-repo-server -n argocd \
  ARGOCD_LOG_LEVEL=debug

# Change back to info when done troubleshooting
kubectl set env deploy/argocd-repo-server -n argocd \
  ARGOCD_LOG_LEVEL=info
```

## Component-Specific Logging Strategies

Each component has different logging concerns. Here are recommendations for each:

### API Server Logging

The API server handles user authentication, RBAC, and API requests. Key log entries to watch for:

```bash
# Filter API server logs for authentication events
kubectl logs -n argocd deploy/argocd-server | grep -i "auth"

# Filter for RBAC denials
kubectl logs -n argocd deploy/argocd-server | grep -i "permission denied"

# Filter for webhook events
kubectl logs -n argocd deploy/argocd-server | grep -i "webhook"
```

Recommended production level: `info`. Switch to `debug` when investigating authentication or RBAC issues.

### Application Controller Logging

The controller is the most important component for troubleshooting sync and health issues:

```bash
# Filter controller logs for sync operations
kubectl logs -n argocd deploy/argocd-application-controller | grep -i "sync"

# Filter for health assessment
kubectl logs -n argocd deploy/argocd-application-controller | grep -i "health"

# Filter for resource comparison (diff) operations
kubectl logs -n argocd deploy/argocd-application-controller | grep -i "diff\|comparison"
```

Recommended production level: `info`. Switch to `debug` when investigating why applications are not syncing or showing incorrect health status.

### Repo Server Logging

The repo server handles Git operations and manifest generation:

```bash
# Filter for Git clone/fetch operations
kubectl logs -n argocd deploy/argocd-repo-server | grep -i "git"

# Filter for Helm template operations
kubectl logs -n argocd deploy/argocd-repo-server | grep -i "helm"

# Filter for Kustomize operations
kubectl logs -n argocd deploy/argocd-repo-server | grep -i "kustomize"
```

Recommended production level: `info`. Switch to `debug` when investigating manifest generation failures or Git connectivity issues.

## Configuring Log Levels via ConfigMap

ArgoCD also supports configuring log levels through the `argocd-cmd-params-cm` ConfigMap:

```yaml
# Configure log levels via ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Server log level
  server.log.level: "info"
  # Server log format
  server.log.format: "json"
  # Controller log level
  controller.log.level: "info"
  # Controller log format
  controller.log.format: "json"
  # Repo server log level
  reposerver.log.level: "info"
  # Repo server log format
  reposerver.log.format: "json"
```

After modifying the ConfigMap, restart the affected components:

```bash
# Restart all ArgoCD components to pick up new log levels
kubectl rollout restart deploy -n argocd -l app.kubernetes.io/part-of=argocd
```

## Log Rotation and Resource Management

In production, debug-level logging can generate significant log volume. Configure resource limits appropriately:

```yaml
# Resource limits considering log volume
server:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  # Increase ephemeral storage for log-heavy debugging sessions
  containerSecurityContext:
    allowPrivilegeEscalation: false
```

If using a log shipper that reads from stdout (like Fluentd or Fluent Bit), make sure the node has sufficient disk space for the log buffer. Consider setting up log rotation at the container runtime level:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

## Structured Logging for Better Analysis

When using JSON log format, you can perform powerful queries. Here are examples with jq:

```bash
# Count log entries by level in the last 1000 lines
kubectl logs -n argocd deploy/argocd-server --tail=1000 | \
  jq -r '.level' | sort | uniq -c | sort -rn

# Find all error logs with their messages
kubectl logs -n argocd deploy/argocd-application-controller --tail=5000 | \
  jq -r 'select(.level=="error") | .msg'

# Find slow sync operations (useful for performance tuning)
kubectl logs -n argocd deploy/argocd-application-controller --tail=5000 | \
  jq -r 'select(.msg | contains("sync")) | "\(.time) \(.msg)"'
```

## Summary

Effective log level management in ArgoCD means running each component at the appropriate verbosity for your environment. Use `info` for production with `json` format for machine parsing. Switch to `debug` temporarily when troubleshooting specific issues. Configure log levels through CLI arguments, Helm values, or the `argocd-cmd-params-cm` ConfigMap. For shipping these logs to centralized systems, see our guides on [shipping ArgoCD logs to ELK](https://oneuptime.com/blog/post/2026-02-26-argocd-logs-elk-opensearch/view) and [shipping ArgoCD logs to Loki](https://oneuptime.com/blog/post/2026-02-26-argocd-logs-loki/view).
