# How to Set Up Automatic OSD Removal for Failed Disks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Automation, Failure Handling

Description: Learn how to automate OSD removal when disks fail in Ceph using Rook's built-in disk failure detection and custom scripts for prompt recovery.

---

In large Ceph clusters, waiting for manual OSD removal after disk failure slows recovery and leaves data under-replicated. Automating the detection and removal of failed OSDs accelerates cluster self-healing.

## Rook's Built-In Disk Failure Detection

Rook monitors OSD pods and can automatically remove crashed OSD deployments:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  healthCheck:
    daemonHealth:
      osd:
        disabled: false
        interval: 60s
    livenessProbe:
      osd:
        disabled: false
```

When an OSD pod crashes repeatedly, Rook marks it as failed.

## Enabling OSD Auto-Removal via Rook

Configure automatic removal of failed OSDs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  removeOSDsIfOutAndSafeToRemove: true
```

With this setting, Rook automatically removes OSDs that are both marked `out` by Ceph and considered safe to remove (no unique PGs).

## Script-Based Automatic OSD Removal

For more control, use a custom script:

```bash
#!/bin/bash
NAMESPACE="rook-ceph"
TOOLBOX=$(kubectl -n $NAMESPACE get pods -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

# Find OSDs that are down and out
DOWN_OSDS=$(kubectl -n $NAMESPACE exec $TOOLBOX -- \
  ceph osd dump --format json | \
  python3 -c "
import json, sys
d = json.load(sys.stdin)
failed = []
for osd in d.get('osds', []):
    if osd.get('in') == 0 and osd.get('up') == 0:
        osd_id = osd['osd']
        failed.append(str(osd_id))
print(' '.join(failed))
")

for osd_id in $DOWN_OSDS; do
  echo "Checking OSD $osd_id for safe removal..."

  # Check if safe to destroy
  SAFE=$(kubectl -n $NAMESPACE exec $TOOLBOX -- \
    ceph osd safe-to-destroy osd.$osd_id 2>&1 | grep -c "safe to destroy")

  if [ "$SAFE" -gt 0 ]; then
    echo "OSD $osd_id is safe to remove. Purging..."
    kubectl -n $NAMESPACE exec $TOOLBOX -- \
      ceph osd purge $osd_id --yes-i-really-mean-it
    echo "OSD $osd_id removed"
  else
    echo "OSD $osd_id is NOT safe to remove yet - waiting for rebalance"
  fi
done
```

## Deploying as a CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-osd-cleanup
  namespace: rook-ceph
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rook-ceph-default
          containers:
          - name: osd-cleanup
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/osd-cleanup.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: ceph-automation-scripts
          restartPolicy: OnFailure
```

## Triggering Notifications on OSD Removal

Add notification to the removal script:

```bash
notify_removal() {
  local osd_id=$1
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"Ceph: OSD $osd_id automatically removed after disk failure. Please replace the disk.\"}"
}
```

## Safe Removal Verification

Always use `ceph osd safe-to-destroy` before removing:

```bash
ceph osd safe-to-destroy osd.5
# Output: OSD(s) 5 are safe to destroy without reducing data durability.
```

## Summary

Automating OSD removal for failed disks combines Rook's built-in `removeOSDsIfOutAndSafeToRemove` setting with custom CronJob scripts for more granular control. The key safety check is always verifying that `ceph osd safe-to-destroy` passes before purging an OSD. Adding Slack or PagerDuty notifications ensures operators know when disks need physical replacement.
