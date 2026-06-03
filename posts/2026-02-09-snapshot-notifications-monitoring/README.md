# How to Configure Volume Snapshot Notifications and Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, Alerting, VolumeSnapshot

Description: Learn how to set up comprehensive monitoring and alerting for Kubernetes volume snapshots including creation failures, verification status, retention compliance, and cost tracking.

---

Effective snapshot monitoring ensures backup reliability through proactive alerting on failures, verification status tracking, retention compliance monitoring, and cost visibility. Without proper monitoring, backup failures go unnoticed until disasters strike.

## Prometheus Metrics for Snapshots

Expose snapshot metrics to Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: snapshot-metrics-exporter
  namespace: monitoring
data:
  exporter.py: |
    from prometheus_client import start_http_server, Gauge
    from kubernetes import client, config
    from datetime import datetime, timezone
    import time

    def parse_quantity(value):
        if not value:
            return 0

        suffixes = {
            'Ki': 1024,
            'Mi': 1024**2,
            'Gi': 1024**3,
            'Ti': 1024**4,
            'Pi': 1024**5,
            'K': 1000,
            'M': 1000**2,
            'G': 1000**3,
            'T': 1000**4,
            'P': 1000**5,
        }

        value = str(value)
        for suffix, multiplier in suffixes.items():
            if value.endswith(suffix):
                return int(float(value[:-len(suffix)]) * multiplier)

        return int(float(value))

    # Define metrics
    snapshot_count = Gauge('kubernetes_volumesnapshot_count',
                          'Total number of volume snapshots',
                          ['namespace', 'status'])

    snapshot_size = Gauge('kubernetes_volumesnapshot_size_bytes',
                         'Size of volume snapshots',
                         ['namespace', 'snapshot_name'])

    snapshot_age = Gauge('kubernetes_volumesnapshot_age_seconds',
                        'Age of volume snapshots',
                        ['namespace', 'snapshot_name', 'verified', 'schedule'])

    snapshot_retention = Gauge('kubernetes_volumesnapshot_retention_days',
                               'Configured retention policy for volume snapshots',
                               ['namespace', 'snapshot_name', 'verified', 'schedule'])

    snapshot_failures = Gauge('kubernetes_volumesnapshot_failures',
                              'Current number of volume snapshots with errors',
                              ['namespace'])

    def collect_metrics():
        api = client.CustomObjectsApi()
        snapshots = api.list_cluster_custom_object(
            group='snapshot.storage.k8s.io',
            version='v1',
            plural='volumesnapshots',
        )

        # Reset gauges
        snapshot_count._metrics.clear()
        snapshot_size._metrics.clear()
        snapshot_age._metrics.clear()
        snapshot_retention._metrics.clear()
        snapshot_failures._metrics.clear()

        for item in snapshots['items']:
            ns = item['metadata']['namespace']
            name = item['metadata']['name']
            annotations = item['metadata'].get('annotations', {})
            ready = item.get('status', {}).get('readyToUse', False)
            verified = annotations.get('backup.kubernetes.io/verified', 'false')
            schedule = annotations.get('backup.kubernetes.io/schedule', 'none')
            retention_days = int(annotations.get('backup.kubernetes.io/retention-days', '30'))

            # Count by status
            status = 'ready' if ready else 'not_ready'
            snapshot_count.labels(namespace=ns, status=status).inc()

            # Size
            restore_size = item.get('status', {}).get('restoreSize', '0')
            snapshot_size.labels(namespace=ns, snapshot_name=name).set(parse_quantity(restore_size))

            # Age
            created = item['metadata']['creationTimestamp']
            created_at = datetime.fromisoformat(created.replace('Z', '+00:00'))
            age_seconds = (datetime.now(timezone.utc) - created_at).total_seconds()
            snapshot_age.labels(
                namespace=ns,
                snapshot_name=name,
                verified=verified,
                schedule=schedule,
            ).set(age_seconds)

            snapshot_retention.labels(
                namespace=ns,
                snapshot_name=name,
                verified=verified,
                schedule=schedule,
            ).set(retention_days)

            # Failures
            if item.get('status', {}).get('error'):
                snapshot_failures.labels(namespace=ns).inc()

    if __name__ == '__main__':
        config.load_incluster_config()
        start_http_server(8000)
        while True:
            collect_metrics()
            time.sleep(60)
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-metrics-exporter
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: snapshot-metrics-reader
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: snapshot-metrics-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: snapshot-metrics-reader
subjects:
- kind: ServiceAccount
  name: snapshot-metrics-exporter
  namespace: monitoring
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: snapshot-metrics-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: snapshot-metrics-exporter
  template:
    metadata:
      labels:
        app: snapshot-metrics-exporter
    spec:
      serviceAccountName: snapshot-metrics-exporter
      containers:
      - name: exporter
        image: python:3.11-slim
        command:
        - /bin/bash
        - -c
        - |
          pip install prometheus-client kubernetes
          python /scripts/exporter.py
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: snapshot-metrics-exporter
---
apiVersion: v1
kind: Service
metadata:
  name: snapshot-metrics
  namespace: monitoring
  labels:
    app: snapshot-metrics-exporter
