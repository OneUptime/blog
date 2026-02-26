# How to Increase ArgoCD Log Verbosity for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Debugging, Logging

Description: Learn how to increase ArgoCD log verbosity for each component to get detailed debug output when troubleshooting sync failures, authentication issues, and performance problems.

---

Default ArgoCD log levels show info and above, which is fine for normal operations but insufficient when you need to dig into why something is failing. Increasing log verbosity reveals the internal decision-making process of each ArgoCD component, including gRPC calls, Git operations, manifest rendering details, and reconciliation logic. Here is how to do it for each component.

## Understanding ArgoCD Log Levels

ArgoCD supports these log levels, from least to most verbose:

| Level | Description |
|-------|-------------|
| `fatal` | Only shows fatal errors (component crashes) |
| `error` | Shows errors only |
| `warn` | Shows warnings and above |
| `info` | Default level, shows operational information |
| `debug` | Shows detailed internal operations |
| `trace` | Most verbose, shows everything including gRPC payloads |

## Method 1: Using argocd-cmd-params-cm ConfigMap

The recommended way to change log levels for all components:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # API Server log level
  server.log.level: "debug"
  # Application Controller log level
  controller.log.level: "debug"
  # Repo Server log level
  reposerver.log.level: "debug"
  # ApplicationSet Controller log level
  applicationsetcontroller.log.level: "debug"
  # Notifications Controller log level
  notificationscontroller.log.level: "debug"
```

Apply and restart:

```bash
# Apply the ConfigMap changes
kubectl apply -f argocd-cmd-params-cm.yaml

# Restart all components to pick up the new log level
kubectl rollout restart deployment -n argocd \
  argocd-server \
  argocd-application-controller \
  argocd-repo-server

# Wait for rollout
kubectl rollout status deployment -n argocd argocd-server
kubectl rollout status deployment -n argocd argocd-application-controller
kubectl rollout status deployment -n argocd argocd-repo-server
```

## Method 2: Using kubectl patch

For quick changes without creating YAML files:

```bash
# Set debug level for API server only
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "server.log.level": "debug"
  }
}'

# Set debug level for controller only
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "controller.log.level": "debug"
  }
}'

# Set debug level for repo server only
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "reposerver.log.level": "debug"
  }
}'

# Set all components to debug
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "server.log.level": "debug",
    "controller.log.level": "debug",
    "reposerver.log.level": "debug"
  }
}'
```

Remember to restart the affected components after changing the ConfigMap.

## Method 3: Setting Log Format to JSON

Combine increased verbosity with JSON format for easier parsing:

```bash
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "server.log.level": "debug",
    "server.log.format": "json",
    "controller.log.level": "debug",
    "controller.log.format": "json",
    "reposerver.log.level": "debug",
    "reposerver.log.format": "json"
  }
}'

# Restart all components
kubectl rollout restart deployment -n argocd \
  argocd-server argocd-application-controller argocd-repo-server
```

## What Debug Logs Reveal Per Component

### API Server Debug Logs

With debug level, the API server shows:
- Full request/response details for API calls
- RBAC evaluation decisions
- SSO token validation steps
- Webhook payload processing
- gRPC connection details

```bash
# Watch debug logs for authentication issues
kubectl logs -n argocd deploy/argocd-server -f | grep -E "level=debug.*auth|level=debug.*rbac"

# Watch debug logs for webhook processing
kubectl logs -n argocd deploy/argocd-server -f | grep -E "level=debug.*webhook"
```

### Application Controller Debug Logs

The controller debug logs reveal:
- Reconciliation cycle details for each application
- Diff computation between live and desired state
- Sync wave and hook ordering decisions
- Health assessment logic
- Resource tracking operations

```bash
# Watch reconciliation for a specific app
kubectl logs -n argocd deploy/argocd-application-controller -f | \
  grep -E "level=debug.*my-app-name"

# Watch sync operations
kubectl logs -n argocd deploy/argocd-application-controller -f | \
  grep -E "level=debug.*(sync|reconcil)"
```

### Repo Server Debug Logs

The repo server debug logs show:
- Git clone and fetch operations with timings
- Helm template rendering details
- Kustomize build steps
- Manifest generation timing
- Cache hits and misses

```bash
# Watch Git operations
kubectl logs -n argocd deploy/argocd-repo-server -f | \
  grep -E "level=debug.*(git|clone|fetch)"

# Watch manifest generation
kubectl logs -n argocd deploy/argocd-repo-server -f | \
  grep -E "level=debug.*(helm|kustomize|manifest)"
```

## Enabling gRPC Logging

For deep protocol-level debugging, enable gRPC verbose logging:

```bash
# Set gRPC log verbosity via environment variable
kubectl set env deployment/argocd-server -n argocd \
  GRPC_GO_LOG_VERBOSITY_LEVEL=99 \
  GRPC_GO_LOG_SEVERITY_LEVEL=info
