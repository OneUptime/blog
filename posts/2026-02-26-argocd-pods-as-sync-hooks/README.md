# How to Use Pods as Sync Hooks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Hooks, POD

Description: Learn how to use bare Kubernetes Pods as ArgoCD sync hooks for simple one-shot tasks where Job overhead is unnecessary.

---

While Jobs are the standard resource for ArgoCD sync hooks, there are situations where a bare Pod is simpler and sufficient. A Pod runs a single container (or a few containers), completes its work, and exits. ArgoCD can track its completion just like a Job.

Using Pods as hooks eliminates the Job controller overhead and is appropriate for simple, non-retryable tasks where you do not need Job features like automatic retries or parallel execution.

## When to Use Pods Instead of Jobs

Use bare Pods when:
- The task is simple and does not need automatic retries
- You want a lighter resource footprint
- The task always succeeds or you handle retries elsewhere
- You need maximum simplicity

Use Jobs when:
- You need automatic retries (`backoffLimit`)
- You need timeout enforcement (`activeDeadlineSeconds`)
- You need parallel execution (`parallelism`)
- You need completion tracking for multiple tasks (`completions`)

## Basic Pod Hook

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: presync-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
spec:
  containers:
    - name: check
      image: curlimages/curl:latest
      command:
        - /bin/sh
        - -c
        - |
          echo "Checking database connectivity..."
          curl -sf http://postgres:5432/ || { echo "Database unavailable"; exit 1; }
          echo "Database is ready"
  restartPolicy: Never
```

The key difference from a Deployment Pod: `restartPolicy: Never`. This tells Kubernetes not to restart the Pod after it completes or fails. ArgoCD reads the Pod's final status to determine success or failure.

## Pod Health Assessment in ArgoCD

ArgoCD determines Pod hook health as:

- **Healthy**: Pod status is `Succeeded` (all containers exited with code 0)
- **Progressing**: Pod is `Running` or `Pending`
- **Degraded**: Pod status is `Failed` (a container exited with non-zero code)

ArgoCD waits for the Pod to reach `Succeeded` or `Failed` before moving to the next phase.

## Practical Examples

### Quick Health Check

A lightweight pre-deployment check:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dep-health-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
spec:
  containers:
    - name: check
      image: curlimages/curl:latest
      command:
        - /bin/sh
        - -c
        - |
          FAILURES=0

          # Check database
          curl -sf http://postgres:5432/ > /dev/null 2>&1 || {
            echo "FAIL: Database unreachable"
            FAILURES=$((FAILURES + 1))
          }

          # Check Redis
          curl -sf http://redis:6379/ > /dev/null 2>&1 || {
            echo "FAIL: Redis unreachable"
            FAILURES=$((FAILURES + 1))
          }

          if [ $FAILURES -gt 0 ]; then
            echo "$FAILURES dependency check(s) failed"
            exit 1
          fi

          echo "All dependencies healthy"
  restartPolicy: Never
```

### Simple Notification

A fire-and-forget notification that does not need retry logic:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: deploy-notify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, HookFailed
spec:
  containers:
    - name: notify
      image: curlimages/curl:latest
      command:
        - /bin/sh
        - -c
        - |
          curl -sf -X POST "$WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d '{"text":"Deployment complete"}' || true
          # Always exit 0 - notification is non-critical
          exit 0
      env:
        - name: WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: slack-webhook
              key: url
  restartPolicy: Never
```

### Configuration Dump

Save the current configuration state before deployment:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-snapshot
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  serviceAccountName: config-reader
  containers:
    - name: snapshot
      image: bitnami/kubectl:latest
      command:
        - /bin/sh
        - -c
        - |
          echo "=== ConfigMaps ==="
          kubectl get configmaps -n my-app -o yaml

          echo "=== Deployments ==="
          kubectl get deployments -n my-app -o yaml

          echo "=== Services ==="
          kubectl get services -n my-app -o yaml

          echo "Configuration snapshot complete"
  restartPolicy: Never
```

### Multi-Container Pod Hook

