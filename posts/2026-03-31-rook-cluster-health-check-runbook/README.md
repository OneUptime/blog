# How to Create a Ceph Cluster Health Check Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Runbook, Health Check, Monitoring, Kubernetes

Description: Learn how to create a comprehensive Ceph cluster health check runbook covering status commands, warning triage, PG states, and automated alerting procedures.

---

## Why a Health Check Runbook Matters

A Ceph cluster can silently degrade before it impacts workloads. A structured runbook ensures that any operator - experienced or new - can assess cluster health consistently and take the right actions without guesswork.

## Step 1: Check Overall Cluster Status

The first command in any health check is:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Look for `HEALTH_OK`. If you see `HEALTH_WARN` or `HEALTH_ERR`, capture the detail:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Step 2: Check OSD Status

OSDs are the storage daemons. Any OSD that is `down` reduces redundancy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

Expected output: all OSDs should show `up` and `in`. Flag any OSD showing `down` or `out` for investigation.

## Step 3: Verify Placement Group Health

Placement Groups (PGs) must be in `active+clean` state for healthy operation:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_stuck
```

Common PG states to escalate: `degraded`, `recovering`, `undersized`, `incomplete`.

## Step 4: Check Monitor Quorum

Monitors maintain cluster state. Quorum loss is a critical failure:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status | python3 -m json.tool
```

Ensure the quorum count matches your monitor deployment count.

## Step 5: Review Pool Usage

Check capacity against thresholds to prevent `HEALTH_ERR` due to full pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

Default Ceph thresholds: nearfull at 85%, backfillfull at 90%, full at 95%.

## Step 6: Runbook Template

Store the following as a scheduled health check script:

```bash
#!/bin/bash
set -euo pipefail
ROOK_NS="rook-ceph"
TOOLS_DEPLOY="deploy/rook-ceph-tools"

echo "=== Ceph Cluster Health Check ==="
echo "Timestamp: $(date -u)"

echo "--- Overall Status ---"
kubectl -n $ROOK_NS exec $TOOLS_DEPLOY -- ceph status

echo "--- OSD Summary ---"
kubectl -n $ROOK_NS exec $TOOLS_DEPLOY -- ceph osd stat

echo "--- PG Summary ---"
kubectl -n $ROOK_NS exec $TOOLS_DEPLOY -- ceph pg stat

echo "--- Capacity ---"
kubectl -n $ROOK_NS exec $TOOLS_DEPLOY -- ceph df

echo "--- Health Detail (if not OK) ---"
kubectl -n $ROOK_NS exec $TOOLS_DEPLOY -- ceph health detail
```

## Step 7: Automate with a CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-health-check
  namespace: rook-ceph
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: health-check
            image: rook/ceph:v1.13.0
            command: ["/bin/bash", "-c", "ceph status && ceph health detail"]
            volumeMounts:
            - name: ceph-config
              mountPath: /etc/ceph/ceph.conf
              subPath: ceph.conf
              readOnly: true
            - name: ceph-admin-keyring
              mountPath: /etc/ceph/keyring
              subPath: keyring
              readOnly: true
          volumes:
          - name: ceph-config
            configMap:
              name: rook-ceph-config
          - name: ceph-admin-keyring
            secret:
              secretName: rook-ceph-admin-keyring
          restartPolicy: OnFailure
```

## Summary

A Ceph health check runbook standardizes how your team assesses cluster state, covering OSD status, PG health, monitor quorum, and capacity. Automating these checks as a CronJob ensures continuous visibility and faster incident response.
