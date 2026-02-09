# How to Roll Back Deployments to a Specific Revision Using kubectl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rollback, kubectl

Description: Master kubectl rollback commands to revert Kubernetes deployments to specific revisions, recover from failed updates, and maintain deployment history for reliable recovery operations.

---

Your latest deployment introduced a critical bug. You need to roll back immediately, but not just to the previous version. You need to go back two releases to the last known stable state because the previous release also had issues.

Kubernetes maintains deployment history and lets you roll back to any previous revision.

## Understanding Deployment Revisions

Every time you update a deployment, Kubernetes creates a new ReplicaSet and increments the revision number. The deployment keeps a history of previous ReplicaSets, allowing you to roll back.

Check your deployment's revision history:

```bash
# View rollout history
kubectl rollout history deployment/api-server

# Output shows revisions
REVISION  CHANGE-CAUSE
1         Initial deployment
2         Update to v1.1.0
3         Update to v1.2.0
4         Update to v1.3.0
```

The CHANGE-CAUSE column shows why each revision was created. To populate this, add the `kubernetes.io/change-cause` annotation when deploying:

```bash
kubectl apply -f deployment.yaml \
  --record

# Or annotate directly
kubectl annotate deployment/api-server \
  kubernetes.io/change-cause="Update to v1.3.0 with new features"
```

## Viewing Specific Revision Details

Get details about a specific revision:

```bash
# View details of revision 3
kubectl rollout history deployment/api-server --revision=3
```

Output shows the pod template for that revision:

```
deployment.apps/api-server with revision #3
Pod Template:
  Labels:	app=api-server
	pod-template-hash=7d8f9c5b4d
  Annotations:	kubernetes.io/change-cause: Update to v1.2.0
  Containers:
   api:
    Image:	myregistry.io/api-server:v1.2.0
    Port:	8080/TCP
    Environment:
      LOG_LEVEL:	info
    Mounts:	<none>
  Volumes:	<none>
```

This helps you verify which version you're rolling back to.

## Rolling Back to Previous Revision

Roll back to the immediately previous revision:

```bash
# Undo last deployment
kubectl rollout undo deployment/api-server

# Watch the rollback progress
kubectl rollout status deployment/api-server
```

This reverts to the revision before the current one. If you're on revision 4, this takes you back to revision 3.

## Rolling Back to Specific Revision

Roll back to a specific revision number:

```bash
# Roll back to revision 2
kubectl rollout undo deployment/api-server --to-revision=2

# Verify
kubectl rollout history deployment/api-server
```

After rolling back to revision 2, the history shows:

```
REVISION  CHANGE-CAUSE
1         Initial deployment
3         Update to v1.2.0
4         Update to v1.3.0
5         Rolled back to revision 2
```

Notice that revision 2 is now gone, replaced by revision 5 which is a copy of revision 2.

## Revision History Limits

Kubernetes keeps a limited number of old ReplicaSets. Control this with `revisionHistoryLimit`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5
  revisionHistoryLimit: 10  # Keep last 10 revisions
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v1.3.0
```

Default is 10. Setting it to 0 prevents rollbacks:

```yaml
spec:
  revisionHistoryLimit: 0  # No rollback capability
```

Setting it higher keeps more history but consumes more resources:

```yaml
spec:
  revisionHistoryLimit: 25  # Keep 25 revisions
```

## Checking Current Revision

See which revision is currently deployed:

```bash
# Get current revision number
kubectl get deployment api-server -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}'

# Or use describe
kubectl describe deployment api-server | grep -A 3 "Annotations:"
```

## Automated Rollback Scripts

Create a script for emergency rollbacks:

```bash
#!/bin/bash
# emergency-rollback.sh

DEPLOYMENT=$1
NAMESPACE=${2:-default}
TARGET_REVISION=$3

if [ -z "$DEPLOYMENT" ]; then
  echo "Usage: $0 <deployment> [namespace] [revision]"
  exit 1
fi

echo "Current status of $DEPLOYMENT:"
kubectl get deployment $DEPLOYMENT -n $NAMESPACE

echo -e "\nRollout history:"
kubectl rollout history deployment/$DEPLOYMENT -n $NAMESPACE

if [ -z "$TARGET_REVISION" ]; then
  echo -e "\nRolling back to previous revision..."
  kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE
else
  echo -e "\nRolling back to revision $TARGET_REVISION..."
  kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE --to-revision=$TARGET_REVISION
fi

echo -e "\nWaiting for rollback to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

echo -e "\nCurrent pods:"
kubectl get pods -l app=$DEPLOYMENT -n $NAMESPACE

echo -e "\nRollback complete!"
```

Use it:

```bash
# Roll back to previous revision
./emergency-rollback.sh api-server production

# Roll back to specific revision
./emergency-rollback.sh api-server production 5
```

## Rollback with Validation

Add validation before rolling back:

```bash
#!/bin/bash
# safe-rollback.sh

DEPLOYMENT=$1
REVISION=$2

# Show current state
echo "Current revision:"
kubectl rollout history deployment/$DEPLOYMENT | tail -1

# Show target revision details
echo -e "\nTarget revision $REVISION details:"
kubectl rollout history deployment/$DEPLOYMENT --revision=$REVISION

# Confirm
read -p "Proceed with rollback? (yes/no) " -n 3 -r
echo

if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "Rollback cancelled"
  exit 1
fi

