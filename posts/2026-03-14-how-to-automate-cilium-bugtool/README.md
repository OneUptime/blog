# Automating Cilium Bugtool Collection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Automation, Kubernetes, Diagnostics, CI/CD

Description: Automate cilium-bugtool collection across clusters with scheduled jobs, event-triggered captures, and CI/CD integration for proactive diagnostic data gathering.

---

## Introduction

Running cilium-bugtool manually during an incident is reactive and slow. Automating the collection process ensures diagnostic data is available when you need it -- before, during, and after issues occur. Scheduled collections build a diagnostic history, while event-triggered captures catch transient problems.

This guide covers automation patterns for cilium-bugtool, from simple cron-based collection to Kubernetes-native event-driven captures with automatic archive management.

## Prerequisites

- Kubernetes cluster with Cilium installed
- `kubectl` with cluster access
- Storage for diagnostic archives (local, PVC, or S3)
- Optional: alerting system for triggering on-demand captures

## Scheduled Collection Script

```bash
#!/bin/bash
# auto-bugtool.sh
# Automated cilium-bugtool collection with rotation

set -euo pipefail

ARCHIVE_DIR="${BUGTOOL_ARCHIVE_DIR:-/tmp/cilium-bugtool-archives}"
RETENTION_DAYS="${BUGTOOL_RETENTION_DAYS:-7}"
NAMESPACE="${CILIUM_NAMESPACE:-kube-system}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$ARCHIVE_DIR"

# Clean old archives
find "$ARCHIVE_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
echo "Cleaned archives older than $RETENTION_DAYS days"

# Collect from each Cilium pod
PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

COLLECTED=0
FAILED=0

while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue
  echo "[$TIMESTAMP] Collecting from $node..."

  if kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-bugtool 2>/dev/null; then

    ARCHIVE=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
      ls -t /tmp/cilium-bugtool-*.tar.gz 2>/dev/null | head -1)

    if [ -n "$ARCHIVE" ]; then
      kubectl -n "$NAMESPACE" cp \
        "$pod:$ARCHIVE" "$ARCHIVE_DIR/${TIMESTAMP}-${node}.tar.gz" \
        -c cilium-agent 2>/dev/null
      COLLECTED=$((COLLECTED + 1))

      # Clean up inside the container
      kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
        rm -f "$ARCHIVE" 2>/dev/null
    fi
  else
    echo "  WARNING: Failed to collect from $node"
    FAILED=$((FAILED + 1))
  fi
done <<< "$PODS"

echo "Collection complete: $COLLECTED succeeded, $FAILED failed"
echo "Archives stored in $ARCHIVE_DIR"
ls -lh "$ARCHIVE_DIR"/*${TIMESTAMP}* 2>/dev/null
```

## Kubernetes CronJob for Regular Collection

```yaml
# cilium-bugtool-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-bugtool-collector
  namespace: kube-system
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      activeDeadlineSeconds: 600
      template:
        spec:
          serviceAccountName: cilium
          containers:
          - name: collector
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d)
              PODS=$(kubectl -n kube-system get pods -l k8s-app=cilium \
                -o jsonpath='{.items[*].metadata.name}')
              for pod in $PODS; do
                echo "Collecting from $pod..."
                kubectl -n kube-system exec "$pod" -c cilium-agent -- \
                  cilium-bugtool 2>/dev/null || true
                ARCHIVE=$(kubectl -n kube-system exec "$pod" -c cilium-agent -- \
                  ls -t /tmp/cilium-bugtool-*.tar.gz 2>/dev/null | head -1)
                if [ -n "$ARCHIVE" ]; then
                  kubectl -n kube-system cp \
                    "$pod:$ARCHIVE" "/data/${TIMESTAMP}-${pod}.tar.gz" \
                    -c cilium-agent 2>/dev/null
                  echo "  Saved"
                fi
              done
            volumeMounts:
            - name: archive-storage
              mountPath: /data
          volumes:
          - name: archive-storage
            persistentVolumeClaim:
              claimName: bugtool-archives
          restartPolicy: OnFailure
```

## Event-Triggered Collection

Collect diagnostic data when Cilium agents restart or enter an error state:

```bash
#!/bin/bash
# watch-and-collect.sh
# Watch for Cilium pod events and trigger bugtool collection

NAMESPACE="kube-system"
ARCHIVE_DIR="/tmp/cilium-bugtool-events"
mkdir -p "$ARCHIVE_DIR"

echo "Watching for Cilium pod events..."

kubectl -n "$NAMESPACE" get events --watch-only \
  --field-selector reason=BackOff,involvedObject.kind=Pod 2>/dev/null | \
  while read -r line; do
    if echo "$line" | grep -q "cilium"; then
      TIMESTAMP=$(date +%Y%m%d-%H%M%S)
      echo "[$TIMESTAMP] Cilium event detected: $line"

      POD=$(echo "$line" | grep -oP 'cilium-\S+')
      if [ -n "$POD" ]; then
        echo "  Triggering bugtool on $POD..."
        kubectl -n "$NAMESPACE" exec "$POD" -c cilium-agent -- \
          cilium-bugtool 2>/dev/null && \
          echo "  Collection triggered" || \
          echo "  Pod not accessible for collection"
      fi
    fi
  done
```

## Upload to S3 for Long-Term Storage

```bash
#!/bin/bash
# upload-bugtool-s3.sh
# Upload bugtool archives to S3

S3_BUCKET="${S3_BUCKET:-s3://my-org-cilium-diagnostics}"
ARCHIVE_DIR="/tmp/cilium-bugtool-archives"
CLUSTER_NAME="${CLUSTER_NAME:-default}"

for archive in "$ARCHIVE_DIR"/*.tar.gz; do
  [ -f "$archive" ] || continue
  BASENAME=$(basename "$archive")
  S3_KEY="$CLUSTER_NAME/$BASENAME"

  echo "Uploading $BASENAME to $S3_BUCKET/$S3_KEY..."
  aws s3 cp "$archive" "$S3_BUCKET/$S3_KEY" --quiet && \
    echo "  Uploaded" || echo "  FAILED"
done
```

## Verification

```bash
# Test the collection script
bash auto-bugtool.sh

# Verify archives were created
ls -lh /tmp/cilium-bugtool-archives/

# Verify archive contents
tar tzf /tmp/cilium-bugtool-archives/*.tar.gz | head -10

# Test the CronJob
kubectl apply -f cilium-bugtool-cronjob.yaml
kubectl -n kube-system get cronjob cilium-bugtool-collector
```

## Troubleshooting

- **Collection timeout**: Increase `activeDeadlineSeconds` in the CronJob. Large clusters need more time.
- **PVC space exhausted**: Implement retention policies or upload to object storage before local cleanup.
- **Permission denied on copy**: Ensure the service account has exec and cp permissions.
- **Bugtool fails inside container**: Check disk space with `df -h` inside the pod.

## Conclusion

Automating cilium-bugtool collection ensures diagnostic data is always available when incidents occur. Scheduled collection builds a history for trend analysis, event-triggered captures catch transient issues, and integration with storage systems preserves data for post-incident review. These automation patterns transform cilium-bugtool from a reactive tool into a proactive observability component.
