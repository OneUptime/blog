# How to Debug Config Management Plugin Errors in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Config Management Plugins, Troubleshooting

Description: A practical guide to diagnosing and fixing Config Management Plugin errors in ArgoCD, covering common failures and debugging techniques.

---

Config Management Plugins extend ArgoCD's capabilities, but they also introduce new failure modes that can be frustrating to debug. Plugin errors often produce cryptic messages, and because the plugin runs inside a sidecar container, you cannot simply exec into the repo-server to test things. This guide provides a systematic approach to debugging CMP errors, covering the most common failures and how to fix them.

## Common Error Messages and What They Mean

### "rpc error: code = Unknown desc = plugin not found"

This means ArgoCD cannot find a plugin matching the name in your Application spec. Causes include:

- The sidecar container is not running
- The plugin name in `plugin.yaml` does not match the name in the Application spec
- The socket file was not created properly

```bash
# Check if the sidecar is running
kubectl get pods -n argocd \
  -l app.kubernetes.io/name=argocd-repo-server \
  -o jsonpath='{range .items[*]}{.status.containerStatuses[*].name}{"\n"}{end}'

# Check if the sidecar is ready
kubectl get pods -n argocd \
  -l app.kubernetes.io/name=argocd-repo-server \
  -o jsonpath='{range .items[*]}{range .status.containerStatuses[*]}{.name}: {.ready}{"\n"}{end}{end}'

# Check sidecar logs for startup errors
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin \
  --tail=50
```

### "rpc error: code = DeadlineExceeded"

The plugin took too long to generate manifests. The default timeout is 90 seconds.

```bash
# Check how long the generate command takes by looking at timestamps
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin \
  --timestamps \
  --tail=100
```

### "failed to generate manifests: rpc error: code = Unknown desc = exit status 1"

The plugin's generate command returned a non-zero exit code. The actual error message should be in stderr.

```bash
# Get the full error from the repo-server logs
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin \
  --tail=200 | grep -i "error\|fail\|panic"

# Also check the main repo-server container
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c argocd-repo-server \
  --tail=200 | grep -i "plugin\|cmp\|error"
```

## Systematic Debugging Approach

### Step 1: Verify the Sidecar Is Running

```bash
# List all containers in the repo-server pod
kubectl describe pod -n argocd \
  -l app.kubernetes.io/name=argocd-repo-server | \
  grep -A5 "Container ID\|State\|Ready\|Restart Count"
```

If the sidecar is in CrashLoopBackOff, check events and logs:

```bash
# Get pod events
kubectl get events -n argocd \
  --field-selector involvedObject.kind=Pod \
  --sort-by='.lastTimestamp' | tail -20

# Get crash logs (previous container instance)
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin \
  --previous
```

### Step 2: Verify the Plugin Configuration

The plugin configuration file must be at exactly `/home/argocd/cmp-server/config/plugin.yaml` inside the sidecar container:

```bash
# Exec into the sidecar to check the plugin config
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  cat /home/argocd/cmp-server/config/plugin.yaml
```

Verify the YAML is valid:

```bash
# Check if the plugin config is valid YAML
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  sh -c 'cat /home/argocd/cmp-server/config/plugin.yaml | head -3'
```

### Step 3: Test the Generate Command Manually

Exec into the sidecar and simulate what ArgoCD does:

```bash
# Get a shell in the sidecar container
kubectl exec -it deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  /bin/sh

# Inside the container, check what tools are available
which helm kustomize sops jb jsonnet 2>/dev/null

# Check if the tools work
helm version 2>&1
kustomize version 2>&1
```

### Step 4: Check Volume Mounts

The sidecar needs specific volume mounts to communicate with the repo-server:

```bash
# Verify volume mounts
kubectl get deployment argocd-repo-server -n argocd \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"\n"}{range .volumeMounts[*]}  {.name} -> {.mountPath}{"\n"}{end}{end}'
```

Required mounts for every CMP sidecar:

| Volume | Mount Path | Purpose |
|--------|-----------|---------|
| var-files | /var/run/argocd | Socket communication |
| plugins | /home/argocd/cmp-server/plugins | Plugin registration |
| cmp-tmp | /tmp | Temporary files |

