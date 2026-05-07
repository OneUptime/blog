# How to Roll Back a Workload Deployment in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Deployment, Workload

Description: Learn how to roll back a failed or problematic workload deployment in Rancher using the UI, kubectl, and revision history.

Rolling back a deployment is a critical skill for maintaining application stability. When a new release introduces bugs, performance issues, or configuration problems, you need to quickly revert to a known good state. Rancher provides multiple ways to roll back workloads, both through its UI and via kubectl. This guide covers all the methods.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with an existing Deployment that has been updated at least once
- Access to the workload's namespace

## Understanding Revision History

Kubernetes maintains a revision history for Deployments. Each time you update a Deployment (change the image, environment variables, or any pod template field), Kubernetes creates a new ReplicaSet and stores it as a revision. By default, Kubernetes keeps 10 revisions.

View the revision history:

```bash
kubectl rollout history deployment/my-app -n default
```

Output:

```plaintext
deployment.apps/my-app
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
3         <none>
```

The `CHANGE-CAUSE` column shows the `kubernetes.io/change-cause` annotation for each revision. Kubernetes does not set this annotation automatically.

To see the details of a specific revision:

```bash
kubectl rollout history deployment/my-app -n default --revision=2
```

## Method 1: Roll Back via the Rancher UI

This is the simplest method for most users.

### Step 1: Navigate to the Deployment

In the Rancher dashboard, go to **Cluster Management**, open the cluster, click **Explore**, then go to **Workload** and find the deployment you want to roll back.

### Step 2: Open the Rollback Dialog

Click the three-dot menu next to the deployment and select **Rollback**. Rancher shows the available revisions for that workload.

### Step 3: Roll Back

1. Choose the revision you want to revert to from the dropdown
2. Click **Rollback** to confirm

Rancher will initiate a rollback by updating the Deployment to match the selected revision's pod template.

### Step 4: Monitor the Rollback

Stay on the deployment details page to watch the rollback progress. The old pods will be terminated and new pods matching the previous revision will be created.

## Method 2: Roll Back via kubectl

### Roll Back to the Previous Revision

```bash
kubectl rollout undo deployment/my-app -n default
```

This immediately rolls back to the previous revision (revision N-1).

### Roll Back to a Specific Revision

```bash
kubectl rollout undo deployment/my-app -n default --to-revision=2
```

This rolls back to revision 2 specifically.

### Monitor the Rollback

```bash
kubectl rollout status deployment/my-app -n default
```

Output:

```plaintext
deployment "my-app" successfully rolled out
```

## Method 3: Roll Back by Editing the Deployment

You can also "roll back" by manually editing the deployment to use the previous configuration:

1. In Rancher, go to **Workload**
2. Find the deployment, click the three-dot menu, and select **Edit YAML**
3. Change the container image or other fields back to the desired version
4. Click **Save**

For example, change:

```yaml
containers:
  - name: my-app
    image: my-app:v1.2  # problematic version
```

Back to:

```yaml
containers:
  - name: my-app
    image: my-app:v1.1  # stable version
```

## Configuring Revision History Limit

By default, Kubernetes retains 10 old ReplicaSets (revisions). You can change this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  revisionHistoryLimit: 20
  # ... rest of spec
```

Setting this to `0` disables rollbacks entirely (not recommended). A higher value gives you more rollback options but uses more cluster resources.

## Rolling Back StatefulSets

StatefulSets also support rollbacks, but the process differs slightly:

```bash
# View revision history

kubectl rollout history statefulset/my-statefulset -n default

# Roll back to previous revision
kubectl rollout undo statefulset/my-statefulset -n default

# Roll back to a specific revision
kubectl rollout undo statefulset/my-statefulset -n default --to-revision=2
```

StatefulSets store revision history in `ControllerRevision` objects rather than ReplicaSets. If a broken rolling update leaves a Pod stuck and not Ready, reverting the template may not be enough; you may also need to delete the affected Pods so the StatefulSet recreates them from the reverted template.

In Rancher, StatefulSet rollbacks follow the same UI workflow as Deployments.

## Rolling Back DaemonSets

DaemonSets also support rollbacks:

```bash
kubectl rollout undo daemonset/my-daemonset -n default
kubectl rollout undo daemonset/my-daemonset -n default --to-revision=3
```

## Handling Failed Rollbacks

If a rollback itself fails (e.g., the previous image is no longer available):

1. Check the pod events:

```bash
kubectl describe pods -l app=my-app -n default
```

2. Look for errors like `ImagePullBackOff` or `CrashLoopBackOff`

3. If the old image is unavailable, you may need to build and push a fixed version instead of rolling back

4. Check rollout status:

```bash
kubectl rollout status deployment/my-app -n default --timeout=120s
```

## Preventing Bad Deployments

To minimize the need for rollbacks, configure deployment safeguards:

### Set a Progress Deadline

```yaml
spec:
  progressDeadlineSeconds: 300
```

If the deployment does not make progress within this time, Kubernetes marks the Deployment as failed to progress.

### Configure Readiness Probes

Ensure pods are not marked as ready until they are genuinely serving traffic:

```yaml
spec:
  template:
    spec:
      containers:
        - name: my-app
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
```

### Use Conservative Rolling Updates

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
```

Setting `maxUnavailable: 0` ensures the Deployment keeps the full desired number of available pods during the rollout, reducing risk if the new pods fail.

## Best Practices

1. Always set `revisionHistoryLimit` to a reasonable value (10-20)
2. Use the `kubernetes.io/change-cause` annotation to record change causes in rollout history
3. Test rollback procedures in staging before production
4. Monitor deployments after updates and roll back quickly if issues arise
5. Use readiness probes to catch failures early in the rollout
6. Consider using Rancher's monitoring to set up alerts for deployment failures

## Summary

Rancher provides straightforward rollback capabilities for Deployments, StatefulSets, and DaemonSets through both its UI and kubectl. Kubernetes revision history makes it possible to revert to any previous configuration. Combine rollback capabilities with proper health checks, conservative update strategies, and monitoring to maintain high availability during deployments.
