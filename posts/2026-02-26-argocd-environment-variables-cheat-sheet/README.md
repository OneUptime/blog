# ArgoCD Environment Variables Cheat Sheet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration, DevOps

Description: A comprehensive cheat sheet covering all important ArgoCD environment variables for the API server, application controller, repo server, and notification components.

---

ArgoCD components are configured through a combination of ConfigMaps, command-line flags, and environment variables. Environment variables are especially useful when you need to tune performance, change timeouts, or configure behavior that is not exposed through the standard ConfigMaps. This cheat sheet covers the most important environment variables for every ArgoCD component.

## How to Set Environment Variables

Environment variables can be set in the deployment manifests for each ArgoCD component. If you are using Helm, you can add them through the `env` values:

```yaml
# Helm values.yaml

controller:
  env:
    - name: ARGOCD_RECONCILIATION_TIMEOUT
      value: "300s"

server:
  env:
    - name: ARGOCD_SERVER_ROOTPATH
      value: "/argocd"

repoServer:
  env:
    - name: ARGOCD_EXEC_TIMEOUT
      value: "180s"
```

Or set them directly in the Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  template:
    metadata:
      labels:
        app.kubernetes.io/name: argocd-server
    spec:
      containers:
        - name: argocd-server
          image: quay.io/argoproj/argocd:latest
          env:
            - name: ARGOCD_SERVER_ROOTPATH
              value: "/argocd"
```

## API Server Environment Variables

The API server handles the UI and API requests.

```bash
# Root path for reverse proxy setups
ARGOCD_SERVER_ROOTPATH="/argocd"

# Base URL for the ArgoCD server
ARGOCD_SERVER_BASEHREF="/argocd"

# Disable TLS on the server (when behind a TLS-terminating proxy)
ARGOCD_SERVER_INSECURE="true"

# Static files directory for the UI
ARGOCD_SERVER_STATIC_ASSETS="/shared/app"

# Redis server address
REDIS_SERVER="argocd-redis:6379"

# Enable gzip compression for API responses
ARGOCD_SERVER_ENABLE_GZIP="true"

# Maximum number of cookie sessions
ARGOCD_SESSION_MAX_CACHE_SIZE="1000"

# Session failure window in seconds
ARGOCD_SESSION_FAILURE_WINDOW_SECONDS="300"

# Listen address for the API server
ARGOCD_SERVER_LISTEN_ADDRESS="0.0.0.0"

# Repo server RPC timeout in seconds
ARGOCD_SERVER_REPO_SERVER_TIMEOUT_SECONDS="60"

# Repo server address
ARGOCD_SERVER_REPO_SERVER="argocd-repo-server:8081"

# Disable client authentication (for testing only)
ARGOCD_SERVER_DISABLE_AUTH="false"

# Log level
ARGOCD_SERVER_LOG_LEVEL="info"

# X-Frame-Options header value
ARGOCD_SERVER_X_FRAME_OPTIONS="sameorigin"

# Content Security Policy header
ARGOCD_SERVER_CONTENT_SECURITY_POLICY="frame-ancestors 'self';"
```

## Application Controller Environment Variables

The application controller handles syncing and reconciliation.

```bash
# How often to check for out-of-sync apps (seconds)
ARGOCD_RECONCILIATION_TIMEOUT="180s"

# Number of concurrent application reconciliation workers
ARGOCD_CONTROLLER_REPLICAS="1"

# Shard number for HA setups
ARGOCD_CONTROLLER_SHARD="0"

# Status processors - how many apps are checked in parallel
ARGOCD_APPLICATION_CONTROLLER_STATUS_PROCESSORS="20"

# Operation processors - how many sync operations run in parallel
ARGOCD_APPLICATION_CONTROLLER_OPERATION_PROCESSORS="10"

# Self-heal timeout in seconds
ARGOCD_APPLICATION_CONTROLLER_SELF_HEAL_TIMEOUT_SECONDS="5"

# Repo server address
ARGOCD_APPLICATION_CONTROLLER_REPO_SERVER="argocd-repo-server:8081"

# Redis address
REDIS_SERVER="argocd-redis:6379"

# Additional namespaces where Application resources can be reconciled
ARGOCD_APPLICATION_NAMESPACES="team-a,team-b"

# Log level (debug, info, warn, error)
ARGOCD_APPLICATION_CONTROLLER_LOGLEVEL="info"

# Log format (text, json)
ARGOCD_APPLICATION_CONTROLLER_LOGFORMAT="text"

# Enable hard resync (forces full state comparison)
ARGOCD_HARD_RECONCILIATION_TIMEOUT="0"

# Kubernetes API client throughput
ARGOCD_K8S_CLIENT_QPS="50"
ARGOCD_K8S_CLIENT_BURST="100"

# App state cache expiration
ARGOCD_APP_STATE_CACHE_EXPIRATION="1h"

# Enable server-side diff
ARGOCD_APPLICATION_CONTROLLER_SERVER_SIDE_DIFF="true"
```

## Repo Server Environment Variables

The repo server generates Kubernetes manifests from Git repositories.

```bash
# Execution timeout for Helm, Kustomize, etc.
ARGOCD_EXEC_TIMEOUT="90s"

# Git request timeout
ARGOCD_GIT_REQUEST_TIMEOUT="60s"

