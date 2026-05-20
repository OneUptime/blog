# How to Handle Plugin Timeouts in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Config Management Plugins, Performance

Description: Learn how to configure and troubleshoot plugin timeouts in ArgoCD when manifest generation takes too long in CMP sidecar plugins.

---

When an ArgoCD Config Management Plugin takes too long to generate manifests, the request times out and the application sync fails with a `DeadlineExceeded` error. This is one of the most common CMP issues, especially with plugins that download dependencies, decrypt secrets, or render complex templates. Understanding how timeouts work and how to configure them properly is essential for running CMP plugins in production.

## Default Timeout Behavior

ArgoCD has two timeout layers that matter for CMP sidecar plugins. The API server and application controller have repo-server RPC timeouts, which default to 60 seconds. The CMP command execution timeout is controlled by `ARGOCD_EXEC_TIMEOUT` on the CMP sidecar and defaults to 90 seconds. Each CMP command, such as `init` and `generate`, is timed independently. If the repo-server RPC deadline or the CMP command deadline is exceeded, ArgoCD returns an error:

```text
rpc error: code = DeadlineExceeded desc = context deadline exceeded
```

The repo-server RPC timeout is enforced by the ArgoCD components calling the repo-server, while `ARGOCD_EXEC_TIMEOUT` is enforced by the CMP sidecar process running `argocd-cmp-server`. Even if your plugin's shell script would eventually complete, ArgoCD can terminate the command after the execution deadline.

```mermaid
sequenceDiagram
    participant RS as Repo Server
    participant CMP as CMP Plugin
    participant RPC as Repo RPC Timeout (60s)
    participant Exec as Command Timeout (90s)

    RS->>CMP: Start init
    activate Exec
    CMP->>CMP: Download dependencies (30s)
    CMP-->>RS: Init complete
    deactivate Exec
    RS->>CMP: Start generate
    activate RPC
    activate Exec
    CMP->>CMP: Render templates (70s)
    RPC->>RS: Deadline exceeded!
    RS-->>RS: Return error
    deactivate RPC
    deactivate Exec
```

## Configuring the Timeout

### Global Timeout Setting

For CMP sidecars, increase both the repo-server RPC timeout and the CMP command execution timeout. Configure the repo-server RPC timeout in `argocd-cmd-params-cm`, and set `ARGOCD_EXEC_TIMEOUT` on the CMP sidecar container:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Increase repo-server RPC timeouts to 180 seconds
  server.repo.server.timeout.seconds: "180"
  controller.repo.server.timeout.seconds: "180"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: my-custom-plugin
          env:
            # Increase CMP command execution timeout to 180 seconds
            - name: ARGOCD_EXEC_TIMEOUT
              value: "180s"
```

If you are using Helm to deploy ArgoCD:

```yaml
# values.yaml for ArgoCD Helm chart

repoServer:
  extraContainers:
    - name: cmp-my-plugin
      command:
        - /var/run/argocd/argocd-cmp-server
      image: my-registry/argocd-cmp-plugin:v1.0
      env:
        - name: ARGOCD_EXEC_TIMEOUT
          value: "180s"

configs:
  params:
    server.repo.server.timeout.seconds: "180"
    controller.repo.server.timeout.seconds: "180"
```

### What Timeout Value to Choose

The right timeout depends on what your plugin does:

| Plugin Type | Typical Duration | Recommended Timeout |
|-------------|-----------------|-------------------|
| Simple template rendering | 1-5s | 90s (default) |
| Helm with dependencies | 10-30s | 120s |
| SOPS decryption with KMS | 5-15s | 120s |
| jsonnet-bundler install + render | 30-60s | 180s |
| Complex multi-step pipelines | 60-120s | 300s |

Setting the timeout too high can mask performance problems. Setting it too low causes unnecessary failures. Measure your plugin's actual execution time before choosing a value.

## Diagnosing Timeout Issues

### Measure Plugin Execution Time

First, figure out how long your plugin actually takes:

```bash
# Get into the sidecar and time the generate command
kubectl exec -it deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  sh -c 'time (cd /tmp/test-repo && /path/to/generate-script.sh)'
```

Or add timing to your plugin temporarily:

```yaml
generate:
  command: [sh, -c]
  args:
    - |
      START=$(date +%s)

      # Your actual generation logic
      helm dependency build . 2>/dev/null
      helm template my-app . -f values.yaml

      END=$(date +%s)
      echo "Generation took $((END - START)) seconds" >&2
```

### Check Logs for Timeout Events

```bash
# Look for timeout errors in repo-server logs
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c argocd-repo-server \
  --tail=200 | grep -i "deadline\|timeout\|exceeded"

# Check the plugin sidecar for incomplete operations
kubectl logs deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin \
  --tail=200 | grep -i "killed\|signal\|abort"