Pods support multiple containers, which can be useful for hooks that need sidecar services:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: integration-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  initContainers:
    # Wait for the deployed service to be ready
    - name: wait
      image: curlimages/curl:latest
      command:
        - /bin/sh
        - -c
        - |
          for i in $(seq 1 30); do
            curl -sf http://web-app-svc/health && exit 0
            sleep 2
          done
          echo "Service not ready after 60s"
          exit 1
  containers:
    - name: test
      image: myorg/integration-tests:latest
      command: ["./run-quick-tests.sh"]
      env:
        - name: TARGET_URL
          value: "http://web-app-svc:8080"
  restartPolicy: Never
```

## Pod vs Job: Key Differences for Hooks

| Feature | Pod Hook | Job Hook |
|---------|:---:|:---:|
| Automatic retries | No | Yes (backoffLimit) |
| Timeout enforcement | No (Pod runs until killed) | Yes (activeDeadlineSeconds) |
| Parallel execution | No | Yes (parallelism) |
| Completion tracking | Basic (Succeeded/Failed) | Rich (succeeded/failed counts) |
| Resource overhead | Minimal | Slight (Job controller) |
| Cleanup | Manual or hook delete policy | Job TTL or hook delete policy |
| Multiple completions | No | Yes (completions) |

## Adding Timeout to Pod Hooks

Since Pods do not have `activeDeadlineSeconds` like Jobs, you need to implement timeouts yourself:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: timed-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  # Pod-level timeout (Kubernetes 1.28+)
  activeDeadlineSeconds: 120
  containers:
    - name: check
      image: curlimages/curl:latest
      command:
        - /bin/sh
        - -c
        - |
          # Script-level timeout as fallback
          timeout 60 /bin/sh -c '
            echo "Running checks..."
            curl -sf http://api-svc/health || exit 1
            echo "Checks passed"
          '
  restartPolicy: Never
```

Note: Pod-level `activeDeadlineSeconds` was added in Kubernetes 1.28. For older versions, use the `timeout` command within the script.

## Handling Pod Failures

When a Pod hook fails, unlike a Job, there are no automatic retries. The sync fails immediately:

```bash
# Check why the Pod failed
kubectl describe pod presync-check -n my-app

# View the logs
kubectl logs presync-check -n my-app

# If the Pod was killed (OOMKilled, etc.)
kubectl get pod presync-check -n my-app -o jsonpath='{.status.containerStatuses[0].state}'
```

To implement manual retry logic within a Pod:

```yaml
command:
  - /bin/sh
  - -c
  - |
    MAX_RETRIES=3
    for i in $(seq 1 $MAX_RETRIES); do
      echo "Attempt $i of $MAX_RETRIES"
      if curl -sf http://api-svc/health; then
        echo "Success"
        exit 0
      fi
      echo "Failed, waiting 5s..."
      sleep 5
    done
    echo "All attempts failed"
    exit 1
```

## Security Best Practices

Apply the same security practices as Job hooks:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
    - name: hook
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi
```

## When Pods Get Stuck

A Pod hook can get stuck in `Pending` state if:
- No nodes have available resources
- Node affinity/tolerations prevent scheduling
- Image pull takes too long

ArgoCD waits indefinitely for the Pod to complete unless you have a sync timeout:

```bash
# Set a sync timeout to handle stuck Pods
argocd app sync my-app --timeout 300
```

Or monitor and kill manually:

```bash
# Check stuck Pods
kubectl get pods -n my-app -l argocd.argoproj.io/hook=PreSync --field-selector=status.phase=Pending

# Delete a stuck Pod to fail the sync
kubectl delete pod presync-check -n my-app
```

## Summary

Bare Pods work well as ArgoCD sync hooks for simple, non-retryable tasks. They are lighter than Jobs and appropriate for quick health checks, simple notifications, and one-shot operations. For anything that needs automatic retries, timeouts, or parallel execution, use Jobs instead. The choice between Pod and Job hooks comes down to whether you need the Job controller's features or if the simplicity of a bare Pod is sufficient.

For complex deployment workflows combining multiple hooks, see our guide on [how to combine sync waves and hooks for complex deployments](https://oneuptime.com/blog/post/2026-02-26-argocd-combine-waves-hooks-complex-deployments/view).