spec:
  selector:
    app: snapshot-metrics-exporter
  ports:
  - port: 8000
    targetPort: 8000
```

## Prometheus Alerting Rules

Define alerts for snapshot operations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: snapshot-alerts
  namespace: monitoring
data:
  snapshot-alerts.yaml: |
    groups:
    - name: snapshot-alerts
      interval: 60s
      rules:
      # Snapshot creation failures
      - alert: SnapshotCreationFailing
        expr: kubernetes_volumesnapshot_failures > 0
        for: 10m
        labels:
          severity: critical
          component: backup
        annotations:
          summary: "Volume snapshot creation failing"
          description: "Snapshot creation failures detected in namespace {{ $labels.namespace }}"

      # Old unverified snapshots
      - alert: UnverifiedSnapshots
        expr: kubernetes_volumesnapshot_age_seconds{verified="false"} > 86400
        for: 1h
        labels:
          severity: warning
          component: backup
        annotations:
          summary: "Snapshots not verified"
          description: "Snapshot {{ $labels.snapshot_name }} has not been verified in 24 hours"

      # High snapshot storage usage
      - alert: HighSnapshotStorage
        expr: sum(kubernetes_volumesnapshot_size_bytes) / 1024^4 > 1
        for: 1h
        labels:
          severity: warning
          component: cost
        annotations:
          summary: "High snapshot storage usage"
          description: "Total snapshot storage exceeds 1TiB ({{ $value }}TiB)"

      # Missing expected snapshots
      - alert: MissingScheduledSnapshot
        expr: |
          absent(kubernetes_volumesnapshot_age_seconds{schedule="daily"}) or
          min(kubernetes_volumesnapshot_age_seconds{schedule="daily"}) > 172800
        for: 1h
        labels:
          severity: critical
          component: backup
        annotations:
          summary: "Scheduled snapshot missing"
          description: "No daily snapshot created in 48 hours"

      # Snapshot retention violations
      - alert: RetentionPolicyViolation
        expr: |
          count(kubernetes_volumesnapshot_age_seconds >
            (kubernetes_volumesnapshot_retention_days * 86400))
        for: 1h
        labels:
          severity: warning
          component: compliance
        annotations:
          summary: "Snapshots exceeding retention policy"
          description: "{{ $value }} snapshots exceed retention policy"
```

## Slack Notification Integration

Send snapshot alerts to Slack:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-notifier
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: snapshot-notifier-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: snapshot-metrics-reader
subjects:
- kind: ServiceAccount
  name: snapshot-notifier
  namespace: monitoring
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-status-notifier
  namespace: monitoring
