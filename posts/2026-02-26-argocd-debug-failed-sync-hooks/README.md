# How to Debug Failed Sync Hooks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Sync Hooks

Description: Learn how to systematically debug failed sync hooks in ArgoCD by examining logs, events, resource status, and common failure patterns.

---

Your ArgoCD sync failed because a hook did not complete. The application shows "Failed" status, and you need to figure out why. Was it a migration that hit a schema error? A smoke test that timed out? A notification webhook that returned a 403?

Debugging failed sync hooks is a regular part of operating ArgoCD. This guide walks through a systematic approach to identifying and fixing hook failures.

## Step 1: Identify Which Hook Failed

Start by checking the sync operation details:

```bash
# View the sync operation result
argocd app get my-app --show-operation
```

The output shows which phase failed and which resources had issues:

```text
Operation:          Sync
Sync Revision:      abc1234
Phase:              Failed
Message:            one or more synchronization tasks are not valid

GROUP  KIND  NAMESPACE  NAME           STATUS  HEALTH   HOOK      MESSAGE
       Job   my-app     db-migrate     Failed  Degraded PreSync   job failed
apps   Deployment  my-app  web-app     Synced  Healthy
```

This tells you the PreSync hook `db-migrate` failed.

## Step 2: Check the Hook Resource

Look at the Job status directly:

```bash
# Get the Job status
kubectl get job db-migrate -n my-app -o yaml

# Quick overview
kubectl describe job db-migrate -n my-app
```

The Job description shows:
- How many attempts were made (`backoffLimit`)
- Whether the Job timed out (`activeDeadlineSeconds`)
- Conditions showing success or failure reasons

```bash
# Look for the condition
kubectl get job db-migrate -n my-app -o jsonpath='{.status.conditions[*]}'
```

Common Job conditions:
- `Complete`: Job finished successfully
- `Failed`: Job exhausted backoffLimit or hit activeDeadlineSeconds
- `Suspended`: Job was suspended (manual or by quota)

## Step 3: Examine Pod Logs

The real diagnostic information is in the Pod logs:

```bash
# Find the hook Pods
kubectl get pods -n my-app -l job-name=db-migrate

# View logs from the most recent Pod
kubectl logs -n my-app -l job-name=db-migrate --tail=100

# If the Pod crashed and restarted, check previous logs
kubectl logs -n my-app -l job-name=db-migrate --previous

# If there are multiple Pods (from retries), check each
kubectl get pods -n my-app -l job-name=db-migrate
kubectl logs -n my-app db-migrate-xxxxx
kubectl logs -n my-app db-migrate-yyyyy
```

## Step 4: Check Pod Events

Pod events reveal issues that happen before your code runs:

```bash
# Describe the Pod for events
kubectl describe pod -n my-app -l job-name=db-migrate
```

Common event messages:
- `Failed to pull image`: Image does not exist or registry auth failed
- `Back-off pulling image`: Repeated image pull failures
- `FailedScheduling`: No nodes available (resource constraints)
- `OOMKilled`: Container ran out of memory
- `Error`: Container exited with non-zero code

## Step 5: Check Namespace Events

Namespace-level events can reveal issues not visible at the Pod level:

```bash
# Recent events in the namespace
kubectl get events -n my-app --sort-by='.lastTimestamp' | tail -20

# Filter for warning events
kubectl get events -n my-app --field-selector=type=Warning --sort-by='.lastTimestamp'
```

## Common Failure Patterns

### Image Pull Failures

The hook image does not exist or cannot be pulled:

```text
Events:
  Type     Reason     Age   Message
  ----     ------     ----  -------
  Warning  Failed     1m    Failed to pull image "myorg/api:v42": rpc error
  Warning  Failed     1m    Error: ImagePullBackOff
```

**Fix**: Verify the image exists and the image pull secret is configured:

```bash
# Check if the image exists
docker manifest inspect myorg/api:v42

# Check image pull secrets in the namespace
kubectl get secrets -n my-app -o name | grep pull

# Verify the secret is referenced in the Pod spec or ServiceAccount
kubectl get serviceaccount default -n my-app -o yaml
```

### OOMKilled

The hook container exceeded its memory limit:

```text
Events:
  Type     Reason    Age   Message
  ----     ------    ----  -------
  Warning  OOMKilled  30s  Container migrate was OOMKilled
```

**Fix**: Increase the memory limit:

```yaml
resources:
  requests:
    memory: 256Mi
  limits:
    memory: 1Gi  # Increased from 512Mi
```

### Timeout (ActiveDeadlineSeconds)

The Job exceeded its deadline:

```bash
kubectl get job db-migrate -n my-app -o jsonpath='{.status.conditions}'
# [{"type":"Failed","reason":"DeadlineExceeded"}]
```

**Fix**: Either optimize the hook task or increase the deadline:

```yaml
spec:
  activeDeadlineSeconds: 600  # Increased from 300
```

### Database Connection Failures

The migration cannot connect to the database:

```text
kubectl logs -n my-app -l job-name=db-migrate
# psycopg2.OperationalError: could not connect to server: Connection refused
```

**Fix**: Check database connectivity from the hook Pod's perspective:

```bash
# Run a debug Pod in the same namespace
kubectl run debug --rm -it --image=postgres:15 -n my-app -- \
  psql -h postgres -U admin -d mydb -c "SELECT 1"

# Check the database service
kubectl get svc postgres -n my-app
kubectl get endpoints postgres -n my-app
```

### Permission Denied

The hook does not have RBAC permissions for the operations it performs:

```text
Error from server (Forbidden): configmaps is forbidden: User "system:serviceaccount:my-app:default"
cannot list resource "configmaps" in API group "" in the namespace "my-app"
```

**Fix**: Create a ServiceAccount with appropriate permissions and reference it in the hook:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hook-sa
  namespace: my-app
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: hook-role
  namespace: my-app
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: hook-binding
  namespace: my-app
subjects:
  - kind: ServiceAccount
    name: hook-sa
roleRef:
  kind: Role
  name: hook-role
  apiGroup: rbac.authorization.k8s.io
---
# Reference in the hook Job
apiVersion: batch/v1
kind: Job
metadata:
  name: config-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      serviceAccountName: hook-sa
      containers:
        - name: check
          image: bitnami/kubectl:latest
          command: ["kubectl", "get", "configmaps", "-n", "my-app"]
      restartPolicy: Never
```

### Script Errors

The hook script has a bug or encounters unexpected data:

```text
kubectl logs -n my-app -l job-name=db-migrate
# Traceback (most recent call last):
#   File "manage.py", line 22, in <module>
#     execute_from_command_line(sys.argv)
# django.db.utils.ProgrammingError: relation "users_profile" already exists
```

**Fix**: Fix the migration script in Git, push, and re-sync. For the immediate issue, you might need to manually fix the database state.

## Debugging Hooks That Were Already Deleted

If you used `HookSucceeded` or `HookFailed` delete policies, the hook resource might be gone. In this case:

```bash
# Check ArgoCD application controller logs for hook details
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=200 | grep "my-app"

# Check ArgoCD events
kubectl get events -n argocd --sort-by='.lastTimestamp'
```

To prevent this in the future, use `BeforeHookCreation` instead so hook resources persist until the next sync:

```yaml
argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

Or combine policies:

```yaml
argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
```

## Reproducing Hook Failures Locally

Sometimes you need to run the hook manually to debug it:

```bash
# Create the Job manually (without the hook annotation)
kubectl create -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: debug-migrate
  namespace: my-app
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myorg/api:v42
          command: ["python", "manage.py", "migrate", "--no-input"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
      restartPolicy: Never
  backoffLimit: 0
EOF

# Watch the logs
kubectl logs -f -n my-app -l job-name=debug-migrate

# Clean up
kubectl delete job debug-migrate -n my-app
```

Or run an interactive debug session:

```bash
# Start an interactive shell with the same image
kubectl run debug-hook --rm -it \
  --image=myorg/api:v42 \
  --namespace=my-app \
  --env="DATABASE_URL=$(kubectl get secret db-credentials -n my-app -o jsonpath='{.data.url}' | base64 -d)" \
  -- /bin/sh

# Inside the shell, try the migration manually
python manage.py migrate --no-input
```

## Prevention: Making Hooks More Reliable

1. **Add health checks to hooks**: Before running the main task, verify dependencies are available.

2. **Set appropriate timeouts**: Use `activeDeadlineSeconds` to prevent runaway hooks.

3. **Use retry limits wisely**: Set `backoffLimit` based on the type of failure you expect.

4. **Log verbosely**: Hook logs are your primary debugging tool. Make them detailed.

5. **Test hooks locally**: Run the hook command in a local container or test cluster before committing.

## Summary

Debugging failed sync hooks follows a consistent pattern: identify which hook failed, check the Job status, read the Pod logs, examine events, and trace the root cause. Most failures fall into a few categories - image pull issues, resource limits, connectivity problems, permissions, and script errors. Use `BeforeHookCreation` delete policy to ensure hook resources are always available for debugging, and build hooks with verbose logging to make diagnosis faster.