```

This shows detailed gRPC call traces between components. Use this only for specific debugging sessions as it generates massive log volumes.

## Targeted Debug Logging

Instead of setting everything to debug, target specific subsystems:

```bash
# Enable debug only for Git operations in repo server
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "reposerver.log.level": "debug"
  }
}'
kubectl rollout restart deployment -n argocd argocd-repo-server
```

Then filter the debug output:

```bash
# Only show Git-related debug messages
kubectl logs -n argocd deploy/argocd-repo-server -f --tail=0 | \
  grep "level=debug" | grep -i "git"
```

## Dex Server Log Verbosity

Dex has its own logging configuration:

```yaml
# In argocd-cm ConfigMap, within dex.config
dex.config: |
  logger:
    level: debug
    format: json
  connectors:
    - type: oidc
      id: okta
      name: Okta
      config:
        issuer: https://your-org.okta.com
        clientID: your-client-id
        clientSecret: $dex.okta.clientSecret
```

```bash
# Apply and restart Dex
kubectl rollout restart deployment argocd-dex-server -n argocd

# Watch Dex debug logs
kubectl logs -n argocd deploy/argocd-dex-server -f
```

## Safety Considerations

Debug logging significantly increases log volume and can impact performance. Follow these practices:

```bash
# 1. Set a timer to remind yourself to revert
echo "Reverting ArgoCD log level in 30 minutes"
sleep 1800 && kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "server.log.level": "info",
    "controller.log.level": "info",
    "reposerver.log.level": "info"
  }
}' && kubectl rollout restart deployment -n argocd \
  argocd-server argocd-application-controller argocd-repo-server &

# 2. Monitor disk usage while debugging
kubectl exec -n argocd deploy/argocd-server -- df -h /tmp

# 3. Only enable debug on the component you need
# Do NOT set all components to debug in production unless necessary
```

## Reverting to Default Log Levels

Always revert after debugging:

```bash
# Revert all components to info level
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge -p '{
  "data": {
    "server.log.level": "info",
    "server.log.format": "text",
    "controller.log.level": "info",
    "controller.log.format": "text",
    "reposerver.log.level": "info",
    "reposerver.log.format": "text"
  }
}'

# Restart all components
kubectl rollout restart deployment -n argocd \
  argocd-server argocd-application-controller argocd-repo-server

# Verify the change
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml | grep log
```

## Debug Logging Workflow Script

```bash
#!/bin/bash
# debug-logging.sh - Enable/disable ArgoCD debug logging
# Usage: ./debug-logging.sh [enable|disable] [component]

ACTION=${1:-"enable"}
COMPONENT=${2:-"all"}
NAMESPACE="argocd"

enable_debug() {
    local comp=$1
    case $comp in
        server)
            kubectl patch configmap argocd-cmd-params-cm -n $NAMESPACE --type merge \
              -p '{"data":{"server.log.level":"debug"}}'
            kubectl rollout restart deployment argocd-server -n $NAMESPACE
            ;;
        controller)
            kubectl patch configmap argocd-cmd-params-cm -n $NAMESPACE --type merge \
              -p '{"data":{"controller.log.level":"debug"}}'
            kubectl rollout restart deployment argocd-application-controller -n $NAMESPACE
            ;;
        repo)
            kubectl patch configmap argocd-cmd-params-cm -n $NAMESPACE --type merge \
              -p '{"data":{"reposerver.log.level":"debug"}}'
            kubectl rollout restart deployment argocd-repo-server -n $NAMESPACE
            ;;
        all)
            kubectl patch configmap argocd-cmd-params-cm -n $NAMESPACE --type merge \
              -p '{"data":{"server.log.level":"debug","controller.log.level":"debug","reposerver.log.level":"debug"}}'
            kubectl rollout restart deployment -n $NAMESPACE \
              argocd-server argocd-application-controller argocd-repo-server
            ;;
    esac
    echo "Debug logging enabled for: $comp"
}

disable_debug() {
    kubectl patch configmap argocd-cmd-params-cm -n $NAMESPACE --type merge \
      -p '{"data":{"server.log.level":"info","controller.log.level":"info","reposerver.log.level":"info"}}'
    kubectl rollout restart deployment -n $NAMESPACE \
      argocd-server argocd-application-controller argocd-repo-server
    echo "Debug logging disabled for all components"
}

if [ "$ACTION" = "enable" ]; then
    enable_debug $COMPONENT
elif [ "$ACTION" = "disable" ]; then
    disable_debug
else
    echo "Usage: $0 [enable|disable] [server|controller|repo|all]"
fi
```

## Summary

Increasing ArgoCD log verbosity is done through the `argocd-cmd-params-cm` ConfigMap. Set the log level to `debug` for the specific component you are troubleshooting, restart that component, and use `grep` or `jq` (with JSON format) to filter the verbose output. Always revert to `info` level when you are done, as debug logging can significantly increase log volume and impact performance. Target your debugging by only enabling verbose logs on the component that is relevant to your issue.