```

## Optimizing Plugin Performance to Avoid Timeouts

Instead of just increasing the timeout, optimize your plugin to run faster.

### Cache Dependencies

The biggest time waster is downloading dependencies on every generation. Use persistent volumes or init containers to cache them:

```yaml
# Cache Helm chart dependencies
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: helm-plugin
          image: my-registry/argocd-cmp-helm:v1.0
          volumeMounts:
            # Persistent Helm cache
            - name: helm-cache
              mountPath: /home/argocd/.cache/helm
            - name: helm-repos
              mountPath: /home/argocd/.config/helm
      volumes:
        # Use emptyDir for pod-level caching
        # Use PVC for persistent caching across restarts
        - name: helm-cache
          emptyDir: {}
        - name: helm-repos
          emptyDir: {}
```

### Skip Unnecessary Init Steps

Make your init command conditional:

```yaml
init:
  command: [sh, -c]
  args:
    - |
      # Only download dependencies if not already present
      if [ -f "Chart.yaml" ] && [ ! -d "charts/" ]; then
        helm dependency build .
      else
        echo "Dependencies already present, skipping init" >&2
      fi
```

### Parallelize Where Possible

If your plugin does multiple independent operations, run them in parallel:

```yaml
generate:
  command: [sh, -c]
  args:
    - |
      set -euo pipefail

      # Decrypt multiple files in parallel
      find . -name "*.enc.yaml" | xargs -P 4 -I {} \
        sh -c 'sops --decrypt "$1" > "${1%.enc.yaml}.yaml"' _ {}

      # Now render
      kustomize build .
```

### Reduce Network Calls

Network operations (KMS calls, dependency downloads, registry authentication) are the most common source of slowness:

```yaml
generate:
  command: [sh, -c]
  args:
    - |
      # Use a local age key file so decryption does not depend on
      # a network KMS call during manifest generation
      export SOPS_AGE_KEY_FILE=/home/argocd/.config/sops/age/keys.txt

      # Batch decrypt all files
      for f in secrets/*.yaml; do
        sops --decrypt "$f"
        echo "---"
      done
```

## Handling Intermittent Timeouts

Sometimes timeouts happen only occasionally due to network latency or resource contention. ArgoCD supports retry logic at the application level:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  syncPolicy:
    retry:
      limit: 3
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 1m
```

This retries failed sync operations up to 3 times with exponential backoff. It can help if a timeout happens during an automated sync operation, but it does not fix systematic performance problems.

## Monitoring Plugin Duration

Track repo-server request time with ArgoCD metrics to catch slowdowns before they cause timeouts. ArgoCD does not expose a dedicated manifest generation duration metric in current releases, but you can enable the repo-server gRPC handling histogram and filter for `GenerateManifest`:

```bash
# Enable gRPC duration histograms on the repo-server
ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true

# Query it with PromQL
histogram_quantile(0.99,
  rate(grpc_server_handling_seconds_bucket{
    grpc_service="repository.RepoServerService",
    grpc_method="GenerateManifest"
  }[5m])
)
```

Set up an alert for when generation time approaches your timeout:

```yaml
# Prometheus alert rule
groups:
  - name: argocd-cmp
    rules:
      - alert: SlowManifestGeneration
        expr: |
          histogram_quantile(0.95,
            rate(grpc_server_handling_seconds_bucket{
              grpc_service="repository.RepoServerService",
              grpc_method="GenerateManifest"
            }[5m])
          ) > 60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD manifest generation is slow (p95 > 60s)"
          description: "Consider increasing timeout or optimizing plugins"
```

## Platform-Specific Timeout Considerations

### AWS KMS

If using AWS KMS for SOPS decryption, KMS API calls can be slow when there is throttling. Check CloudWatch for KMS throttling events and consider requesting a quota increase.

### Helm Repository Index

Large Helm repository indexes (like the Bitnami repo) take time to download and parse. Use the `--repository-cache` flag or pin specific chart versions to avoid index downloads.

### Git Clone Time

For large repositories, the git clone or fetch phase is handled by the repo-server before the plugin runs. That work is not part of `ARGOCD_EXEC_TIMEOUT`, but it can still contribute to repo-server RPC timeouts. Consider using smaller repositories, plugin tar exclusions, or `argocd.argoproj.io/manifest-generate-paths` for CMP applications in monorepos.

## Summary

Plugin timeouts in ArgoCD are controlled by the repo-server RPC timeout settings and the CMP sidecar's `ARGOCD_EXEC_TIMEOUT`, which defaults to 90 seconds. When your plugins need more time, increase both timeout layers to reasonable values based on actual measurements. But more importantly, optimize your plugins to be faster - cache dependencies, skip unnecessary init steps, parallelize operations, and minimize network calls. Monitor repo-server `GenerateManifest` gRPC duration with Prometheus metrics to catch slowdowns before they turn into timeout failures.
