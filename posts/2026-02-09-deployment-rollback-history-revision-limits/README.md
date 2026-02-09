# How to Configure Deployment Rollback History and Revision Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Rollback

Description: Learn how to configure and manage deployment revision history in Kubernetes, implement safe rollback procedures, and set appropriate revision limits to balance recovery options with resource consumption.

---

Kubernetes maintains a history of deployment revisions by keeping old ReplicaSets, allowing you to roll back to previous versions when issues arise. The `revisionHistoryLimit` field controls how many old ReplicaSets are retained, balancing the ability to roll back against cluster resource consumption. Understanding how to manage this history and perform rollbacks safely is essential for production operations.

Proper revision management ensures you can quickly recover from bad deployments while keeping your cluster clean.

## Understanding Revision History

Every deployment update creates a new ReplicaSet:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  revisionHistoryLimit: 10  # Keep 10 old ReplicaSets
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: nginx
        image: nginx:1.24
        ports:
        - containerPort: 80
```

View revision history:

```bash
# List all revisions
kubectl rollout history deployment/web-app

# Output:
# REVISION  CHANGE-CAUSE
# 1         <none>
# 2         <none>
# 3         kubectl set image deployment/web-app nginx=nginx:1.25

# View specific revision details
kubectl rollout history deployment/web-app --revision=2

# See ReplicaSets for each revision
kubectl get rs -l app=web-app
```

## Setting Appropriate Revision Limits

Different strategies for different environments:

```yaml
# Production - keep more history
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  namespace: production
spec:
  revisionHistoryLimit: 10  # Keep 10 revisions
  replicas: 5
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
    spec:
      containers:
      - name: app
        image: myapp:v1.0
---
# Staging - moderate history
apiVersion: apps/v1
kind: Deployment
metadata:
  name: staging-app
  namespace: staging
spec:
  revisionHistoryLimit: 5  # Keep 5 revisions
  replicas: 2
  selector:
    matchLabels:
      app: staging-app
  template:
    metadata:
      labels:
        app: staging-app
    spec:
      containers:
      - name: app
        image: myapp:v1.0
---
# Development - minimal history
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-app
  namespace: development
spec:
  revisionHistoryLimit: 2  # Keep only 2 revisions
  replicas: 1
  selector:
    matchLabels:
      app: dev-app
  template:
    metadata:
      labels:
        app: dev-app
    spec:
      containers:
      - name: app
        image: myapp:latest
```

## Adding Change Annotations

Track what changed in each revision:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  annotations:
    kubernetes.io/change-cause: "Update nginx to 1.25 for security patch CVE-2024-1234"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
```

Or set via kubectl:

```bash
# Update with change cause
kubectl set image deployment/web-app nginx=nginx:1.25 \
  --record=true  # Deprecated, use annotation instead

# Better approach with annotation
kubectl annotate deployment/web-app \
  kubernetes.io/change-cause="Update to nginx 1.25"

kubectl set image deployment/web-app nginx=nginx:1.25

# View change causes
kubectl rollout history deployment/web-app
# Shows the annotation for each revision
```

## Performing Rollbacks

Roll back to previous revision:

```bash
# Undo last deployment
kubectl rollout undo deployment/web-app

# Roll back to specific revision
kubectl rollout undo deployment/web-app --to-revision=3

# Check rollback status
kubectl rollout status deployment/web-app

# Verify rollback worked
kubectl describe deployment web-app | grep Image
```

Automated rollback script:

```bash
#!/bin/bash
# rollback-deployment.sh

set -e

NAMESPACE=${1:-default}
DEPLOYMENT=$2
TARGET_REVISION=$3

if [ -z "$DEPLOYMENT" ]; then
    echo "Usage: $0 [namespace] <deployment> [revision]"
    exit 1
fi

echo "=== Deployment Rollback Tool ==="
echo "Namespace: $NAMESPACE"
echo "Deployment: $DEPLOYMENT"
echo ""

# Show current revision
CURRENT_REVISION=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE \
    -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
echo "Current revision: $CURRENT_REVISION"

# Show revision history
echo ""
echo "=== Revision History ==="
kubectl rollout history deployment/$DEPLOYMENT -n $NAMESPACE

# If no target revision specified, use previous one
if [ -z "$TARGET_REVISION" ]; then
    TARGET_REVISION=$((CURRENT_REVISION - 1))
    echo ""
    echo "No revision specified, will rollback to revision $TARGET_REVISION"
fi

# Confirm rollback
echo ""
read -p "Roll back to revision $TARGET_REVISION? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Perform rollback
echo "Rolling back..."
kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE --to-revision=$TARGET_REVISION

# Wait for rollback to complete
echo "Waiting for rollback to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

# Verify new revision
NEW_REVISION=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE \
    -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')

echo ""
echo "=== Rollback Complete ==="
echo "New revision: $NEW_REVISION"
echo ""

# Show pod status
kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT
```

## Automated Rollback on Failure

Monitor and rollback automatically:

```python
#!/usr/bin/env python3
from kubernetes import client, config, watch
import time
import sys

config.load_kube_config()
apps_v1 = client.AppsV1Api()
v1 = client.CoreV1Api()

def check_deployment_health(namespace, deployment_name, timeout=300):
    """Check if deployment is healthy."""
    start_time = time.time()

    while time.time() - start_time < timeout:
        deployment = apps_v1.read_namespaced_deployment(deployment_name, namespace)

        # Check if all replicas are ready
        replicas = deployment.spec.replicas
        ready_replicas = deployment.status.ready_replicas or 0
        updated_replicas = deployment.status.updated_replicas or 0

        print(f"Replicas: {ready_replicas}/{replicas} ready, {updated_replicas} updated")

        # Check for failure conditions
        if deployment.status.conditions:
            for condition in deployment.status.conditions:
                if condition.type == "Progressing" and condition.status == "False":
                    print(f"Deployment not progressing: {condition.reason} - {condition.message}")
                    return False

        # Success condition
        if ready_replicas == replicas and updated_replicas == replicas:
            print("Deployment is healthy!")
            return True

        time.sleep(10)

    print(f"Timeout waiting for deployment to be healthy")
    return False

def rollback_deployment(namespace, deployment_name):
    """Roll back to previous revision."""
    print(f"Rolling back {namespace}/{deployment_name}...")

    # Get current revision
    deployment = apps_v1.read_namespaced_deployment(deployment_name, namespace)
    current_revision = deployment.metadata.annotations.get(
        'deployment.kubernetes.io/revision', '0')

    print(f"Current revision: {current_revision}")

    # Perform rollback
    body = {
        "spec": {
            "rollbackTo": {
                "revision": int(current_revision) - 1
            }
        }
    }

    # Note: rollbackTo is deprecated, use this instead:
    apps_v1.patch_namespaced_deployment(
        deployment_name,
        namespace,
        body
    )

    print("Rollback initiated")

def monitor_and_rollback(namespace, deployment_name):
    """Monitor deployment and rollback if unhealthy."""
    print(f"Monitoring deployment: {namespace}/{deployment_name}")

    # Watch for deployment updates
    w = watch.Watch()
    for event in w.stream(apps_v1.list_namespaced_deployment, namespace=namespace,
                          field_selector=f"metadata.name={deployment_name}",
                          timeout_seconds=600):
        deployment = event['object']
        event_type = event['type']

        if event_type == "MODIFIED":
            # Check if this is a new rollout
            if deployment.metadata.generation != deployment.status.observed_generation:
                print("New rollout detected, monitoring...")

                # Give deployment time to stabilize
                time.sleep(60)

                # Check health
                if not check_deployment_health(namespace, deployment_name):
                    print("Deployment unhealthy, rolling back...")
                    rollback_deployment(namespace, deployment_name)
                    break

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: monitor-rollback.py <namespace> <deployment>")
        sys.exit(1)

    monitor_and_rollback(sys.argv[1], sys.argv[2])
```

## Managing Revision History

Clean up old ReplicaSets manually:

```bash
# List all ReplicaSets
kubectl get rs --all-namespaces

# Delete specific old ReplicaSet
kubectl delete rs <replicaset-name> -n <namespace>

# Delete all ReplicaSets with 0 replicas
kubectl get rs --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.replicas == 0) |
  "-n \(.metadata.namespace) \(.metadata.name)"' | \
  xargs -r -n 3 kubectl delete rs
```

Automated cleanup job:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-old-replicasets
  namespace: kube-system
spec:
  schedule: "0 2 * * 0"  # Weekly at 2 AM Sunday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: replicaset-cleaner
          containers:
          - name: cleanup
            image: bitnami/kubectl:1.28
            command:
            - /bin/bash
            - -c
            - |
              # Get all deployments
              kubectl get deployments --all-namespaces -o json | \
                jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name) \(.spec.revisionHistoryLimit // 10)"' | \
                while read namespace deployment limit; do
                  echo "Checking $namespace/$deployment (limit: $limit)"

                  # Get ReplicaSets for this deployment, sorted by creation time
                  kubectl get rs -n $namespace \
                    -l "app=$deployment" \
                    --sort-by=.metadata.creationTimestamp -o json | \
                    jq -r '.items[] | select(.spec.replicas == 0) | .metadata.name' | \
                    tail -n +$((limit + 1)) | \
                    while read rs; do
                      echo "Deleting old ReplicaSet: $rs"
                      kubectl delete rs $rs -n $namespace
                    done
                done
          restartPolicy: OnFailure
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: replicaset-cleaner
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: replicaset-cleaner
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: replicaset-cleaner
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: replicaset-cleaner
subjects:
- kind: ServiceAccount
  name: replicaset-cleaner
  namespace: kube-system
```

## Preventing Accidental Rollouts

Use deployment approval gates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
  annotations:
    deployment.kubernetes.io/paused: "true"  # Pause by default
spec:
  paused: true
  revisionHistoryLimit: 20  # Keep more history for critical apps
  replicas: 10
  selector:
    matchLabels:
      app: critical-app
  template:
    metadata:
      labels:
        app: critical-app
    spec:
      containers:
      - name: app
        image: critical-app:v1.0
```

Manual approval required:

```bash
# Update image (won't roll out because paused)
kubectl set image deployment/critical-app app=critical-app:v2.0

# Review changes
kubectl rollout history deployment/critical-app
kubectl diff -f deployment.yaml

# Approve and resume
kubectl rollout resume deployment/critical-app
```

## Best Practices

Set revisionHistoryLimit based on deployment frequency and risk. More frequent deploys can have lower limits.

Always annotate changes with meaningful descriptions. This helps identify what each revision contains.

Test rollbacks in staging before production. Ensure rollback procedures work correctly.

Monitor deployments during and after rollouts. Set up alerts for deployment failures.

Keep revision history proportional to your rollback window. If you only roll back within a day, you don't need months of history.

Document rollback procedures for each critical application. Include specific revision numbers for known-good versions.

Use automation for routine rollbacks but keep manual override capability for complex scenarios.

Clean up old ReplicaSets periodically to prevent resource waste, but don't delete too aggressively.

Consider using GitOps tools like Argo CD for more sophisticated rollback capabilities and audit trails.

Combine with good monitoring. Quick detection of issues reduces the need for extensive rollback history.

Proper management of deployment revision history ensures you can quickly recover from bad deployments while maintaining a clean and efficient cluster.
