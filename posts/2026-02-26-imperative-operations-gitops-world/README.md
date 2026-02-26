# How to Handle Imperative Operations in a GitOps World

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Operations, Best Practices

Description: Learn how to handle imperative Kubernetes operations like scaling, restarts, and one-off commands within a GitOps workflow using ArgoCD without breaking declarative state.

---

GitOps is declarative. You define the desired state in Git, and ArgoCD ensures the cluster matches. But real-world operations are not always declarative. Sometimes you need to restart a pod. Scale a deployment temporarily. Run a database migration manually. Execute a one-off batch job.

These imperative operations do not fit neatly into the GitOps model, and handling them incorrectly leads to drift, confusion, and frustrated engineers who start bypassing GitOps entirely. Here is how to handle each common imperative scenario properly.

## The Fundamental Tension

GitOps says: "Everything in the cluster should match what is in Git."

Operations reality says: "I need to restart this pod right now because it is leaking memory."

If you restart the pod with `kubectl delete pod`, nothing changes in Git. ArgoCD may or may not detect this as drift depending on the resource type. The operation is invisible to the audit trail.

The challenge is making imperative actions work within a declarative system without undermining the system's guarantees.

## Scenario 1: Restarting Deployments

The most common imperative operation is restarting pods. The traditional approach is `kubectl rollout restart deployment/app`, which updates the pod template annotation to trigger a rollout.

**GitOps-compatible approach**: Use ArgoCD's built-in resource actions:

```bash
# Restart a deployment through ArgoCD
argocd app actions run my-app restart --kind Deployment --resource-name my-deployment
```

Or through the ArgoCD UI, navigate to the deployment resource and click "Restart." This performs the restart through ArgoCD, which means it appears in the ArgoCD event log.

**Even better approach**: If you need restarts regularly, consider adding a restart annotation that you control through Git:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        # Change this value to trigger a restart
        kubectl.kubernetes.io/restartedAt: "2026-02-26T10:00:00Z"
    spec:
      containers:
      - name: app
        image: my-app:v1.2.3
```

When you need a restart, update the timestamp in Git. ArgoCD syncs the change and triggers a rollout. This gives you a Git audit trail for every restart.

## Scenario 2: Temporary Scaling

You need to scale up a deployment temporarily to handle a traffic spike. In traditional operations, you would run `kubectl scale deployment/app --replicas=10`.

**Problem**: If the Git manifest says `replicas: 3` and you scale to 10 with kubectl, ArgoCD will revert it back to 3 if self-heal is enabled.

**Solution 1**: If you use a Horizontal Pod Autoscaler (HPA), tell ArgoCD to ignore the replicas field:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas
  source:
    repoURL: https://github.com/org/gitops-repo
    path: apps/my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

This is the correct approach when an HPA manages scaling. The replicas field in Git serves as the initial value, and the HPA takes over from there.

**Solution 2**: For manual emergency scaling, update the replica count in Git:

```bash
# Emergency scale-up through Git
cd gitops-repo
yq e '.spec.replicas = 10' -i apps/my-app/deployment.yaml
git add . && git commit -m "Emergency scale-up: traffic spike" && git push
```

After the emergency, commit the scale-down:

```bash
yq e '.spec.replicas = 3' -i apps/my-app/deployment.yaml
git add . && git commit -m "Scale down: traffic normalized" && git push
```

Both changes are in Git history with timestamps and commit messages explaining why.

## Scenario 3: One-Off Jobs

You need to run a data migration, a cleanup script, or a one-time batch operation. These are inherently imperative and do not belong in the continuous reconciliation loop.

**Approach: Use ArgoCD sync hooks with a manual trigger**:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration-v42
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: my-app:v1.2.3
        command: ["./scripts/migrate.sh"]
        args: ["--version", "42"]
      restartPolicy: Never
  backoffLimit: 1
```

