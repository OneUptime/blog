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
  template:
    spec:
      containers:
        - name: argocd-server
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
ARGOCD_SERVER_STATICASSETS="/shared/app"

# Redis server address
ARGOCD_SERVER_REDIS="argocd-redis:6379"

# Enable gzip compression for API responses
ARGOCD_SERVER_ENABLE_GZIP="true"

# Maximum number of cookie sessions
ARGOCD_SESSION_MAX_CACHE_SIZE="1000"

# Session duration in hours
ARGOCD_SESSION_EXPIRY="24h"

# Listen address for the API server
ARGOCD_SERVER_LISTEN_ADDRESS="0.0.0.0"

# Port for the API server
ARGOCD_SERVER_PORT="8080"

# Metrics port
ARGOCD_SERVER_METRICS_PORT="8083"

# Repo server address
ARGOCD_SERVER_REPO_SERVER="argocd-repo-server:8081"

# Disable client authentication (for testing only)
ARGOCD_SERVER_DISABLE_AUTH="false"

# Enable RBAC log enforcement
ARGOCD_SERVER_RBAC_LOG_ENFORCE_ENABLE="true"

# OIDC TLS insecure skip verify (not recommended for production)
ARGOCD_SERVER_OIDC_TLS_INSECURE_SKIP_VERIFY="false"

# X-Frame-Options header value
ARGOCD_SERVER_X_FRAME_OPTIONS="sameorigin"

# Content Security Policy header
ARGOCD_SERVER_CONTENT_SECURITY_POLICY="frame-ancestors 'self'"
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
ARGOCD_CONTROLLER_STATUS_PROCESSORS="20"

# Operation processors - how many sync operations run in parallel
ARGOCD_CONTROLLER_OPERATION_PROCESSORS="10"

# Self-heal timeout in seconds
ARGOCD_CONTROLLER_SELF_HEAL_TIMEOUT_SECONDS="5"

# Repo server address
ARGOCD_CONTROLLER_REPO_SERVER="argocd-repo-server:8081"

# Redis address
ARGOCD_CONTROLLER_REDIS="argocd-redis:6379"

# Namespace where ArgoCD is installed
ARGOCD_CONTROLLER_NAMESPACE="argocd"

# Log level (debug, info, warn, error)
ARGOCD_CONTROLLER_LOGLEVEL="info"

# Log format (text, json)
ARGOCD_CONTROLLER_LOGFORMAT="text"

# Enable hard resync (forces full state comparison)
ARGOCD_HARD_RESYNC_TIMEOUT="0"

# Kubectl parallelism limit
ARGOCD_K8S_CLIENT_QPS="50"
ARGOCD_K8S_CLIENT_BURST="100"

# App state cache expiration
ARGOCD_APP_STATE_CACHE_EXPIRATION="1h"

# Diff cache enabled
ARGOCD_CONTROLLER_DIFF_CACHE_ENABLED="true"
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

# Port
ARGOCD_REPO_SERVER_PORT="8081"

# Metrics port
ARGOCD_REPO_SERVER_METRICS_PORT="8084"

# Redis address for caching
ARGOCD_REPO_SERVER_REDIS="argocd-redis:6379"

# Log level
ARGOCD_REPO_SERVER_LOGLEVEL="info"

# Enable Git submodule support
ARGOCD_GIT_MODULES_ENABLED="true"

# Git retry configuration
ARGOCD_GIT_RETRY_MAX="5"
ARGOCD_GIT_RETRY_DURATION="100ms"
ARGOCD_GIT_RETRY_FACTOR="2"

# Disable Helm manifest caching
ARGOCD_HELM_CACHE_ENABLED="true"

# Helm version override
HELM_VERSION="v3"

# Kustomize build options
KUSTOMIZE_BUILD_OPTIONS="--enable-alpha-plugins"

# TLS configuration for repo server
ARGOCD_REPO_SERVER_TLS_ENABLED="true"
ARGOCD_REPO_SERVER_TLS_CERT_FILE="/app/config/server.crt"
ARGOCD_REPO_SERVER_TLS_KEY_FILE="/app/config/server.key"
```

## Redis Environment Variables

```bash
# Redis address used by all components
REDIS_SERVER="argocd-redis:6379"

# Redis password (if authentication is enabled)
REDIS_PASSWORD=""

# Redis database number
REDIS_DB="0"

# Redis connection pool size
REDIS_MAX_RETRIES="3"

# Enable Redis TLS
REDIS_TLS_ENABLED="false"
```

## Notification Controller Environment Variables

```bash
# Namespace for the notification controller
ARGOCD_NOTIFICATIONS_CONTROLLER_NAMESPACE="argocd"

# Log level
ARGOCD_NOTIFICATIONS_CONTROLLER_LOGLEVEL="info"

# Log format
ARGOCD_NOTIFICATIONS_CONTROLLER_LOGFORMAT="text"

# Self-service notification enabled
ARGOCD_NOTIFICATIONS_CONTROLLER_SELF_SERVICE_NOTIFICATION_ENABLED="false"

# Metrics port
ARGOCD_NOTIFICATIONS_CONTROLLER_METRICS_PORT="9001"

# Processing workers
ARGOCD_NOTIFICATIONS_CONTROLLER_PROCESSING_WORKERS="1"
```

## Performance Tuning Environment Variables

When managing hundreds of applications, performance tuning becomes critical. Here are the key variables to adjust:

```yaml
# For the application controller
controller:
  env:
    # Increase workers for large clusters
    - name: ARGOCD_CONTROLLER_STATUS_PROCESSORS
      value: "50"
    - name: ARGOCD_CONTROLLER_OPERATION_PROCESSORS
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
    - name: ARGOCD_CONTROLLER_LOGLEVEL
      value: "debug"

server:
  env:
    - name: ARGOCD_SERVER_LOGLEVEL
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
  - name: ARGOCD_SERVER_OIDC_CLIENT_SECRET
    valueFrom:
      secretKeyRef:
        name: argocd-oidc
        key: client-secret
```

This cheat sheet covers the most commonly needed environment variables. For a deeper look at ArgoCD installation and configuration, see our guide on [ArgoCD installation and configuration](https://oneuptime.com/blog/post/2026-02-02-argocd-installation-configuration/view) and [ArgoCD high availability](https://oneuptime.com/blog/post/2026-02-02-argocd-high-availability/view).
