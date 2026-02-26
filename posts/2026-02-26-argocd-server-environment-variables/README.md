# How to Configure ArgoCD Server Environment Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Server Configuration, DevOps

Description: Learn how to configure ArgoCD API server environment variables to control server behavior, logging, TLS settings, authentication options, and performance tuning.

---

The ArgoCD API server is the central component that handles the web UI, CLI requests, and API calls. Its behavior is controlled through a combination of ConfigMaps and environment variables set on the server deployment. Environment variables provide a direct way to configure server behavior without modifying ConfigMaps.

This guide covers the most important environment variables for the ArgoCD API server and how to set them.

## How Environment Variables Work in ArgoCD Server

ArgoCD server reads configuration from two sources:

1. **ConfigMaps** (`argocd-cm`, `argocd-cmd-params-cm`): For application-level settings
2. **Environment variables**: For runtime behavior, feature flags, and low-level tuning

Environment variables are set on the `argocd-server` Deployment:

```yaml
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
          env:
            - name: ARGOCD_SERVER_INSECURE
              value: "true"
            - name: ARGOCD_LOG_LEVEL
              value: "info"
```

Alternatively, use the `argocd-cmd-params-cm` ConfigMap, which ArgoCD translates to environment variables:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
  server.log.level: "info"
```

Both approaches achieve the same result. The ConfigMap approach is cleaner for GitOps because it separates configuration from deployment manifests.

## Essential Server Environment Variables

### TLS and Insecure Mode

```yaml
# Disable TLS on the server (when TLS is terminated at ingress/load balancer)
- name: ARGOCD_SERVER_INSECURE
  value: "true"

# Or via ConfigMap
data:
  server.insecure: "true"
```

This is one of the most commonly set variables. When you terminate TLS at your ingress controller or load balancer, the ArgoCD server does not need to handle TLS itself.

### Base URL and Root Path

```yaml
# Set the base URL for ArgoCD (used in links, redirects)
- name: ARGOCD_SERVER_BASEHREF
  value: "/argocd"

# Set the root path (when behind a reverse proxy with path prefix)
- name: ARGOCD_SERVER_ROOTPATH
  value: "/argocd"

# Or via ConfigMap
data:
  server.basehref: "/argocd"
  server.rootpath: "/argocd"
```

These are needed when ArgoCD runs behind a reverse proxy at a non-root path.

### Logging

```yaml
# Set log level (debug, info, warn, error)
- name: ARGOCD_LOG_LEVEL
  value: "info"

# Set log format (text or json)
- name: ARGOCD_LOG_FORMAT
  value: "json"

# Or via ConfigMap
data:
  server.log.level: "info"
  server.log.format: "json"
```

Use `json` format for production environments where logs are collected by Fluentd or similar tools. Use `debug` level only temporarily for troubleshooting.

### gRPC Settings

```yaml
# Set the gRPC maximum message size (in bytes)
# Default is 100MB, increase for large applications
- name: ARGOCD_SERVER_MAX_GRPC_MESSAGE_SIZE
  value: "209715200"    # 200MB

# Or via ConfigMap
data:
  server.grpc.max-size-mb: "200"
```

Increase this if you have applications with very large manifests that exceed the default 100MB gRPC message limit.

### Connection Settings

```yaml
# Set the server listen port (default 8080 for HTTP, 8083 for metrics)
- name: ARGOCD_SERVER_LISTEN_ADDRESS
  value: "0.0.0.0"

# Set the server port
data:
  server.listen.address: "0.0.0.0"
```

### RBAC and Auth Settings

```yaml
# Disable built-in admin user
data:
  admin.enabled: "false"

# Set default RBAC policy
data:
  policy.default: "role:readonly"
```

### Repository Server Connection

```yaml
# Set the repo server address
- name: ARGOCD_SERVER_REPO_SERVER
  value: "argocd-repo-server:8081"

# Set repo server connection timeout
data:
  server.repo.server.timeout.seconds: "60"
```

## Advanced Server Configuration

### Rate Limiting

Protect the API server from excessive requests:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable rate limiting
  server.enable.gzip: "true"
```

### Session Management

Configure how user sessions are handled:

```yaml
data:
  # Session token expiration (default 24h)
  server.session.maxage: "86400"
```

### Static Assets and UI

```yaml
data:
  # Enable or disable the UI
  server.staticassets: "/shared/app"

  # Disable the UI entirely (API-only mode)
  server.disable.auth: "false"
```

## Setting Environment Variables with Helm

If you installed ArgoCD with Helm, set environment variables through values:

```yaml
# values.yaml for argo-cd Helm chart
server:
  extraEnv:
    - name: ARGOCD_SERVER_INSECURE
      value: "true"

  # Or use the configmap
  config:
    server.insecure: "true"
    server.log.level: "info"
    server.log.format: "json"
```

## Setting Environment Variables with Kustomize

For Kustomize-based installations:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

patches:
  - target:
      kind: Deployment
      name: argocd-server
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: ARGOCD_SERVER_INSECURE
          value: "true"
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: ARGOCD_LOG_LEVEL
          value: "info"

  - target:
      kind: ConfigMap
      name: argocd-cmd-params-cm
    patch: |
      - op: add
        path: /data
        value:
          server.insecure: "true"
          server.log.level: "info"
          server.log.format: "json"
```

## Environment Variables from Secrets

For sensitive configuration, reference Kubernetes Secrets:

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
            # Load from secret
            - name: ARGOCD_SERVER_DEX_SERVER_PLAINTEXT
              valueFrom:
                secretKeyRef:
                  name: argocd-server-secrets
                  key: dex-server-url
```

## Verifying Environment Variables

After setting variables, verify they are applied:

```bash
# Check the running container's environment
kubectl exec -n argocd deployment/argocd-server -- env | grep ARGOCD

# Check the ConfigMap
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml

# Check server logs for configuration messages
kubectl logs -n argocd deployment/argocd-server | head -50

# Verify the server is using the expected settings
argocd admin settings
```

## Restart After Changes

Environment variable changes require a pod restart to take effect:

```bash
# Restart the server deployment
kubectl rollout restart deployment/argocd-server -n argocd

# Watch the rollout
kubectl rollout status deployment/argocd-server -n argocd
```

ConfigMap changes referenced through the `argocd-cmd-params-cm` also require a restart because the values are read at startup time.

## Common Production Configuration

Here is a typical production configuration combining the most important settings:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # TLS terminated at load balancer
  server.insecure: "true"

  # JSON logging for log aggregation
  server.log.level: "info"
  server.log.format: "json"

  # Increase gRPC message size for large apps
  server.grpc.max-size-mb: "200"

  # Enable gzip compression
  server.enable.gzip: "true"

  # Base URL configuration
  server.basehref: "/"
  server.rootpath: ""
```

## Troubleshooting

**Server not starting after env change:** Check for typos in variable names. Invalid variables are silently ignored but may cause unexpected defaults.

```bash
kubectl describe deployment/argocd-server -n argocd | grep -A5 "Environment"
```

**UI not loading:** If you set `server.insecure` but your ingress still expects TLS from the backend, the connection will fail. Make sure your ingress configuration matches the server TLS setting.

**Login redirect issues:** Verify `server.basehref` and `server.rootpath` match your ingress path configuration.

## Summary

ArgoCD server environment variables control critical aspects of the API server's behavior, from TLS handling to logging to gRPC message sizes. Use the `argocd-cmd-params-cm` ConfigMap for a clean GitOps approach, or set environment variables directly on the deployment for more granular control. Always restart the server after configuration changes and verify the settings are applied correctly. A well-configured server is the foundation for a reliable ArgoCD installation.