The job runs before the application sync. When the migration is no longer needed, remove it from Git. The `BeforeHookCreation` delete policy ensures old job instances are cleaned up.

**Alternative: Use a separate Job repository**:

```yaml
# jobs/2026-02-26-data-cleanup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-cleanup-20260226
  namespace: production
spec:
  ttlSecondsAfterFinished: 86400  # Auto-delete after 24 hours
  template:
    spec:
      containers:
      - name: cleanup
        image: my-app:v1.2.3
        command: ["./scripts/cleanup.sh"]
      restartPolicy: Never
```

Commit the job to Git, let ArgoCD create it, and it auto-deletes after completion. Remove the YAML from Git in a follow-up commit.

## Scenario 4: Port Forwarding and Debugging

Developers sometimes need to port-forward to a service or exec into a pod for debugging. These operations do not modify cluster state, so they do not conflict with GitOps:

```bash
# These are fine - they do not modify state
kubectl port-forward svc/my-app 8080:80 -n production
kubectl exec -it pod/my-app-xyz -n production -- /bin/sh
kubectl logs pod/my-app-xyz -n production
```

The issue arises when debugging leads to "let me just fix this real quick" changes. Establish a team rule: debugging commands are fine, but any changes must go through Git.

## Scenario 5: CRD Updates and Operator Operations

Custom Resource Definitions (CRDs) and operator-managed resources often have fields that get mutated by controllers. For example, a cert-manager Certificate resource gets status fields added by the cert-manager controller.

**Approach**: Use server-side diff and configure ArgoCD to ignore operator-managed fields:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

Server-side diff uses Kubernetes' server-side apply semantics, which understands field ownership. Fields managed by controllers are not flagged as drift.

## Scenario 6: Emergency Configuration Changes

Production is down. You need to change an environment variable or a configuration value immediately. The Git-commit-and-wait approach feels too slow.

**Speed up the Git path**:

```bash
# Fast-track emergency change
git checkout -b hotfix/production-fix
# Make the change
yq e '.spec.template.spec.containers[0].env[] |= select(.name == "DB_POOL_SIZE").value = "50"' \
  -i apps/my-app/deployment.yaml
git add . && git commit -m "EMERGENCY: increase DB pool size - incident #1234"
git push origin hotfix/production-fix

# Create and auto-merge PR (if your repo supports it)
gh pr create --title "EMERGENCY: DB pool size" --body "Incident #1234" --label emergency
gh pr merge --auto --squash

# Force ArgoCD to sync immediately instead of waiting
argocd app sync my-app
```

The entire process takes under 2 minutes with practice. This is fast enough for most emergencies while maintaining the Git audit trail.

## Building an Imperative Operations Runbook

Create a team runbook that covers each imperative scenario:

```markdown
## Imperative Operations Runbook

### Restart a deployment
1. ArgoCD UI: Navigate to app > Deployment > Actions > Restart
2. Or: argocd app actions run APP restart --kind Deployment

### Scale temporarily
1. Update replicas in Git
2. argocd app sync APP
3. Schedule a follow-up to revert

### Run a one-off job
1. Add Job YAML to jobs/ directory in GitOps repo
2. Commit and push
3. Remove Job YAML after completion

### Emergency config change
1. Create hotfix branch
2. Make change, commit, push
3. argocd app sync APP --revision hotfix/branch
4. Merge PR when stable
```

For tracking imperative operations and their impact on your deployment health, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-outofsync-applications/view) can alert you when applications go out of sync, helping you catch unauthorized imperative changes.

## Summary

Imperative operations are unavoidable in production Kubernetes environments. The goal is not to eliminate them but to channel them through GitOps-compatible paths. Use ArgoCD resource actions for restarts, update Git for scaling changes, use sync hooks for one-off jobs, speed up the Git path for emergencies, and configure server-side diff for operator-managed resources. The key principle is that every state change should either go through Git or be automatically reverted by ArgoCD. Build this into team habits through documentation and practice.
