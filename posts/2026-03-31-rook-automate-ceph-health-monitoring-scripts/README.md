# How to Automate Ceph Health Monitoring with Custom Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Automation, Shell

Description: Learn how to write custom scripts to automate Ceph health monitoring, parse health output, and trigger alerts or remediation actions.

---

While Prometheus and Grafana provide comprehensive dashboards, custom shell scripts are often the fastest way to automate specific health checks, integrate with legacy alerting systems, or implement automated remediation.

## Basic Health Check Script

```bash
#!/bin/bash
set -euo pipefail

NAMESPACE="rook-ceph"
TOOLBOX_POD=$(kubectl -n $NAMESPACE get pods -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

ceph_exec() {
  kubectl -n $NAMESPACE exec $TOOLBOX_POD -- ceph "$@"
}

# Check overall health
HEALTH=$(ceph_exec health --format json | python3 -m json.tool | \
  grep '"status"' | awk -F'"' '{print $4}')

echo "Ceph health: $HEALTH"

case $HEALTH in
  HEALTH_OK)
    exit 0
    ;;
  HEALTH_WARN)
    echo "WARNING: Ceph cluster has warnings"
    ceph_exec health detail
    exit 1
    ;;
  HEALTH_ERR)
    echo "ERROR: Ceph cluster has errors - immediate action required"
    ceph_exec health detail
    exit 2
    ;;
esac
```

## OSD Health Monitor

```bash
#!/bin/bash
NAMESPACE="rook-ceph"
TOOLBOX=$(kubectl -n $NAMESPACE get pods -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

DOWN_OSDS=$(kubectl -n $NAMESPACE exec $TOOLBOX -- \
  ceph osd stat --format json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['num_osds'] - d['num_up_osds'])")

if [ "$DOWN_OSDS" -gt 0 ]; then
  echo "ALERT: $DOWN_OSDS OSDs are down"
  kubectl -n $NAMESPACE exec $TOOLBOX -- ceph osd tree | grep down

  # Send to Slack
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"CEPH ALERT: $DOWN_OSDS OSDs are down. Check cluster immediately.\"}"
fi
```

## Capacity Alert Script

```bash
#!/bin/bash
NAMESPACE="rook-ceph"
TOOLBOX=$(kubectl -n $NAMESPACE get pods -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')
THRESHOLD=80  # Alert at 80% usage

USAGE_PCT=$(kubectl -n $NAMESPACE exec $TOOLBOX -- \
  ceph df --format json | \
  python3 -c "
import json, sys
d = json.load(sys.stdin)
total = d['stats']['total_bytes']
used = d['stats']['total_used_raw_bytes']
print(int((used / total) * 100))
")

echo "Cluster storage usage: ${USAGE_PCT}%"

if [ "$USAGE_PCT" -ge "$THRESHOLD" ]; then
  echo "ALERT: Ceph cluster is ${USAGE_PCT}% full (threshold: ${THRESHOLD}%)"
  kubectl -n $NAMESPACE exec $TOOLBOX -- ceph df
fi
```

## PG Consistency Monitor

```bash
#!/bin/bash
NAMESPACE="rook-ceph"
TOOLBOX=$(kubectl -n $NAMESPACE get pods -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

INCONSISTENT=$(kubectl -n $NAMESPACE exec $TOOLBOX -- \
  ceph pg stat --format json | \
  python3 -c "
import json, sys
d = json.load(sys.stdin)
# Find inconsistent PGs from pgs_by_state
count = sum(s['count'] for s in d.get('pgs_by_state', [])
            if 'inconsistent' in s.get('state_name', ''))
print(count)
" 2>/dev/null || echo 0)

if [ "$INCONSISTENT" -gt 0 ]; then
  echo "CRITICAL: $INCONSISTENT inconsistent PGs found"
fi
```

## Running as a Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-health-monitor
  namespace: rook-ceph
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rook-ceph-default
          containers:
          - name: monitor
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - /scripts/health-check.sh
            env:
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: monitoring-secrets
                  key: slack-webhook
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: ceph-health-scripts
          restartPolicy: OnFailure
```

## Summary

Custom health monitoring scripts complement Prometheus by providing targeted checks with specific remediation logic. Running them as Kubernetes CronJobs ensures regular execution while keeping the scripts version-controlled and auditable. Combining OSD health, capacity, and PG consistency checks in separate focused scripts makes maintenance easier and allows different alert thresholds for each concern.
