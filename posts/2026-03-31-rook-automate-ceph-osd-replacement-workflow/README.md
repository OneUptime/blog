# How to Automate Ceph OSD Replacement Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Automation, Replacement, Operation

Description: Automate the Ceph OSD replacement workflow with a script that safely removes a failed OSD, triggers rebalancing, and prepares the slot for a new drive.

---

Replacing a failed OSD in Ceph requires a precise sequence of steps to avoid data loss and minimize recovery time. Automating this workflow reduces human error and ensures each replacement follows the same safe procedure.

## OSD Replacement Workflow Overview

The safe replacement sequence is:
1. Verify OSD is truly failed (not just slow)
2. Mark OSD out to trigger data migration
3. Wait for recovery to complete
4. Remove the OSD from the cluster
5. Physically remove or zero the device
6. Add the new OSD

## Automated Replacement Script

```bash
#!/bin/bash
# replace-osd.sh
# Usage: ./replace-osd.sh <osd_id>

set -euo pipefail

OSD_ID="${1:?OSD ID required}"
NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
TOOLS="deploy/rook-ceph-tools"
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-3600}"  # 1 hour
CHECK_INTERVAL=30

ceph_cmd() {
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- ceph "$@"
}

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
```

## Step 1: Verify OSD Status

```bash
verify_osd_failed() {
  log "Verifying OSD $OSD_ID status..."
  local osd_up
  osd_up=$(ceph_cmd osd tree --format json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for node in data['nodes']:
    if node.get('id') == $OSD_ID:
        print(node.get('status', 'unknown'))
        break
")
  log "OSD $OSD_ID status: $osd_up"
  if [[ "$osd_up" == "up" ]]; then
    log "WARNING: OSD $OSD_ID appears to be up. Confirm replacement is needed."
    read -rp "Continue? [y/N] " confirm
    [[ "$confirm" != "y" ]] && exit 0
  fi
}
```

## Step 2: Mark OSD Out and Wait for Recovery

```bash
mark_osd_out() {
  log "Marking OSD $OSD_ID out..."
  ceph_cmd osd out "osd.$OSD_ID"
  log "OSD $OSD_ID marked out. Waiting for data migration..."

  local elapsed=0
  while true; do
    local cluster_status
    cluster_status=$(ceph_cmd status --format json)
    local degraded
    degraded=$(echo "$cluster_status" | python3 -c "
import sys, json
d = json.load(sys.stdin)
pgmap = d.get('pgmap', {})
print(pgmap.get('degraded_objects', 0) + pgmap.get('misplaced_objects', 0))
")
    log "Degraded/misplaced objects: $degraded (elapsed: ${elapsed}s)"
    [[ "$degraded" -eq 0 ]] && break
    sleep "$CHECK_INTERVAL"
    elapsed=$((elapsed + CHECK_INTERVAL))
    if [[ "$elapsed" -ge "$RECOVERY_TIMEOUT" ]]; then
      log "ERROR: Recovery timeout after ${RECOVERY_TIMEOUT}s"
      exit 1
    fi
  done
  log "Data migration complete."
}
```

## Step 3: Remove the OSD

```bash
remove_osd() {
  log "Stopping OSD $OSD_ID..."

  # Find the OSD pod
  local osd_pod
  osd_pod=$(kubectl -n "$NAMESPACE" get pods -l "ceph-osd-id=$OSD_ID" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [[ -n "$osd_pod" ]]; then
    log "Deleting OSD pod: $osd_pod"
    kubectl -n "$NAMESPACE" delete pod "$osd_pod" --grace-period=0
  fi

  log "Removing OSD $OSD_ID from CRUSH map..."
  ceph_cmd osd crush remove "osd.$OSD_ID"

  log "Removing OSD auth key..."
  ceph_cmd auth del "osd.$OSD_ID"

  log "Removing OSD $OSD_ID from cluster..."
  ceph_cmd osd rm "osd.$OSD_ID"

  log "OSD $OSD_ID removed successfully."
}
```

## Step 4: Prepare for New Drive (Rook)

```bash
prepare_for_new_osd() {
  log "Preparing node for new OSD..."

  # Find the OSD deployment and its PVC
  local osd_deploy
  osd_deploy=$(kubectl -n "$NAMESPACE" get deploy -l "ceph-osd-id=$OSD_ID" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

  if [[ -n "$osd_deploy" ]]; then
    local osd_pvc
    osd_pvc=$(kubectl -n "$NAMESPACE" get deploy "$osd_deploy" \
      -o jsonpath='{.spec.template.spec.volumes[?(@.persistentVolumeClaim)].persistentVolumeClaim.claimName}' \
      2>/dev/null || echo "")

    log "Deleting OSD deployment: $osd_deploy"
    kubectl -n "$NAMESPACE" delete deploy "$osd_deploy"

    if [[ -n "$osd_pvc" ]]; then
      log "Deleting OSD PVC: $osd_pvc"
      kubectl -n "$NAMESPACE" delete pvc "$osd_pvc"
    fi
  fi

  log "When the new drive is inserted, Rook will automatically detect"
  log "and provision a new OSD. Monitor with:"
  log "  kubectl -n $NAMESPACE get pods -l app=rook-ceph-osd -w"
}
```

## Main Execution

```bash
log "Starting OSD $OSD_ID replacement workflow"
verify_osd_failed
mark_osd_out
remove_osd
prepare_for_new_osd

log "Replacement workflow complete. Verify cluster health:"
ceph_cmd status
```

## Summary

Automating the OSD replacement workflow prevents common mistakes like removing an OSD before data migration completes. By encoding the safe sequence of mark-out, wait, remove, and prepare steps into a script, you can replace a failed drive in minutes while ensuring data integrity is maintained throughout the process.
