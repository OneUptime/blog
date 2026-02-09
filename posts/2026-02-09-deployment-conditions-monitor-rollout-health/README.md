# How to Use Deployment Conditions to Monitor Rollout Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Monitoring

Description: Learn how to use Kubernetes deployment conditions to monitor rollout health, detect failures early, and build automated responses to deployment issues for more reliable releases.

---

Your deployment shows as "running" in kubectl, but you don't know if the rollout actually completed successfully or if it's stuck in a bad state. You need a programmatic way to check deployment health beyond just counting pods.

Deployment conditions provide structured status information that tells you exactly what's happening with your rollout.

## Understanding Deployment Conditions

Kubernetes deployments maintain three key conditions:

**Available**: Indicates if the deployment has the minimum number of pods available.

**Progressing**: Indicates if the deployment is actively rolling out or has completed successfully.

**ReplicaFailure**: Indicates if the deployment failed to create or delete pods.

These conditions have:
- Type: The condition name
- Status: True, False, or Unknown
- Reason: Machine-readable reason code
- Message: Human-readable description
- LastUpdateTime: When the condition last changed
- LastTransitionTime: When the status last changed

## Checking Deployment Conditions

View conditions with kubectl:

```bash
# Get all conditions
kubectl get deployment api-server -o jsonpath='{.status.conditions[*]}' | jq

# Get specific condition
kubectl get deployment api-server -o jsonpath='{.status.conditions[?(@.type=="Available")]}' | jq

# Pretty format
kubectl describe deployment api-server | grep -A 10 "Conditions:"
```

Example output:

```
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
```

## Available Condition

The Available condition indicates whether the deployment has met its minimum availability requirements:

```yaml
conditions:
- type: Available
  status: "True"
  lastUpdateTime: "2026-02-09T10:30:00Z"
  lastTransitionTime: "2026-02-09T10:30:00Z"
  reason: MinimumReplicasAvailable
  message: Deployment has minimum availability.
```

Status values:
- **True**: Minimum replicas are available
- **False**: Not enough replicas available
- **Unknown**: Can't determine availability

Reasons for False status:
- MinimumReplicasUnavailable: Not enough pods are ready

Check programmatically:

```bash
# Exit 0 if available, 1 if not
kubectl get deployment api-server \
  -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' | \
  grep -q "True" && echo "Available" || echo "Not available"
```

## Progressing Condition

The Progressing condition tracks rollout progress:

```yaml
conditions:
- type: Progressing
  status: "True"
  lastUpdateTime: "2026-02-09T10:30:00Z"
  lastTransitionTime: "2026-02-09T10:25:00Z"
  reason: NewReplicaSetAvailable
  message: ReplicaSet "api-server-7d8f9c5b4d" has successfully progressed.
```

Common reasons:
- **NewReplicaSetAvailable**: Rollout completed successfully
- **ReplicaSetUpdated**: Creating new ReplicaSet
- **ProgressDeadlineExceeded**: Rollout took too long
- **FoundNewReplicaSet**: Started new rollout

When Progressing is False:

```yaml
conditions:
- type: Progressing
  status: "False"
  reason: ProgressDeadlineExceeded
  message: 'Deployment does not have minimum availability.'
```

This indicates the rollout failed.

## ReplicaFailure Condition

Appears only when there are issues creating or deleting replicas:

```yaml
conditions:
- type: ReplicaFailure
  status: "True"
  lastUpdateTime: "2026-02-09T10:30:00Z"
  lastTransitionTime: "2026-02-09T10:30:00Z"
  reason: FailedCreate
  message: 'Failed to create new replica set: error creating pods'
```

This condition is absent when everything works correctly.

## Building Health Checks

Create a health check script based on conditions:

```bash
#!/bin/bash
# check-deployment-health.sh

DEPLOYMENT=$1
NAMESPACE=${2:-default}

# Get all conditions
CONDITIONS=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o json | jq -r '.status.conditions')

# Check Available condition
AVAILABLE=$(echo $CONDITIONS | jq -r '.[] | select(.type=="Available") | .status')

# Check Progressing condition
PROGRESSING=$(echo $CONDITIONS | jq -r '.[] | select(.type=="Progressing") | .status')
PROGRESSING_REASON=$(echo $CONDITIONS | jq -r '.[] | select(.type=="Progressing") | .reason')

# Check ReplicaFailure condition
REPLICA_FAILURE=$(echo $CONDITIONS | jq -r '.[] | select(.type=="ReplicaFailure") | .status')

# Determine health
if [ "$AVAILABLE" != "True" ]; then
  echo "UNHEALTHY: Deployment not available"
  exit 1
fi

if [ "$PROGRESSING" == "False" ] && [ "$PROGRESSING_REASON" == "ProgressDeadlineExceeded" ]; then
  echo "UNHEALTHY: Rollout exceeded progress deadline"
  exit 1
fi

if [ "$REPLICA_FAILURE" == "True" ]; then
  echo "UNHEALTHY: Replica creation/deletion failed"
  exit 1
fi

if [ "$PROGRESSING" == "True" ] && [ "$PROGRESSING_REASON" == "NewReplicaSetAvailable" ]; then
  echo "HEALTHY: Deployment completed successfully"
  exit 0
fi

if [ "$PROGRESSING" == "True" ]; then
  echo "IN_PROGRESS: Deployment is rolling out"
  exit 0
fi

echo "UNKNOWN: Cannot determine deployment health"
exit 2
```

Use in CI/CD:

```bash
# Deploy and wait
kubectl apply -f deployment.yaml

# Check health
if ./check-deployment-health.sh api-server production; then
  echo "Deployment successful!"
else
  echo "Deployment failed, rolling back"
  kubectl rollout undo deployment/api-server -n production
  exit 1
fi
```

