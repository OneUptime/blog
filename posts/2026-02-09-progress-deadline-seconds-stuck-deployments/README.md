# How to Use progressDeadlineSeconds to Detect Stuck Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Monitoring

Description: Learn how progressDeadlineSeconds helps detect and handle stuck Kubernetes deployments automatically, preventing deployments from hanging indefinitely and enabling faster failure detection.

---

You deploy a new version of your application and walk away, assuming Kubernetes will handle it. Two hours later, you check back and find the deployment stuck at 50% complete. Pods are crash-looping, but the deployment controller keeps trying indefinitely. Your deployment is broken, and you didn't get any alerts.

The progressDeadlineSeconds setting prevents this situation by setting a deadline for deployment progress.

## Understanding Deployment Progress

Kubernetes tracks deployment progress by monitoring whether new pods are successfully created and become ready. Progress means:

- A new ReplicaSet is created
- Pods in the new ReplicaSet start and pass readiness checks
- Old pods are scaled down as new pods become available

A deployment makes progress when these events happen within a reasonable timeframe. But what happens when progress stalls?

## When Deployments Get Stuck

Deployments can stall for many reasons:

**Image pull failures**. The new image doesn't exist or the registry is unreachable.

**Insufficient resources**. No nodes have enough CPU or memory to schedule the new pods.

**Failing readiness probes**. Pods start but never become ready due to configuration errors.

**Crash loops**. Pods start, crash immediately, and restart endlessly.

Without progressDeadlineSeconds, Kubernetes keeps retrying indefinitely. The deployment stays in a progressing state forever, never reporting failure.

## How progressDeadlineSeconds Works

The progressDeadlineSeconds field sets a timeout for deployment progress. If the deployment doesn't make any progress within this timeframe, Kubernetes marks it as failed.

Here's a basic configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  progressDeadlineSeconds: 600  # 10 minutes
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v2.0.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          periodSeconds: 10
```

If the deployment doesn't complete within 10 minutes, Kubernetes marks it as failed by adding a condition to the deployment status:

```yaml
conditions:
- lastTransitionTime: "2026-02-09T10:10:00Z"
  lastUpdateTime: "2026-02-09T10:10:00Z"
  message: 'Deployment does not have minimum availability.'
  reason: ProgressDeadlineExceeded
  status: "False"
  type: Progressing
```

## Detecting Failed Deployments

Check deployment status to see if it exceeded the progress deadline:

```bash
# Check deployment conditions
kubectl get deployment web-app -o json | \
  jq '.status.conditions[] | select(.type=="Progressing")'
```

Output for a failed deployment:

```json
{
  "lastTransitionTime": "2026-02-09T10:10:00Z",
  "lastUpdateTime": "2026-02-09T10:10:00Z",
  "message": "Deployment does not have minimum availability.",
  "reason": "ProgressDeadlineExceeded",
  "status": "False",
  "type": "Progressing"
}
```

You can also use kubectl rollout status, which exits with an error when the deadline is exceeded:

```bash
# This command will fail if deadline is exceeded
kubectl rollout status deployment/web-app

# Check exit code
echo $?  # Non-zero indicates failure
```

## Setting the Right Timeout

Choose progressDeadlineSeconds based on your deployment characteristics. Consider:

- How long pods typically take to start and become ready
- How many replicas you have
- Your maxSurge and maxUnavailable settings
- Your minReadySeconds value

For a deployment with:
- 10 replicas
- 30-second pod startup time
- maxSurge: 1, maxUnavailable: 1
- minReadySeconds: 60

A normal rollout takes about:
- (10 replicas × 90 seconds per pod) / 2 pods at once = 450 seconds

Set progressDeadlineSeconds to allow extra time for retries and temporary issues:

```yaml
spec:
  replicas: 10
  progressDeadlineSeconds: 900  # 15 minutes, about 2x normal time
  minReadySeconds: 60
```

## Practical Example: Image Pull Failures

Here's what happens when you deploy an image that doesn't exist:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  progressDeadlineSeconds: 300  # 5 minutes
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
        image: myregistry.io/api-server:nonexistent-tag
        ports:
        - containerPort: 8080
```

Deploy this and watch what happens:

```bash
# Apply the deployment
kubectl apply -f deployment.yaml

# Watch the status
kubectl rollout status deployment/api-server
```

Within 5 minutes, you'll see:

```
Waiting for deployment "api-server" rollout to finish: 0 of 3 updated replicas are available...
error: deployment "api-server" exceeded its progress deadline
```

Check the pods:

```bash
kubectl get pods -l app=api-server
```

Output shows the image pull failure:

```
NAME                          READY   STATUS         RESTARTS   AGE
api-server-7d8f9c5b4d-abc123  0/1     ErrImagePull   0          5m
api-server-7d8f9c5b4d-def456  0/1     ErrImagePull   0          5m
api-server-7d8f9c5b4d-ghi789  0/1     ErrImagePull   0          5m
```

## Handling Deadline Exceeded in CI/CD

Your CI/CD pipeline should detect when deployments exceed their deadline and take appropriate action:

```bash
#!/bin/bash
# deploy-with-timeout.sh

DEPLOYMENT=$1
IMAGE=$2
TIMEOUT=${3:-600}

echo "Deploying $DEPLOYMENT with image $IMAGE..."

# Update the image
kubectl set image deployment/$DEPLOYMENT app=$IMAGE

# Wait for rollout with timeout
if timeout $TIMEOUT kubectl rollout status deployment/$DEPLOYMENT; then
  echo "Deployment successful!"
  exit 0
else
  echo "Deployment failed or timed out"

  # Get deployment status
  kubectl get deployment $DEPLOYMENT -o yaml

  # Get pod events
  kubectl get events --field-selector involvedObject.kind=Pod \
    --sort-by='.lastTimestamp' | tail -20

  # Automatic rollback
  echo "Rolling back to previous version..."
  kubectl rollout undo deployment/$DEPLOYMENT

  exit 1
fi
```

This script deploys the new version, waits for completion, and automatically rolls back if the deadline is exceeded.

## Monitoring with Prometheus

Alert on deployments that exceed their progress deadline:

```yaml
groups:
- name: deployment_alerts
  rules:
  - alert: DeploymentProgressDeadlineExceeded
    expr: |
      kube_deployment_status_condition{
        condition="Progressing",
        status="false",
        reason="ProgressDeadlineExceeded"
      } == 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Deployment {{ $labels.deployment }} exceeded progress deadline"
      description: "Deployment {{ $labels.deployment }} in namespace {{ $labels.namespace }} has not made progress within the deadline. Check pod status and events."
```

This alert fires when a deployment fails to make progress, letting you respond quickly.

## Combining with Automatic Rollback

You can build automation that automatically rolls back failed deployments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deployment-monitor
data:
  monitor.sh: |
    #!/bin/bash
    while true; do
      # Find deployments that exceeded deadline
      kubectl get deployments --all-namespaces -o json | \
        jq -r '.items[] |
          select(
            .status.conditions[]? |
            select(.type=="Progressing" and .status=="False" and .reason=="ProgressDeadlineExceeded")
          ) |
          "\(.metadata.namespace) \(.metadata.name)"' | \
      while read namespace deployment; do
        echo "Deployment $namespace/$deployment exceeded deadline, rolling back..."
        kubectl rollout undo deployment/$deployment -n $namespace
      done

      sleep 60
    done
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: deployment-monitor
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: deployment-monitor
          containers:
          - name: monitor
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/monitor.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: deployment-monitor
          restartPolicy: OnFailure
```

This CronJob monitors for failed deployments and automatically rolls them back.

## Progress Deadline vs Liveness Probes

progressDeadlineSeconds and liveness probes serve different purposes:

**Liveness probes** detect when a running container is unhealthy and should be restarted. They operate at the pod level.

**progressDeadlineSeconds** detects when a deployment rollout is stuck and should be marked as failed. It operates at the deployment level.

Use both for comprehensive health monitoring:

```yaml
spec:
  progressDeadlineSeconds: 600
  template:
    spec:
      containers:
      - name: app
        image: myregistry.io/app:v2.0.0
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Edge Cases and Limitations

**Paused deployments don't count against the deadline**. If you pause a deployment, the progress deadline timer stops. When you resume, the timer continues from where it left off.

**The deadline applies to the entire rollout, not individual pods**. Even if some pods start successfully, if the rollout as a whole doesn't complete, it will exceed the deadline.

**Exceeding the deadline doesn't stop the rollout**. Kubernetes marks the deployment as failed, but it keeps trying to reconcile the desired state. You need to take manual action (or use automation) to roll back.

## Default Value

If you don't specify progressDeadlineSeconds, it defaults to 600 seconds (10 minutes). This is reasonable for many deployments, but you should set it explicitly based on your needs:

```bash
# Check the default value
kubectl get deployment web-app -o jsonpath='{.spec.progressDeadlineSeconds}'
```

## Best Practices

**Set progressDeadlineSeconds explicitly**. Don't rely on the default. Choose a value based on your deployment's characteristics.

**Make it at least 2x your expected rollout time**. This accounts for temporary issues and retries without marking deployments as failed prematurely.

**Alert on exceeded deadlines**. Use Prometheus or your monitoring system to notify you immediately when deployments fail.

**Test your deployment in staging**. Measure how long rollouts actually take and set progressDeadlineSeconds accordingly.

**Combine with automatic rollback**. Don't just detect failures; respond to them automatically.

**Document your choice**. Add an annotation explaining why you chose your timeout value:

```yaml
metadata:
  annotations:
    deployment.kubernetes.io/progress-deadline-reason: |
      Normal rollout takes ~8 minutes for 20 replicas.
      Set to 15 minutes to allow for temporary node issues.
```

## Conclusion

progressDeadlineSeconds turns deployment failures from silent problems into detectable events. Instead of deployments hanging indefinitely, you get clear failure signals within a defined timeframe.

Set it based on your deployment's real behavior, not arbitrary numbers. Monitor for exceeded deadlines and respond automatically with rollbacks or alerts. A stuck deployment that gets detected and fixed in 10 minutes is far better than one that hangs for hours before someone notices.