### Step 5: Check File Permissions

A common issue is permission errors because the sidecar runs as user 999:

```bash
# Check what user the sidecar runs as
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  id

# Check permissions on key directories
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  ls -la /var/run/argocd /home/argocd/cmp-server/plugins /tmp
```

### Step 6: Enable Verbose Logging

Add debug output to your plugin configuration temporarily:

```yaml
# plugin.yaml with debug logging
generate:
  command: [sh, -c]
  args:
    - |
      # Debug: log all environment variables
      echo "=== Environment ===" >&2
      env | sort | grep -E "ARGOCD_|PATH" >&2

      # Debug: log current directory contents
      echo "=== Working Directory ===" >&2
      pwd >&2
      ls -la >&2

      # Debug: log available commands
      echo "=== Available Tools ===" >&2
      which helm kustomize sops 2>&1 >&2

      # Your actual generate command
      set -euxo pipefail  # -x enables command tracing
      helm template my-app . -f values.yaml
```

## Common Plugin Problems and Solutions

### Problem: Plugin Cannot Access External Resources

If your init or generate command needs to download dependencies or contact external services:

```bash
# Test network access from the sidecar
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  sh -c 'wget -qO- https://charts.helm.sh/stable/index.yaml | head -5'

# Check if DNS works
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  nslookup github.com
```

If network access is blocked, check NetworkPolicies:

```bash
# List NetworkPolicies affecting the argocd namespace
kubectl get networkpolicy -n argocd
kubectl describe networkpolicy -n argocd
```

### Problem: Plugin Works for Some Apps but Not Others

This usually means the generate command makes assumptions about the directory structure:

```yaml
generate:
  command: [sh, -c]
  args:
    - |
      # Defensive: check required files exist
      if [ ! -f "Chart.yaml" ]; then
        echo "Error: Chart.yaml not found in $(pwd)" >&2
        echo "Files present:" >&2
        ls -la >&2
        exit 1
      fi

      helm template my-app . -f values.yaml
```

### Problem: Plugin Generates Invalid YAML

The generate command must output valid Kubernetes YAML to stdout. Common mistakes:

- Printing debug messages to stdout instead of stderr
- Missing YAML document separators between resources
- Including non-YAML content in the output

```yaml
generate:
  command: [sh, -c]
  args:
    - |
      # All debug/info messages go to stderr
      echo "Starting generation..." >&2

      # Only valid YAML goes to stdout
      helm template my-app . -f values.yaml

      # If combining multiple outputs, add separators
      echo "---"
      cat additional-resources.yaml
```

### Problem: Plugin Crashes Under Load

When many applications use the same plugin, the sidecar can run out of memory or CPU:

```bash
# Check resource usage
kubectl top pod -n argocd \
  -l app.kubernetes.io/name=argocd-repo-server \
  --containers

# Check for OOMKilled events
kubectl get events -n argocd \
  --field-selector reason=OOMKilling \
  --sort-by='.lastTimestamp'
```

Increase resource limits:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

## Using ArgoCD's Built-in Debugging

ArgoCD provides some built-in tools for debugging applications:

```bash
# Get detailed app status including plugin errors
argocd app get my-app --show-params

# Force a refresh to trigger manifest generation
argocd app get my-app --refresh

# Get the diff to see what the plugin generates
argocd app diff my-app
```

## Checking the ArgoCD Server Logs

Sometimes the error originates in the API server or controller, not the plugin:

```bash
# Check the API server logs
kubectl logs deployment/argocd-server \
  -n argocd \
  --tail=100 | grep -i "error\|plugin\|cmp"

# Check the application controller logs
kubectl logs deployment/argocd-application-controller \
  -n argocd \
  --tail=100 | grep -i "error\|plugin\|manifest"
```

## Summary

Debugging CMP plugins follows a systematic path: first verify the sidecar is running and properly configured, then test the generate command manually, check volume mounts and permissions, and finally add verbose logging to trace the exact failure point. Most issues fall into a few categories - missing tools, permission errors, network access problems, or invalid YAML output. For ongoing monitoring of your ArgoCD plugin health, check out [OneUptime's monitoring capabilities](https://oneuptime.com) to catch plugin failures before they affect your deployments.
