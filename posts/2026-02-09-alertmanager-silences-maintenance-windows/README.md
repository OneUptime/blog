# How to Create Alertmanager Silences Programmatically During Kubernetes Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, Kubernetes, Maintenance, Automation, DevOps

Description: Learn how to programmatically create and manage Alertmanager silences during Kubernetes maintenance windows to prevent alert noise from planned operations.

---

Maintenance operations like cluster upgrades and node replacement trigger floods of alerts. Manually creating silences before each maintenance window is error-prone and time-consuming. Programmatic silence creation automates alert suppression for planned work.

This guide covers using the Alertmanager API, CLI tools, and Kubernetes CronJobs to manage silences automatically.

## Understanding Alertmanager Silences

Silences temporarily suppress alerts matching specific label matchers without modifying alert rules. They have a defined start and end time, automatically expiring when maintenance completes.

Silences work by:

1. Matching alerts based on label selectors
2. Preventing matched alerts from sending notifications
3. Showing silenced alerts in the Alertmanager UI
4. Automatically expiring after the specified duration

## Using amtool to Create Silences

The amtool CLI provides the simplest way to create silences:

```bash
# Install amtool
wget https://github.com/prometheus/alertmanager/releases/download/v0.26.0/alertmanager-0.26.0.linux-amd64.tar.gz
tar xvf alertmanager-0.26.0.linux-amd64.tar.gz
sudo cp alertmanager-0.26.0.linux-amd64/amtool /usr/local/bin/

# Create a silence for namespace maintenance
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="ops-team" \
  --comment="Maintenance window for team-a namespace" \
  --duration=2h \
  namespace=team-a

# Create silence for specific alert
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="ops-team" \
  --comment="Node upgrade in progress" \
  --duration=1h \
  alertname=NodeNotReady \
  node=worker-03
```

The --duration flag sets how long the silence lasts.

## Creating Silences via HTTP API

Use the Alertmanager API directly for programmatic access:

```bash
# Create silence JSON payload
cat > silence.json <<EOF
{
  "matchers": [
    {
      "name": "namespace",
      "value": "team-a",
      "isRegex": false
    }
  ],
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "endsAt": "$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%S.000Z)",
  "createdBy": "ops-team",
  "comment": "Scheduled maintenance window"
}
EOF

# Post to Alertmanager
curl -X POST \
  -H "Content-Type: application/json" \
  -d @silence.json \
  http://alertmanager:9093/api/v2/silences
```

The API returns a silence ID that you can use to delete or extend the silence later.

## Creating Silences with Regex Matchers

Match multiple resources with regex:

```bash
# Silence all alerts for nodes being upgraded
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="ops-team" \
  --comment="Upgrading worker nodes 1-5" \
  --duration=3h \
  node=~'worker-0[1-5]'

# Silence multiple namespaces
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="ops-team" \
  --comment="Application deployment across envs" \
  --duration=30m \
  namespace=~'team-a-(prod|staging|dev)'
```

The =~ operator enables regex matching.

## Scripting Silence Creation for Node Drains

Automate silences when draining nodes for maintenance:

```bash
#!/bin/bash
# drain-node-with-silence.sh

NODE=$1
DURATION="1h"

# Create silence for node
SILENCE_ID=$(amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="automation" \
  --comment="Draining node $NODE for maintenance" \
  --duration=$DURATION \
  node=$NODE \
  --output=json | jq -r '.silenceID')

echo "Created silence: $SILENCE_ID"

# Cordon node
kubectl cordon $NODE

# Drain node
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --force

# Perform maintenance
echo "Node drained. Perform maintenance now."
read -p "Press enter when maintenance is complete..."

# Uncordon node
kubectl uncordon $NODE

# Delete silence early if maintenance completes early
amtool silence expire --alertmanager.url=http://alertmanager:9093 $SILENCE_ID

echo "Maintenance complete, silence removed"
```

This script creates a silence, drains the node, waits for maintenance, then removes the silence.

## Kubernetes CronJob for Recurring Maintenance

Schedule recurring maintenance windows with CronJobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-maintenance-silence
  namespace: monitoring
spec:
  # Every Sunday at 2 AM
  schedule: "0 2 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: alertmanager-silence-creator
          containers:
          - name: create-silence
            image: prom/alertmanager:v0.26.0
            command:
            - /bin/sh
            - -c
            - |
              amtool silence add \
                --alertmanager.url=http://alertmanager:9093 \
                --author="automation" \
                --comment="Weekly maintenance window" \
                --duration=4h \
                namespace=~'.*'
          restartPolicy: OnFailure