# Parallelism limit for manifest generation
ARGOCD_REPO_SERVER_PARALLELISM_LIMIT="0"

# Listen address
ARGOCD_REPO_SERVER_LISTEN_ADDRESS="0.0.0.0"

# Metrics listen address
ARGOCD_REPO_SERVER_METRICS_LISTEN_ADDRESS="0.0.0.0"

# Redis address for caching
REDIS_SERVER="argocd-redis:6379"

# Log level
ARGOCD_REPO_SERVER_LOGLEVEL="info"

# Enable Git submodule support
ARGOCD_GIT_MODULES_ENABLED="true"

# Git retry configuration
ARGOCD_GIT_ATTEMPTS_COUNT="5"
ARGOCD_GIT_RETRY_DURATION="100ms"
ARGOCD_GIT_RETRY_FACTOR="2"

# Helm index cache duration
ARGOCD_HELM_INDEX_CACHE_DURATION="12h"

# Helm user agent
ARGOCD_HELM_USER_AGENT="argocd"

# Git ls-remote parallelism limit
ARGOCD_GIT_LS_REMOTE_PARALLELISM_LIMIT="0"

# Disable TLS on the repo server gRPC endpoint
ARGOCD_REPO_SERVER_DISABLE_TLS="false"
```

## Redis Environment Variables

```bash
# Redis address used by all components
REDIS_SERVER="argocd-redis:6379"

# Redis password (if authentication is enabled)
REDIS_PASSWORD=""

# Redis database number
REDISDB="0"

# Redis retry count
REDIS_RETRY_COUNT="3"

# Redis compression
REDIS_COMPRESSION="gzip"
```

## Notification Controller Environment Variables

```bash
# Additional namespaces that the notification controller should watch
ARGOCD_APPLICATION_NAMESPACES="team-a,team-b"

# Log level
ARGOCD_NOTIFICATIONS_CONTROLLER_LOGLEVEL="info"

# Log format
ARGOCD_NOTIFICATIONS_CONTROLLER_LOGFORMAT="text"

# Self-service notification enabled
ARGOCD_NOTIFICATION_CONTROLLER_SELF_SERVICE_NOTIFICATION_ENABLED="false"

# Processing workers
ARGOCD_NOTIFICATION_CONTROLLER_PROCESSORS_COUNT="1"
```

## Performance Tuning Environment Variables

When managing hundreds of applications, performance tuning becomes critical. Here are the key variables to adjust:

```yaml
# For the application controller
controller:
  env:
    # Increase workers for large clusters
    - name: ARGOCD_APPLICATION_CONTROLLER_STATUS_PROCESSORS
      value: "50"
    - name: ARGOCD_APPLICATION_CONTROLLER_OPERATION_PROCESSORS
      value: "25"
    # Increase Kubernetes API throughput
    - name: ARGOCD_K8S_CLIENT_QPS
      value: "100"
    - name: ARGOCD_K8S_CLIENT_BURST
      value: "200"
    # Reduce reconciliation frequency for stability
    - name: ARGOCD_RECONCILIATION_TIMEOUT
      value: "300s"

# For the repo server
repoServer:
  env:
    # Allow more time for complex manifests
    - name: ARGOCD_EXEC_TIMEOUT
      value: "180s"
    # Limit parallel operations to prevent OOM
    - name: ARGOCD_REPO_SERVER_PARALLELISM_LIMIT
      value: "10"
    # Increase git timeout for large repos
    - name: ARGOCD_GIT_REQUEST_TIMEOUT
      value: "120s"
```

## Proxy and Network Environment Variables

Standard environment variables for network configuration:

```bash
# HTTP proxy
HTTP_PROXY="http://proxy.example.com:8080"

# HTTPS proxy
HTTPS_PROXY="http://proxy.example.com:8080"

# No proxy exceptions
NO_PROXY="argocd-repo-server,argocd-redis,argocd-dex-server,argocd-server,.cluster.local"
```

## Debugging with Environment Variables

Enable verbose logging to troubleshoot issues:

```yaml
# Set debug logging on all components
controller:
  env:
    - name: ARGOCD_APPLICATION_CONTROLLER_LOGLEVEL
      value: "debug"

server:
  env:
    - name: ARGOCD_SERVER_LOG_LEVEL
      value: "debug"

repoServer:
  env:
    - name: ARGOCD_REPO_SERVER_LOGLEVEL
      value: "debug"
```

Check the logs after enabling debug:

```bash
# Controller logs
kubectl logs -n argocd deployment/argocd-application-controller --tail=100

# Server logs
kubectl logs -n argocd deployment/argocd-server --tail=100

# Repo server logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=100
```

## Using Environment Variables from Secrets

For sensitive values, reference Kubernetes secrets:

```yaml
env:
  - name: REDIS_PASSWORD
    valueFrom:
      secretKeyRef:
        name: argocd-redis
        key: auth
  - name: REDIS_USERNAME
    valueFrom:
      secretKeyRef:
        name: argocd-redis
        key: username
```

This cheat sheet covers the most commonly needed environment variables. For a deeper look at ArgoCD installation and configuration, see our guide on [ArgoCD installation and configuration](https://oneuptime.com/blog/post/2026-02-02-argocd-installation-configuration/view) and [ArgoCD high availability](https://oneuptime.com/blog/post/2026-02-02-argocd-high-availability/view).
