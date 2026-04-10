# How to Create Ceph Operational Checklists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Operational, Checklist, SRE, Reliability, Maintenance, Health

Description: Build actionable operational checklists for Ceph cluster health checks, maintenance procedures, upgrade readiness, and daily/weekly/monthly operational reviews.

---

## Why Operational Checklists Matter

Manual procedures are error-prone, especially under pressure. Checklists transform institutional knowledge into repeatable processes. For Ceph clusters, checklists prevent common failures like performing OSD maintenance while another OSD is down, or upgrading Ceph while the cluster is degraded.

## Daily Health Check Checklist

Run these checks every morning:

```bash
#!/bin/bash
# ceph-daily-health-check.sh

echo "=== Ceph Daily Health Check: $(date) ==="

echo ""
echo "1. Cluster Health Status"
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail

echo ""
echo "2. OSD Status Summary"
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd stat

echo ""
echo "3. Monitor Quorum"
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mon stat

echo ""
echo "4. Pool Usage (alert if >70% full)"
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph df | awk 'NR==1 || /[7-9][0-9]\.[0-9]+|100\./'

echo ""
echo "5. Stuck Placement Groups"
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph pg dump_stuck unclean | head -20

echo ""
echo "6. Slow Requests"
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep -i "slow requests"

echo "=== Health Check Complete ==="
```

## Pre-Maintenance Checklist

Before any maintenance activity:

```markdown
## Pre-Maintenance Checklist

**Date**: _________ **Performed by**: _________ **Approved by**: _________

### Cluster Health (must be HEALTH_OK before proceeding)
- [ ] `ceph health` returns HEALTH_OK
- [ ] All OSDs are up: `ceph osd stat` shows all OSDs up
- [ ] No pending recovery: `ceph pg stat` shows 0 degraded PGs
- [ ] No slow requests: `ceph health detail` shows no slow requests
- [ ] Monitor quorum is full: `ceph mon stat` shows all monitors in quorum

### Notification
- [ ] Maintenance window communicated to users
- [ ] Grafana silence created for the window
- [ ] On-call engineer notified
- [ ] Rollback plan documented

### Backup Verification
- [ ] Recent snapshot exists for critical pools
- [ ] Velero backup completed (if applicable)
```

## Upgrade Readiness Checklist

```markdown
## Upgrade Readiness Checklist

### Before Upgrading Ceph Version
- [ ] Review release notes for breaking changes
- [ ] Verify new Ceph version is supported by current Rook version
- [ ] Cluster health is HEALTH_OK
- [ ] All OSDs are in (no out OSDs)
- [ ] No active recovery or backfill operations
- [ ] Disk space >= 40% free on all OSDs (recovery needs headroom)
- [ ] Rook operator is healthy
- [ ] Test upgrade on staging cluster first

### Commands to Run Before Upgrade
```

```bash
# Set noout flag to prevent OSD out during upgrade
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd set noout

# Verify cluster state
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail

# Check Rook operator is running
kubectl get pods -n rook-ceph -l app=rook-ceph-operator
```

## Weekly Review Checklist

```markdown
## Weekly Operations Review

### Storage Capacity
- [ ] Review Grafana growth trend - is 30-day projection > 80% full?
- [ ] Check per-pool utilization - any pool > 75% full?
- [ ] Review PVC provisioning failures from the past week

### Performance Review
- [ ] Review OSD latency trends - any P99 > SLA threshold?
- [ ] Check for hot OSDs (uneven IO distribution)
- [ ] Review slow requests histogram

### Alerts Review
- [ ] Count alerts that fired in the past week
- [ ] Identify repeated alerts (possible systemic issue)
- [ ] Close resolved incidents

### Upcoming Maintenance
- [ ] Plan disk replacements for drives with SMART warnings
- [ ] Schedule scrub for pools that have not scrubbed in 7+ days
- [ ] Review pending Rook/Ceph version updates
```

## Incident Response Checklist

```markdown
## Incident Response: Ceph HEALTH_ERR

1. [ ] Acknowledge alert - notify on-call team
2. [ ] Run `ceph health detail` to identify root cause
3. [ ] Identify affected OSDs: `ceph osd tree`
4. [ ] Set `noout` if OSD is temporarily down: `ceph osd set noout`
5. [ ] Check OSD pod logs: `kubectl logs -n rook-ceph <osd-pod>`
6. [ ] Escalate if no resolution in 15 minutes
7. [ ] Document timeline in incident ticket
8. [ ] Unset `noout` after OSD is restored: `ceph osd unset noout`
9. [ ] Verify recovery completes: `ceph pg stat`
10. [ ] Write post-incident review
```

## Summary

Operational checklists for Ceph transform complex multi-step procedures into reliable, repeatable processes. Daily health checks catch problems early, pre-maintenance checklists prevent making things worse, and upgrade readiness checklists reduce the risk of failed updates. Storing these checklists in a shared wiki or Git repository ensures every team member follows the same verified procedure regardless of experience level or time of day.