```

This creates a 4-hour silence every Sunday for all namespaces.

## Creating Silences Before Deployments

Integrate silence creation into CI/CD pipelines:

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    # Create silence before deployment
    - |
      SILENCE_ID=$(curl -X POST \
        -H "Content-Type: application/json" \
        -d '{
          "matchers": [
            {"name": "namespace", "value": "'"$NAMESPACE"'", "isRegex": false},
            {"name": "severity", "value": "warning", "isRegex": false}
          ],
          "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
          "endsAt": "'$(date -u -d '+30 minutes' +%Y-%m-%dT%H:%M:%S.000Z)'",
          "createdBy": "gitlab-ci",
          "comment": "Deployment in progress for '"$CI_COMMIT_REF_NAME"'"
        }' \
        http://alertmanager:9093/api/v2/silences | jq -r '.silenceID')
      echo "Created silence: $SILENCE_ID"

    # Deploy application
    - kubectl apply -f deployment.yaml

    # Wait for rollout
    - kubectl rollout status deployment/myapp -n $NAMESPACE

    # Remove silence after deployment
    - |
      curl -X DELETE \
        http://alertmanager:9093/api/v2/silence/$SILENCE_ID
```

## Managing Multiple Silences

Create silences for different severity levels:

```bash
# Silence all warnings during maintenance
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --author="ops" \
  --comment="Upgrade - warnings expected" \
  --duration=2h \
  severity=warning \
  namespace=team-a

# Keep critical alerts active
# (Don't create silence for severity=critical)
```

This allows critical issues to still alert while suppressing expected warnings.

## Listing and Managing Existing Silences

View active silences:

```bash
# List all silences
amtool silence query --alertmanager.url=http://alertmanager:9093

# List silences for specific namespace
amtool silence query --alertmanager.url=http://alertmanager:9093 \
  namespace=team-a

# Show silence details
amtool silence query --alertmanager.url=http://alertmanager:9093 \
  --output=json | jq
```

Delete silences:

```bash
# Expire silence by ID
amtool silence expire --alertmanager.url=http://alertmanager:9093 <silence-id>

# Expire all silences for a namespace
for id in $(amtool silence query --alertmanager.url=http://alertmanager:9093 \
  namespace=team-a --output=json | jq -r '.[].id'); do
  amtool silence expire --alertmanager.url=http://alertmanager:9093 $id
done
```

## Creating Silences from Kubernetes Annotations

Watch for maintenance annotations on namespaces:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  annotations:
    alertmanager.silence/enabled: "true"
    alertmanager.silence/duration: "2h"
    alertmanager.silence/comment: "Scheduled maintenance"
```

Controller to create silences from annotations:

```go
// Example controller code
func (r *NamespaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    ns := &corev1.Namespace{}
    if err := r.Get(ctx, req.NamespacedName, ns); err != nil {
        return ctrl.Result{}, err
    }

    if ns.Annotations["alertmanager.silence/enabled"] == "true" {
        duration := ns.Annotations["alertmanager.silence/duration"]
        comment := ns.Annotations["alertmanager.silence/comment"]

        // Create silence via API
        silence := createSilence(ns.Name, duration, comment)
        // ... post to Alertmanager
    }

    return ctrl.Result{}, nil
}
```

## Extending Existing Silences

Extend maintenance windows that run longer than expected:

```bash
# Get existing silence ID
SILENCE_ID=$(amtool silence query --alertmanager.url=http://alertmanager:9093 \
  namespace=team-a --output=json | jq -r '.[0].id')

# Get current silence and extend it
amtool silence query --alertmanager.url=http://alertmanager:9093 \
  --output=json | jq -r '.[0]' > current_silence.json

# Update endsAt time
jq '.endsAt = "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)'"' \
  current_silence.json > extended_silence.json

# Update silence (requires deleting old and creating new)
amtool silence expire --alertmanager.url=http://alertmanager:9093 $SILENCE_ID

curl -X POST \
  -H "Content-Type: application/json" \
  -d @extended_silence.json \
  http://alertmanager:9093/api/v2/silences
```

## Monitoring Silence Usage

Track silence creation and expiration:

```promql
# Active silences
alertmanager_silences

# Silences created per hour
increase(alertmanager_silences_active[1h])
```

Create alerts for unexpected silences:

```yaml
groups:
- name: silence_monitoring
  rules:
  - alert: TooManySilences
    expr: alertmanager_silences > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Many active silences"
      description: "{{ $value }} silences active"

  - alert: LongRunningSilence
    expr: |
      (alertmanager_silence_end_time - time()) > 86400
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Silence active for > 24h"
```

## Best Practices for Silence Management

1. **Always set authors**: Use --author to track who created silences
2. **Add detailed comments**: Explain why the silence was created
3. **Use appropriate durations**: Don't create week-long silences
4. **Match narrowly**: Silence specific alerts, not everything
5. **Clean up early**: Remove silences when maintenance completes
6. **Audit silences**: Review active silences regularly
7. **Automate recurring windows**: Use CronJobs for predictable maintenance

Programmatic silence management prevents alert fatigue from planned maintenance while ensuring real issues still generate notifications.
