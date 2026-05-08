# Automating Diagnostic Collection with calicoctl node diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Automation, Diagnostic, Kubernetes, Monitoring

Description: Automate Calico diagnostic collection across clusters using calicoctl node diags for proactive monitoring, incident response, and audit compliance.

---

## Introduction

Collecting Calico diagnostics manually during an incident wastes precious time. By automating `calicoctl node diags` collection, you ensure diagnostic data is always available when you need it, whether for a current issue or for post-incident analysis.

Automated diagnostic collection serves multiple purposes: it captures baseline snapshots for comparison, provides immediate data during incidents, and creates audit trails for compliance. This guide shows how to build automated diagnostic collection into your operational workflows.

## Prerequisites

- Kubernetes cluster with Calico
- Matching-version `calicoctl` installed on each node where diagnostics will be collected
- Storage for diagnostic bundles (local, S3, or persistent volume)
- CI/CD or scheduling system
- `kubectl` access with appropriate RBAC
- SSH access to nodes when collecting node diagnostics from automation

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
          containers:
          - name: collector
            image: alpine:3.20
            command:
            - /bin/sh
            - -c
            - |
              set -e
              apk add --no-cache openssh-client kubectl
              echo "Collecting diagnostics at $(date)..."
              kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}' |
              while read -r NODE SSH_HOST; do
                echo "Collecting diagnostics from $NODE..."
                if ! ssh -o BatchMode=yes "$SSH_HOST" 'sudo calicoctl node diags'; then
                  echo "ERROR: Diagnostic collection failed on $NODE"
                  exit 1
                fi
                BUNDLE=$(ssh -o BatchMode=yes "$SSH_HOST" "ls -t /tmp/calico*/diags-*.tar.gz 2>/dev/null | head -1")
                if [ -n "$BUNDLE" ]; then
                  scp -o BatchMode=yes "$SSH_HOST:$BUNDLE" "/diags/${NODE}-$(date +%Y%m%d-%H%M%S).tar.gz"
                else
                  echo "ERROR: No diagnostic bundle created on $NODE"
                  exit 1
                fi
              done
            volumeMounts:
            - name: diags-storage
              mountPath: /diags
            - name: ssh-key
              mountPath: /root/.ssh
              readOnly: true
          volumes:
          - name: diags-storage
            persistentVolumeClaim:
              claimName: calico-diags-pvc
          - name: ssh-key
            secret:
              secretName: calico-diag-ssh
              defaultMode: 0400
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
    BUNDLE=$(ls -t /tmp/calico*/diags-*.tar.gz 2>/dev/null | head -1)
    mv "$BUNDLE" "$STORAGE_DIR/incident-$(date +%Y%m%d-%H%M%S).tar.gz"
  fi
  
  DOWN_PEERS=$(echo "$STATUS" | grep -v "Established" | grep -cE "node-to-node|global" || echo 0)
  if [ "$DOWN_PEERS" -gt 0 ]; then
    echo "$(date): $DOWN_PEERS BGP peers down - collecting diagnostics"
    sudo calicoctl node diags
    BUNDLE=$(ls -t /tmp/calico*/diags-*.tar.gz 2>/dev/null | head -1)
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
  local SSH_HOST=$2
  
  if ! ssh -o BatchMode=yes "$SSH_HOST" 'sudo calicoctl node diags' 2>/dev/null; then
    echo "$NODE: FAILED (calicoctl node diags failed)"
    return
  fi
  
  DIAG_FILE=$(ssh -o BatchMode=yes "$SSH_HOST" \
    "ls -t /tmp/calico*/diags-*.tar.gz 2>/dev/null | head -1" 2>/dev/null)
  
  if [ -n "$DIAG_FILE" ]; then
    scp -o BatchMode=yes "$SSH_HOST:$DIAG_FILE" "${OUTPUT_DIR}/${NODE}.tar.gz" 2>/dev/null
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
  SSH_HOST=$(kubectl get node "$NODE" -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
  collect_from_node "$NODE" "$SSH_HOST" &
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

- **CronJob fails with insufficient permissions**: Ensure the service account can list nodes and that the SSH user can run `sudo calicoctl node diags` on each node.
- **CronJob cannot connect to nodes**: Ensure the SSH key secret is mounted correctly and the target nodes allow the automation identity to run `sudo calicoctl node diags`.
- **Bundles taking too much storage**: Implement the cleanup script as a separate CronJob or reduce collection frequency.
- **Collection fails during high load**: Add resource limits and consider collecting from one node at a time during incidents.
- **Cannot copy files from nodes**: Verify that `scp` works from the automation environment and that the generated `diags-*.tar.gz` file exists under `/tmp/calico*/`.

## Conclusion

Automated diagnostic collection with `calicoctl node diags` transforms troubleshooting from a reactive scramble into a prepared process. By scheduling regular collections, triggering diagnostics on failures, and maintaining organized archives, you always have the data you need to diagnose Calico networking issues quickly and thoroughly.
