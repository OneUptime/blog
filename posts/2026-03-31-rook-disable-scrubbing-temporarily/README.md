# How to Disable Scrubbing Temporarily in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Maintenance, Operation, Kubernetes

Description: Learn how to temporarily disable Ceph scrubbing during maintenance windows, high-load events, or cluster operations, and how to safely re-enable it afterward.

---

## When to Temporarily Disable Scrubbing

There are legitimate scenarios for temporarily stopping all scrubbing:
- During planned maintenance windows involving disk replacement
- During high-traffic events where every I/O cycle matters
- While recovering from cluster degradation (reduce background load)
- During upgrades to prevent additional I/O during critical operations
- When investigating a performance problem and wanting to isolate scrub impact

## Disabling Shallow Scrubbing

Set the `noscrub` OSD flag to stop shallow scrubs cluster-wide:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set noscrub

# Verify the flag is set
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep noscrub
```

## Disabling Deep Scrubbing

Set the `nodeep-scrub` flag to stop deep scrubs independently:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set nodeep-scrub

# Verify
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep nodeep-scrub
```

## Disabling Both Simultaneously

For complete scrub suspension:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set noscrub

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set nodeep-scrub

# Confirm health warning appears (expected)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail
```

Ceph will show `HEALTH_WARN` with `noscrub` flag when scrubbing is disabled - this is expected and intentional.

## Re-enabling Scrubbing

Always remember to re-enable scrubbing after the maintenance window:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd unset noscrub

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd unset nodeep-scrub

# Verify health returns to normal
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health
```

## Setting a Scrub Suspension with Auto-Expiry

To avoid forgetting to re-enable scrubbing, use a Kubernetes Job with a timeout:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: scrub-maintenance-window
  namespace: rook-ceph
spec:
  template:
    spec:
      containers:
      - name: scrub-manager
        image: rook/ceph:latest
        command:
        - bash
        - -c
        - |
          ceph osd set noscrub
          ceph osd set nodeep-scrub
          echo "Scrubbing disabled, waiting 4 hours..."
          sleep 14400
          ceph osd unset noscrub
          ceph osd unset nodeep-scrub
          echo "Scrubbing re-enabled"
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
          items:
          - key: keyring
            path: keyring
      restartPolicy: Never
```

## Disabling Scrubbing on Specific Pools

To disable scrubbing for only a specific pool:

```bash
# Set noscrub flag on a specific pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set my-pool noscrub 1

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set my-pool nodeep-scrub 1

# Re-enable
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set my-pool noscrub 0

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set my-pool nodeep-scrub 0
```

## Verifying Scrubs Have Stopped

Confirm that no scrubbing is actively occurring:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep -i scrub

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep "scrubbing"
```

## Summary

Temporarily disabling Ceph scrubbing is straightforward using the `noscrub` and `nodeep-scrub` OSD flags. Always document when you disable scrubbing and set a reminder or automated job to re-enable it. Extended periods without scrubbing increase the risk of undetected data corruption. Pool-level scrub flags provide finer-grained control when only specific pools need scrubbing suspended. Never leave scrubbing disabled for more than a few days in production environments.