# Perform rollback
echo "Rolling back..."
kubectl rollout undo deployment/$DEPLOYMENT --to-revision=$REVISION

# Monitor
kubectl rollout status deployment/$DEPLOYMENT

# Verify
echo -e "\nNew revision:"
kubectl rollout history deployment/$DEPLOYMENT | tail -1

# Check pod health
echo -e "\nPod status:"
kubectl get pods -l app=$DEPLOYMENT

# Check recent events
echo -e "\nRecent events:"
kubectl get events --field-selector involvedObject.name=$DEPLOYMENT --sort-by='.lastTimestamp' | tail -10
```

## Handling Failed Rollbacks

Sometimes rollbacks fail. Diagnose and fix:

```bash
# Check rollback status
kubectl rollout status deployment/api-server

# If stuck, check events
kubectl get events --field-selector involvedObject.name=api-server

# Check pod status
kubectl get pods -l app=api-server

# Describe pods that are failing
kubectl describe pod <pod-name>

# Force delete stuck pods if necessary
kubectl delete pod <pod-name> --force --grace-period=0
```

Common rollback failure causes:
- Image pull failures (target revision image not available)
- Resource constraints (not enough CPU/memory)
- Configuration issues (broken ConfigMaps or Secrets)
- Readiness probe failures

## Preserving Rollout History

Annotate deployments with meaningful change causes:

```bash
# Option 1: Use --record flag (deprecated but still works)
kubectl set image deployment/api-server api=myregistry.io/api-server:v1.4.0 --record

# Option 2: Manually annotate
kubectl annotate deployment/api-server \
  kubernetes.io/change-cause="Deploy v1.4.0: Fix critical authentication bug" \
  --overwrite

# Option 3: Add to deployment YAML
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    kubernetes.io/change-cause: "Deploy v1.4.0: Fix critical authentication bug"
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v1.4.0
EOF
```

## Rolling Back During Ongoing Rollout

You can roll back even while a rollout is in progress:

```bash
# Start a rollout
kubectl set image deployment/api-server api=myregistry.io/api-server:v1.5.0

# Realize there's an issue mid-rollout
# Roll back immediately
kubectl rollout undo deployment/api-server

# This stops the ongoing rollout and reverts
```

Kubernetes stops scaling up the new ReplicaSet and scales it back down, while scaling the old ReplicaSet back up.

## CI/CD Integration

Integrate rollback into CI/CD pipelines:

```yaml
# GitLab CI example
deploy:
  stage: deploy
  script:
    - kubectl apply -f deployment.yaml
    - kubectl rollout status deployment/api-server
  environment:
    name: production
    on_stop: rollback

rollback:
  stage: deploy
  when: manual
  script:
    - kubectl rollout undo deployment/api-server
    - kubectl rollout status deployment/api-server
  environment:
    name: production
    action: stop
```

This creates a manual "rollback" job that appears in GitLab's UI.

## Monitoring Rollback Events

Create alerts for rollbacks:

```yaml
# Prometheus alert for rollbacks
groups:
- name: deployment_alerts
  rules:
  - alert: DeploymentRolledBack
    expr: |
      kube_deployment_status_observed_generation
        !=
      kube_deployment_metadata_generation
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Deployment {{ $labels.deployment }} rolled back"
```

Track rollback frequency in your metrics:

```bash
# Query rollback events
kubectl get events --field-selector reason=DeploymentRollback --all-namespaces
```

## Best Practices

**Keep sufficient history**. Set `revisionHistoryLimit` to at least 10 for production deployments.

**Document changes**. Always use meaningful annotations for the change cause.

**Test rollback procedures**. Practice rollbacks in staging to ensure they work when you need them.

**Monitor after rollback**. Don't assume the rollback fixed everything. Watch metrics and logs.

**Understand what you're rolling back to**. Always check the revision details before rolling back.

**Have a communication plan**. Let your team know when rollbacks happen and why.

**Consider the cascade**. If you rolled back a deployment, check if other services depend on the new version's features.

## Alternative: Declarative Rollback

Instead of using `kubectl rollout undo`, you can roll back declaratively by applying an old manifest:

```bash
# Assuming you keep deployment manifests in git
git log -- deployments/api-server.yaml

# Check out an old version
git show commit-hash:deployments/api-server.yaml > old-version.yaml

# Apply it
kubectl apply -f old-version.yaml
```

This is more repeatable and fits better with GitOps workflows.

## Rollback vs. Forward Fix

Sometimes rolling forward is better than rolling back:

**Roll back when:**
- The issue is severe and immediate
- You know the previous version works
- The fix will take significant time

**Roll forward when:**
- The issue is minor or affects few users
- Rolling back breaks other things
- The fix is quick and straightforward
- You've already deployed to multiple environments

```bash
# Quick forward fix
kubectl set image deployment/api-server \
  api=myregistry.io/api-server:v1.5.1

kubectl annotate deployment/api-server \
  kubernetes.io/change-cause="Hotfix v1.5.1: Fix crash in new feature"
```

## Conclusion

Kubernetes deployment rollback is straightforward but requires understanding revision history and proper documentation. Keep adequate revision history, annotate your changes clearly, and practice rollback procedures before you need them in production.

Remember that rollback is one tool in your reliability toolbox. Combine it with proper monitoring, progressive delivery strategies, and good testing to minimize the need for rollbacks in the first place. When issues do occur, knowing how to quickly and safely roll back gives you confidence to move fast and recover quickly.
