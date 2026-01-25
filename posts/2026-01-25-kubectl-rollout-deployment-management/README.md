# How to Use kubectl rollout for Deployment Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Deployments, Rollout, DevOps, CI/CD

Description: Learn how to use kubectl rollout commands to manage Kubernetes deployments effectively. This guide covers checking status, pausing rollouts, rolling back, and viewing rollout history with practical examples.

---

The `kubectl rollout` command is your primary tool for managing deployment updates in Kubernetes. It lets you check rollout status, pause and resume updates, roll back to previous versions, and view deployment history. Master these commands and you will handle production deployments with confidence.

## Rollout Commands Overview

```bash
# Available rollout commands
kubectl rollout status    # Watch rollout progress
kubectl rollout history   # View rollout history
kubectl rollout pause     # Pause a rollout
kubectl rollout resume    # Resume a paused rollout
kubectl rollout undo      # Roll back to previous version
kubectl rollout restart   # Restart all pods
```

## Checking Rollout Status

### Watch a Rollout in Real Time

```bash
# Watch deployment rollout status
kubectl rollout status deployment/myapp -n production

# Example output during rollout:
# Waiting for deployment "myapp" rollout to finish: 2 out of 5 new replicas have been updated...
# Waiting for deployment "myapp" rollout to finish: 3 out of 5 new replicas have been updated...
# Waiting for deployment "myapp" rollout to finish: 4 of 5 updated replicas are available...
# deployment "myapp" successfully rolled out
```

The command exits with:
- Code 0: Rollout completed successfully
- Code 1: Rollout failed or timed out

### Use in CI/CD Pipelines

```bash
#!/bin/bash
# deploy.sh

# Apply the new deployment
kubectl apply -f deployment.yaml

# Wait for rollout with timeout
if kubectl rollout status deployment/myapp -n production --timeout=300s; then
    echo "Deployment successful"
    exit 0
else
    echo "Deployment failed, rolling back"
    kubectl rollout undo deployment/myapp -n production
    exit 1
fi
```

### Check Status for All Resources

```bash
# Check rollout status for all deployments in a namespace
for deploy in $(kubectl get deployments -n production -o name); do
    echo "Checking $deploy"
    kubectl rollout status $deploy -n production --timeout=60s
done
```

## Viewing Rollout History

### List Revision History

```bash
# View deployment history
kubectl rollout history deployment/myapp -n production

# Example output:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         kubectl set image deployment/myapp myapp=myapp:v1.1.0
# 3         kubectl set image deployment/myapp myapp=myapp:v1.2.0
```

### View Specific Revision Details

```bash
# View details of revision 2
kubectl rollout history deployment/myapp -n production --revision=2

# Example output:
# Pod Template:
#   Labels:       app=myapp
#                 pod-template-hash=abc123
#   Containers:
#    myapp:
#     Image:      myapp:v1.1.0
#     Port:       8080/TCP
```

### Recording Change Causes

Always record why you made a change:

```bash
# Record the change cause when updating
kubectl set image deployment/myapp myapp=myapp:v1.2.0 -n production --record

# Or with apply
kubectl apply -f deployment.yaml --record
```

Better approach using annotations:

```bash
# Annotate the change cause
kubectl annotate deployment/myapp -n production \
    kubernetes.io/change-cause="Update to v1.2.0 for bug fix #1234"
```

## Pausing and Resuming Rollouts

### Pause a Rollout

Pausing lets you make multiple changes before triggering a rollout:

```bash
# Pause the deployment
kubectl rollout pause deployment/myapp -n production

# Make multiple changes
kubectl set image deployment/myapp myapp=myapp:v2.0.0 -n production
kubectl set resources deployment/myapp -c myapp --limits=memory=512Mi -n production
kubectl set env deployment/myapp LOG_LEVEL=debug -n production

# Resume to apply all changes at once
kubectl rollout resume deployment/myapp -n production
```

### Use Case: Canary Validation

```bash
# Pause after partial rollout
kubectl rollout pause deployment/myapp -n production

# Check metrics and logs for the new pods
kubectl logs -l app=myapp,pod-template-hash=<new-hash> -n production

# If everything looks good, resume
kubectl rollout resume deployment/myapp -n production

# If not, undo
kubectl rollout undo deployment/myapp -n production
```

## Rolling Back Deployments

### Undo to Previous Revision

```bash
# Roll back to the previous version
kubectl rollout undo deployment/myapp -n production

# Verify rollback
kubectl rollout status deployment/myapp -n production
```

### Roll Back to Specific Revision

```bash
# View history first
kubectl rollout history deployment/myapp -n production

# Roll back to revision 2
kubectl rollout undo deployment/myapp -n production --to-revision=2
```

### Automated Rollback Script