spec:
  schedule: "0 9 * * *"  # Daily at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-notifier
          restartPolicy: OnFailure
          containers:
          - name: notifier
            image: alpine:3.20
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-secrets
                  key: slack-webhook
            command:
            - /bin/sh
            - -c
            - |
              apk add --no-cache curl jq kubectl

              # Gather snapshot statistics
              TOTAL=$(kubectl get volumesnapshot --all-namespaces --no-headers | wc -l)
              READY=$(kubectl get volumesnapshot --all-namespaces -o json | \
                jq '[.items[] | select(.status.readyToUse == true)] | length')
              FAILED=$(kubectl get volumesnapshot --all-namespaces -o json | \
                jq '[.items[] | select(.status.error != null)] | length')

              # Check for issues
              COLOR="good"
              if [ "$FAILED" -gt 0 ]; then
                COLOR="danger"
              fi

              # Send notification
              curl -X POST "$SLACK_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d "{
                  \"attachments\": [{
                    \"color\": \"$COLOR\",
                    \"title\": \"Daily Snapshot Status Report\",
                    \"fields\": [
                      {\"title\": \"Total Snapshots\", \"value\": \"$TOTAL\", \"short\": true},
                      {\"title\": \"Ready\", \"value\": \"$READY\", \"short\": true},
                      {\"title\": \"Failed\", \"value\": \"$FAILED\", \"short\": true}
                    ],
                    \"footer\": \"Kubernetes Snapshot Monitor\",
                    \"ts\": $(date +%s)
                  }]
                }"
```

## Email Notification for Critical Events

Send email alerts for critical snapshot events:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: snapshot-failure-notifier
  namespace: monitoring
spec:
  template:
    spec:
      serviceAccountName: snapshot-notifier
      restartPolicy: OnFailure
      containers:
      - name: notifier
        image: alpine:3.20
        env:
        - name: SMTP_SERVER
          value: "smtp.gmail.com:587"
        - name: SMTP_USER
          valueFrom:
            secretKeyRef:
              name: smtp-credentials
              key: username
        - name: SMTP_PASSWORD
          valueFrom:
            secretKeyRef:
              name: smtp-credentials
              key: password
        - name: ALERT_EMAIL
          value: "ops-team@company.com"
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache curl jq kubectl mailx

          # Check for failed snapshots
          FAILED=$(kubectl get volumesnapshot --all-namespaces -o json | \
            jq -r '.items[] | select(.status.error != null) |
              "\(.metadata.namespace)/\(.metadata.name): \(.status.error.message)"')

          if [ -n "$FAILED" ]; then
            # Send email
            echo "$FAILED" | mail -s "ALERT: Volume Snapshot Failures Detected" \
              -S smtp="$SMTP_SERVER" \
              -S smtp-use-starttls \
              -S smtp-auth=login \
              -S smtp-auth-user="$SMTP_USER" \
              -S smtp-auth-password="$SMTP_PASSWORD" \
              "$ALERT_EMAIL"

            echo "Alert email sent to $ALERT_EMAIL"
          else
            echo "No failed snapshots found"
          fi
```

## Grafana Dashboard

Create a Grafana dashboard for snapshot monitoring:

```json
{
  "dashboard": {
    "title": "Volume Snapshot Monitoring",
    "panels": [
      {
        "title": "Total Snapshots",
        "targets": [{
          "expr": "sum(kubernetes_volumesnapshot_count)"
        }],
        "type": "stat"
      },
      {
        "title": "Ready Snapshots",
        "targets": [{
          "expr": "sum(kubernetes_volumesnapshot_count{status=\"ready\"})"
        }],
        "type": "stat"
      },
      {
        "title": "Failed Snapshots",
        "targets": [{
          "expr": "sum(kubernetes_volumesnapshot_failures)"
        }],
        "type": "stat"
      },
      {
        "title": "Total Snapshot Storage",
        "targets": [{
          "expr": "sum(kubernetes_volumesnapshot_size_bytes) / 1024^4"
        }],
        "type": "timeseries"
      },
      {
        "title": "Snapshot Age Distribution",
        "targets": [{
          "expr": "max by (namespace, snapshot_name) (kubernetes_volumesnapshot_age_seconds)"
        }],
        "type": "timeseries"
      },
      {
        "title": "Snapshots by Namespace",
        "targets": [{
          "expr": "sum by (namespace) (kubernetes_volumesnapshot_count)"
        }],
        "type": "piechart"
      }
    ]
  }
}
```

