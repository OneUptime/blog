# How to Roll Out a Change, Watch Health Checks, and Undo a Bad Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Releases, DevOps, Reliability

Description: Use Deployment strategies, `kubectl rollout`, and health probes to ship safely-and revert instantly when something looks wrong.

---

Kubernetes Deployments already know how to do rolling updates. You just need to drive them with the right flags and watch the signals. Here’s the playbook teams use during production pushes.

## 1. Set a Sensible Update Strategy

`deployments/api.yaml`

The `strategy` block controls how Kubernetes replaces old Pods with new ones during a rollout. This configuration ensures zero downtime by always keeping all existing Pods running while spinning up new ones.

```yaml
spec:
  strategy:
    type: RollingUpdate           # Gradually replace Pods (vs. Recreate)
    rollingUpdate:
      maxSurge: 1                 # Allow 1 extra Pod during rollout
      maxUnavailable: 0           # Never terminate a Pod until replacement is Ready
```

- `maxSurge: 1` allows one extra Pod during rollout, keeping capacity safe.
- `maxUnavailable: 0` guarantees zero downtime.

Ensure Pods have readiness/liveness probes-rollouts rely on them to decide when to advance.

## 2. Kick Off the Rollout

Bump the image tag or config and apply. Either command triggers a rolling update:

```bash
# Option 1: Update image tag directly via CLI
kubectl set image deploy/api api=ghcr.io/example/api:2.1.0 -n prod
# Option 2: Edit YAML and apply the manifest
kubectl apply -f deployments/api.yaml
```

## 3. Watch Progress in Real Time

Use `rollout status` to stream progress. The command blocks until all new Pods are Ready or the rollout fails.

```bash
# Watch the rollout progress - exits 0 on success, non-zero on failure
kubectl rollout status deploy/api -n prod --watch
```

This command blocks until the Deployment reaches the desired state or times out. Pair it with event logs:

```bash
# List all Pods to see old and new replicas side by side
kubectl get pods -n prod -l app=api
# Check events for image pull issues or probe failures
kubectl describe pod api-<hash> -n prod
```

Look for `Readiness probe failed` or `Back-off restarting` events early.

## 4. Pause, Inspect, Resume

If metrics spike or logs look bad, you can pause the rollout before more Pods update. This freezes the rollout mid-flight so you can investigate without rolling back entirely.

```bash
# Freeze the rollout - no more Pods will be replaced
kubectl rollout pause deploy/api -n prod
# ... investigate logs, metrics, run tests ...
# Continue the rollout once you're confident
kubectl rollout resume deploy/api -n prod
```

While paused, `kubectl rollout status` stays pending and Kubernetes stops replacing additional Pods.

## 5. Undo Fast

When the new version is broken, revert to the previous ReplicaSet instantly. This triggers a new rollout using the old Pod template.

```bash
# Roll back to the immediately previous version
kubectl rollout undo deploy/api -n prod
# Or roll back to a specific revision from history
kubectl rollout undo deploy/api --to-revision=5 -n prod
```

Kubernetes stores rollout history (ReplicaSets) by default. Use `kubectl rollout history deploy/api -n prod` to list revisions and the change-cause annotations.

### Add Change Causes

Annotate every apply so history stays readable. This message appears in `rollout history` output.

```bash
# Record why this deployment happened for future debugging
kubectl annotate deploy/api kubernetes.io/change-cause="Release 2.1.0 adds caching" --overwrite -n prod
```

## 6. Validate After Rollout

- Check Service endpoints: `kubectl get endpoints api -n prod`.
- Run smoke tests: `kubectl exec` or hit health endpoints through the ingress.
- Monitor metrics/dashboards for error spikes.

If anything looks off, undo immediately-rollbacks are just another rollout.

## 7. Automate in CI/CD

Add these commands to your CI/CD pipeline to automate deployments and fail fast on bad releases:

```bash
# Apply the updated manifest
kubectl apply -f deployments/api.yaml
# Wait up to 5 minutes for all Pods to become Ready
# Pipeline fails if rollout doesn't complete in time
kubectl rollout status deploy/api -n prod --timeout=5m
```

Fail the pipeline if the status command exits non-zero. Add `kubectl get events` output to logs to speed up debugging.

## 8. Clean Up Old ReplicaSets

Kubernetes keeps the last 10 revisions by default. Adjust this limit based on how far back you need to roll back:

```yaml
spec:
  revisionHistoryLimit: 5           # Keep 5 old ReplicaSets for rollback
```

Lower it if you deploy frequently; raise it if compliance requires longer audit trails.

---

Rolling updates, probes, and `kubectl rollout undo` form a tight loop: ship, watch, revert. Learn these three commands and you can fearlessly deploy multiple times per day.