## Monitoring with Prometheus

Export deployment conditions as metrics:

```yaml
# kube-state-metrics exposes these
kube_deployment_status_condition{
  condition="Available",
  deployment="api-server",
  namespace="production",
  status="true"
} 1
```

Create alerts:

```yaml
groups:
- name: deployment_conditions
  rules:
  # Alert when deployment is not available
  - alert: DeploymentNotAvailable
    expr: |
      kube_deployment_status_condition{
        condition="Available",
        status="false"
      } == 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Deployment {{ $labels.deployment }} not available"
      description: "Deployment {{ $labels.deployment }} in namespace {{ $labels.namespace }} has not been available for 5 minutes"

  # Alert when rollout exceeds deadline
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

  # Alert on replica failures
  - alert: DeploymentReplicaFailure
    expr: |
      kube_deployment_status_condition{
        condition="ReplicaFailure",
        status="true"
      } == 1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Deployment {{ $labels.deployment }} has replica failures"
```

## Automated Rollback Based on Conditions

Build a controller that watches conditions and takes action:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deployment-monitor
data:
  monitor.sh: |
    #!/bin/bash
    while true; do
      # Find deployments with progress deadline exceeded
      FAILED_DEPLOYMENTS=$(kubectl get deployments --all-namespaces -o json | \
        jq -r '.items[] |
          select(
            .status.conditions[]? |
            select(.type=="Progressing" and .status=="False" and .reason=="ProgressDeadlineExceeded")
          ) |
          "\(.metadata.namespace) \(.metadata.name)"')

      echo "$FAILED_DEPLOYMENTS" | while read namespace deployment; do
        if [ -n "$deployment" ]; then
          echo "$(date): Deployment $namespace/$deployment exceeded deadline, rolling back"

          # Annotate for audit
          kubectl annotate deployment/$deployment -n $namespace \
            auto-rollback-reason="Progress deadline exceeded" \
            auto-rollback-time="$(date -Iseconds)"

          # Rollback
          kubectl rollout undo deployment/$deployment -n $namespace

          # Send notification (example: Slack webhook)
          curl -X POST $SLACK_WEBHOOK \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Auto-rolled back $namespace/$deployment due to progress deadline\"}"
        fi
      done

      sleep 60
    done
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: deployment-monitor
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: deployment-monitor
          containers:
          - name: monitor
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/monitor.sh"]
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: deployment-monitor
          restartPolicy: OnFailure
```

## Condition Transition Tracking

Track when conditions change for debugging:

```bash
# Get condition transition times
kubectl get deployment api-server -o json | \
  jq '.status.conditions[] | {
    type: .type,
    status: .status,
    reason: .reason,
    lastTransitionTime: .lastTransitionTime,
    lastUpdateTime: .lastUpdateTime
  }'
```

Output:

```json
{
  "type": "Available",
  "status": "True",
  "reason": "MinimumReplicasAvailable",
  "lastTransitionTime": "2026-02-09T10:00:00Z",
  "lastUpdateTime": "2026-02-09T10:00:00Z"
}
{
  "type": "Progressing",
  "status": "True",
  "reason": "NewReplicaSetAvailable",
  "lastTransitionTime": "2026-02-09T10:05:00Z",
  "lastUpdateTime": "2026-02-09T10:05:00Z"
}
```

The difference between `lastUpdateTime` and `lastTransitionTime` tells you:
- If they're the same: condition status changed
- If different: condition was updated but status remained the same

## Dashboard Integration

Display deployment health in Grafana:

```promql
# Overall deployment health score
sum(kube_deployment_status_condition{condition="Available",status="true"})
  /
sum(kube_deployment_status_condition{condition="Available"})

# Count of unhealthy deployments
count(kube_deployment_status_condition{condition="Available",status="false"})

# Deployments in progress
count(kube_deployment_status_condition{
  condition="Progressing",
  status="true",
  reason!="NewReplicaSetAvailable"
})
```

## Best Practices

**Check multiple conditions**. Don't just check if pods are running; verify Available and Progressing conditions.

**Set appropriate timeouts**. Use `progressDeadlineSeconds` to ensure conditions reflect reality.

**Monitor condition transitions**. Track how long deployments spend in each state.

**Alert on sustained issues**. Brief condition changes are normal; sustained ones indicate problems.

**Document expected states**. Add annotations explaining what conditions mean for your deployment:

```yaml
metadata:
  annotations:
    deployment.kubernetes.io/expected-conditions: |
      Available: True (always)
      Progressing: True with reason NewReplicaSetAvailable after rollout
      ReplicaFailure: Should never be present
```

**Combine with pod health**. Conditions tell you about the deployment; also check individual pod health.

## Troubleshooting with Conditions

When conditions indicate problems:

```bash
# 1. Check condition details
kubectl get deployment api-server -o yaml | grep -A 20 "conditions:"

# 2. Check ReplicaSet status
kubectl get replicasets -l app=api-server

# 3. Check pod events
kubectl get events --field-selector involvedObject.kind=Pod \
  --sort-by='.lastTimestamp'

# 4. Check recent deployment changes
kubectl rollout history deployment/api-server

# 5. Describe the deployment
kubectl describe deployment api-server
```

## Conclusion

Deployment conditions provide precise, machine-readable information about rollout health. They go beyond simple pod counts to tell you whether your deployment is available, progressing correctly, or experiencing failures.

Build your monitoring and automation around these conditions. Alert when Available becomes False, when Progressing indicates ProgressDeadlineExceeded, or when ReplicaFailure appears. Use conditions to trigger automated rollbacks, notify teams, and maintain deployment health dashboards.

Conditions turn deployment status from a fuzzy concept into concrete, actionable data that you can programmatically act upon.
