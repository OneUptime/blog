# Automating Diagnostic Collection with calicoctl node diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Automation, Diagnostics, Kubernetes, Monitoring

Description: Automate Calico diagnostic collection across clusters using calicoctl node diags for proactive monitoring, incident response, and audit compliance.

---

## Introduction

Collecting Calico diagnostics manually during an incident wastes precious time. By automating `calicoctl node diags` collection, you ensure diagnostic data is always available when you need it, whether for a current issue or for post-incident analysis.

Automated diagnostic collection serves multiple purposes: it captures baseline snapshots for comparison, provides immediate data during incidents, and creates audit trails for compliance. This guide shows how to build automated diagnostic collection into your operational workflows.

## Prerequisites

- Kubernetes cluster with Calico
- Storage for diagnostic bundles (local, S3, or persistent volume)
- CI/CD or scheduling system
- `kubectl` access with appropriate RBAC

## Scheduled Diagnostic Collection

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-diag-collector
  namespace: calico-system
spec:
  schedule: "0 */12 * * *"  # Every 12 hours
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          hostNetwork: true
          hostPID: true
          containers:
          - name: collector
            image: calico/ctl:v3.27.0
            securityContext:
              privileged: true
            command:
            - /bin/sh
            - -c
            - |
              echo "Collecting diagnostics at $(date)..."
              calicoctl node diags
              BUNDLE=$(ls -t /tmp/calico-diags-*.tar.gz 2>/dev/null | head -1)
              if [ -n "$BUNDLE" ]; then
                echo "Bundle created: $BUNDLE ($(du -h $BUNDLE | cut -f1))"
                # Copy to shared storage
                cp "$BUNDLE" /diags/
              else
                echo "ERROR: No diagnostic bundle created"
                exit 1
              fi
            volumeMounts:
            - name: diags-storage
              mountPath: /diags
            - name: var-log
              mountPath: /var/log/calico
              readOnly: true
          volumes:
          - name: diags-storage
            persistentVolumeClaim:
              claimName: calico-diags-pvc
          - name: var-log
            hostPath:
              path: /var/log/calico
          restartPolicy: Never
```

## Incident-Triggered Collection

Automatically collect diagnostics when issues are detected:

```bash
#!/bin/bash
# auto-diag-on-failure.sh
# Monitors BGP health and collects diagnostics on failure

STORAGE_DIR="/var/calico-diags"
CHECK_INTERVAL=60

mkdir -p "$STORAGE_DIR"

while true; do
  STATUS=$(sudo calicoctl node status 2>&1)
  
  if ! echo "$STATUS" | grep -q "Calico process is running"; then
    echo "$(date): Calico process failure detected - collecting diagnostics"
    sudo calicoctl node diags
    BUNDLE=$(ls -t /tmp/calico-diags-*.tar.gz | head -1)
    mv "$BUNDLE" "$STORAGE_DIR/incident-$(date +%Y%m%d-%H%M%S).tar.gz"
  fi
  
  DOWN_PEERS=$(echo "$STATUS" | grep -v "Established" | grep -cE "node-to-node|global" || echo 0)
  if [ "$DOWN_PEERS" -gt 0 ]; then
    echo "$(date): $DOWN_PEERS BGP peers down - collecting diagnostics"
    sudo calicoctl node diags
    BUNDLE=$(ls -t /tmp/calico-diags-*.tar.gz | head -1)
    mv "$BUNDLE" "$STORAGE_DIR/bgp-issue-$(date +%Y%m%d-%H%M%S).tar.gz"
  fi
  
  sleep "$CHECK_INTERVAL"
done
```

## Multi-Node Collection Pipeline

```bash
#!/bin/bash
# collect-cluster-diags.sh
# Collects diagnostics from all nodes in parallel

OUTPUT_DIR="cluster-diags-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

collect_from_node() {
  local NODE=$1
  local POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector spec.nodeName="$NODE" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  
  if [ -z "$POD" ]; then
    echo "$NODE: SKIP (no calico-node pod)"
    return
  fi
  
  kubectl exec -n calico-system "$POD" -- calicoctl node diags 2>/dev/null
  
  DIAG_FILE=$(kubectl exec -n calico-system "$POD" -- \
    sh -c 'ls -t /tmp/calico-diags-*.tar.gz 2>/dev/null | head -1' 2>/dev/null)
  
  if [ -n "$DIAG_FILE" ]; then
    kubectl cp "calico-system/${POD}:${DIAG_FILE}" "${OUTPUT_DIR}/${NODE}.tar.gz" 2>/dev/null
    echo "$NODE: collected"
  else
    echo "$NODE: FAILED"
  fi
}

# Collect in parallel (up to 5 at a time)
NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
PARALLEL=5
COUNT=0

for NODE in $NODES; do
  collect_from_node "$NODE" &
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $PARALLEL ]; then
    wait
    COUNT=0
  fi
done
wait

echo ""
echo "Diagnostics saved to $OUTPUT_DIR/"
ls -lh "$OUTPUT_DIR/"
```

## Cleanup Old Diagnostics

```bash
#!/bin/bash
# cleanup-old-diags.sh
# Removes diagnostic bundles older than 7 days

STORAGE_DIR="/var/calico-diags"
RETENTION_DAYS=7

echo "Cleaning up diagnostics older than $RETENTION_DAYS days..."
find "$STORAGE_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete -print
echo "Cleanup complete."
```

## Verification

Test the automated collection:

```bash
# Test the CronJob
kubectl create job --from=cronjob/calico-diag-collector test-diag-collection -n calico-system
kubectl logs -n calico-system -l job-name=test-diag-collection -f

# Verify bundles are stored
kubectl exec -n calico-system <pvc-pod> -- ls -lh /diags/
```

## Troubleshooting

- **CronJob fails with insufficient permissions**: Ensure the service account has the privileged security context and hostNetwork/hostPID access.
- **Bundles taking too much storage**: Implement the cleanup script as a separate CronJob or reduce collection frequency.
- **Collection fails during high load**: Add resource limits and consider collecting from one node at a time during incidents.
- **Cannot copy files from pods**: Verify that the kubectl cp command works and that tar is available in the container.

## Conclusion

Automated diagnostic collection with `calicoctl node diags` transforms troubleshooting from a reactive scramble into a prepared process. By scheduling regular collections, triggering diagnostics on failures, and maintaining organized archives, you always have the data you need to diagnose Calico networking issues quickly and thoroughly.