## Custom Webhook Notifications

Send notifications to custom endpoints:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-webhook-notifier
  namespace: monitoring
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-notifier
          restartPolicy: OnFailure
          containers:
          - name: notifier
            image: alpine:3.20
            env:
            - name: WEBHOOK_URL
              value: "https://monitoring.company.com/api/snapshots"
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: monitoring-api
                  key: api-key
            command:
            - /bin/sh
            - -c
            - |
              apk add --no-cache curl kubectl

              # Gather metrics
              SNAPSHOT_DATA=$(kubectl get volumesnapshot --all-namespaces -o json)

              # Send to webhook
              echo "$SNAPSHOT_DATA" | \
                curl -X POST "$WEBHOOK_URL" \
                  -H "Authorization: Bearer $API_KEY" \
                  -H "Content-Type: application/json" \
                  -d @-

              echo "Snapshot data sent to webhook"
```

## Monitoring Dashboard Script

Generate real-time monitoring dashboard:

```bash
#!/bin/bash
# snapshot-dashboard.sh

while true; do
  clear
  echo "=== Volume Snapshot Monitoring Dashboard ==="
  echo "Last updated: $(date)"
  echo

  # Summary metrics
  TOTAL=$(kubectl get volumesnapshot --all-namespaces --no-headers | wc -l)
  READY=$(kubectl get volumesnapshot --all-namespaces -o json | \
    jq '[.items[] | select(.status.readyToUse == true)] | length')
  FAILED=$(kubectl get volumesnapshot --all-namespaces -o json | \
    jq '[.items[] | select(.status.error != null)] | length')
  IN_PROGRESS=$((TOTAL - READY - FAILED))

  echo "Status:"
  echo "  Total: $TOTAL"
  echo "  Ready: $READY"
  echo "  In Progress: $IN_PROGRESS"
  echo "  Failed: $FAILED"
  echo

  # Storage usage
  STORAGE_GB=$(kubectl get volumesnapshot --all-namespaces -o json | \
    jq '
      def to_gib:
        if . == null then 0
        elif test("Ki$") then (sub("Ki$"; "") | tonumber) / 1048576
        elif test("Mi$") then (sub("Mi$"; "") | tonumber) / 1024
        elif test("Gi$") then sub("Gi$"; "") | tonumber
        elif test("Ti$") then (sub("Ti$"; "") | tonumber) * 1024
        else tonumber / 1073741824
        end;
      [.items[].status.restoreSize | to_gib] | add // 0')
  echo "Storage: ${STORAGE_GB}Gi"
  echo

  # Recent failures
  if [ "$FAILED" -gt 0 ]; then
    echo "Recent Failures:"
    kubectl get volumesnapshot --all-namespaces -o json | \
      jq -r '.items[] | select(.status.error != null) |
        "\(.metadata.namespace)/\(.metadata.name): \(.status.error.message)"' | \
      head -5
    echo
  fi

  # Oldest unverified
  echo "Oldest Unverified Snapshots:"
  kubectl get volumesnapshot --all-namespaces -o json | \
    jq -r '.items[] |
      select(.metadata.annotations."backup.kubernetes.io/verified" == null) |
      "\(.metadata.namespace)/\(.metadata.name)\t\(.metadata.creationTimestamp)"' | \
    head -5 | column -t -s $'\t'

  sleep 30
done
```

## Best Practices

1. **Set up alerts** for all critical snapshot operations
2. **Monitor creation failures** proactively
3. **Track verification status** for all snapshots
4. **Send daily summary reports** to operations teams
5. **Alert on storage cost** thresholds
6. **Monitor retention compliance** automatically
7. **Test notification channels** regularly
8. **Document escalation procedures** for failures

Comprehensive snapshot monitoring and alerting ensures backup reliability and prevents data loss by detecting issues before they impact recovery capabilities. Implement multiple notification channels for redundancy.