```bash
#!/bin/bash
# auto-rollback.sh

DEPLOYMENT=$1
NAMESPACE=${2:-default}
TIMEOUT=${3:-300}

echo "Deploying $DEPLOYMENT in $NAMESPACE"

# Store current revision
CURRENT_REVISION=$(kubectl rollout history deployment/$DEPLOYMENT -n $NAMESPACE | tail -2 | head -1 | awk '{print $1}')

# Apply changes
kubectl apply -f deployment.yaml

# Wait for rollout
if kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=${TIMEOUT}s; then
    echo "Deployment successful"
else
    echo "Deployment failed, rolling back to revision $CURRENT_REVISION"
    kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE --to-revision=$CURRENT_REVISION
    kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE
    exit 1
fi
```

## Restarting Deployments

### Rolling Restart

Restart all pods without changing the spec:

```bash
# Restart deployment (triggers rolling update)
kubectl rollout restart deployment/myapp -n production

# Watch the restart progress
kubectl rollout status deployment/myapp -n production
```

Common use cases:
- Pick up new ConfigMap or Secret values
- Clear in-memory caches
- Recover from a bad state

### Restart All Deployments

```bash
# Restart all deployments in a namespace
kubectl rollout restart deployment -n production

# Restart specific deployments
kubectl rollout restart deployment/app1 deployment/app2 deployment/app3 -n production
```

## Deployment Strategies

### Rolling Update (Default)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%        # Max extra pods during update
      maxUnavailable: 25%  # Max pods that can be unavailable
```

Monitor with:

```bash
kubectl rollout status deployment/myapp -n production -w
```

### Recreate Strategy

```yaml
spec:
  strategy:
    type: Recreate  # All old pods deleted before new ones created
```

Use when:
- Application cannot run multiple versions simultaneously
- Database migrations require exclusive access

## Working with StatefulSets

Rollout commands work with StatefulSets too:

```bash
# Check StatefulSet rollout
kubectl rollout status statefulset/postgres -n production

# View history
kubectl rollout history statefulset/postgres -n production

# Roll back
kubectl rollout undo statefulset/postgres -n production
```

StatefulSets roll out pods in reverse ordinal order (N-1, N-2, ..., 0).

## Working with DaemonSets

```bash
# Check DaemonSet rollout
kubectl rollout status daemonset/fluentd -n kube-system

# Restart DaemonSet
kubectl rollout restart daemonset/fluentd -n kube-system

# Roll back DaemonSet
kubectl rollout undo daemonset/fluentd -n kube-system
```

## Monitoring Rollout Progress

### Get Detailed Status

```bash
# Watch pods during rollout
kubectl get pods -l app=myapp -n production -w

# See ReplicaSets
kubectl get rs -l app=myapp -n production

# Describe deployment for detailed status
kubectl describe deployment/myapp -n production | grep -A 5 "Conditions:"
```

### Check Rollout Events

```bash
# View events related to the deployment
kubectl get events -n production --field-selector involvedObject.name=myapp --sort-by='.lastTimestamp'
```

### Prometheus Metrics

```promql
# Track deployment replicas
kube_deployment_status_replicas_available{deployment="myapp"}
kube_deployment_status_replicas_updated{deployment="myapp"}

# Alert on stuck rollouts
kube_deployment_status_observed_generation{deployment="myapp"}
  != kube_deployment_metadata_generation{deployment="myapp"}
```

## Common Issues and Solutions

### Rollout Stuck

```bash
# Check why rollout is stuck
kubectl describe deployment/myapp -n production

# Look for:
# - Image pull errors
# - Resource constraints
# - Failing health checks
# - Pending pods

# Check pod status
kubectl get pods -l app=myapp -n production
kubectl describe pod <stuck-pod> -n production
```

### Rollback Not Working

```bash
# Check revision history limit
kubectl get deployment/myapp -n production -o jsonpath='{.spec.revisionHistoryLimit}'

# If 0, no history is kept. Set a reasonable value:
kubectl patch deployment/myapp -n production -p '{"spec":{"revisionHistoryLimit":10}}'
```

### Lost History After Scale

```bash
# Scaling does not create new revisions
kubectl scale deployment/myapp --replicas=5 -n production

# Only these create revisions:
# - Image changes
# - Container spec changes
# - Pod template changes
```

## Best Practices

1. **Always record change causes** for audit trail
2. **Set appropriate timeouts** in CI/CD pipelines
3. **Keep revision history** (default is 10)
4. **Monitor rollout metrics** with Prometheus
5. **Test rollbacks** in staging regularly
6. **Use pause/resume** for complex multi-change deployments

```yaml
# Recommended deployment settings
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    kubernetes.io/change-cause: "Initial deployment"
spec:
  replicas: 5
  revisionHistoryLimit: 10  # Keep 10 revisions for rollback
  progressDeadlineSeconds: 600  # Fail rollout after 10 minutes
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime
```

---

The `kubectl rollout` commands give you full control over deployment lifecycles. Use them to monitor progress, manage phased rollouts, and quickly recover from bad deployments. Combined with proper CI/CD automation, they make Kubernetes deployments reliable and reversible.
