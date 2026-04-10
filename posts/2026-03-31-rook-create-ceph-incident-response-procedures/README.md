# How to Create Ceph Incident Response Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Incident Response, Operation, Kubernetes

Description: Learn how to create structured Ceph incident response procedures covering severity levels, triage steps, escalation paths, and post-incident reviews to minimize recovery time.

---

## Define Severity Levels

Before writing procedures, establish what constitutes each severity level for your Ceph cluster:

| Severity | Condition | Response Time |
|----------|-----------|---------------|
| P1 | Cluster HEALTH_ERR, data unavailable | Immediate - 15 min |
| P2 | OSDs down, performance degraded | 30 min |
| P3 | HEALTH_WARN, capacity above 80% | 2 hours |
| P4 | Non-urgent alerts, informational | Next business day |

## Triage Checklist

When an alert fires, follow this triage sequence:

```bash
#!/bin/bash
# ceph-triage.sh - Run on alert receipt

echo "1. Check overall health"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail

echo "2. Check OSD status"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat

echo "3. Check which OSDs are down"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree | grep -E "down|out"

echo "4. Check PG status"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat

echo "5. Check recent log entries"
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph log last 50
```

## Common Incident Runbooks

### Runbook: OSD Down

```bash
# 1. Identify down OSD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree

# 2. Check OSD pod logs
kubectl -n rook-ceph logs -l app=rook-ceph-osd --tail=100

# 3. Check the underlying node
kubectl describe node <node-name>

# 4. If disk failure, mark OSD out and remove
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.<id>
```

### Runbook: Monitor Quorum Lost

```bash
# 1. Check monitor status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat

# 2. Check monitor pod status
kubectl -n rook-ceph get pods -l app=rook-ceph-mon

# 3. Describe failing monitor pod
kubectl -n rook-ceph describe pod rook-ceph-mon-a-<id>

# 4. Check node resources
kubectl top node
```

### Runbook: Capacity Critical (>85%)

```bash
# 1. Identify largest pools
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df detail

# 2. Identify largest RBD images by usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd du -p <pool-name>

# 3. Temporarily set noout flag to prevent rebalancing during remediation
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set noout
```

## Escalation Path

Document your escalation chain clearly:

```text
L1 On-call engineer
  |-> 15 min no resolution -> L2 Senior Storage Engineer
      |-> 30 min no resolution -> L3 Management + Vendor Support
```

Include contact details and on-call rotation links in the runbook document.

## Post-Incident Review Template

After every P1 or P2 incident, complete a post-incident review:

```yaml
Incident ID: INC-001
Date: 2026-03-31
Duration: 45 minutes
Severity: P2
Summary: 3 OSDs became unavailable due to disk failure on worker-node-2

Timeline:
- 14:00 - Alert fired: OSD down
- 14:05 - On-call acknowledged
- 14:20 - Root cause identified: disk failure
- 14:45 - OSDs removed, recovery complete

Root Cause: Physical disk failure on worker-node-2, /dev/sdc
Contributing Factors: No disk health monitoring (SMART) alerts configured
Action Items:
- Deploy SMART monitoring on all OSD nodes
- Add spare disks to worker-node-2
```

## Summary

Effective Ceph incident response requires pre-defined severity levels, a triage checklist, runbooks for common failure scenarios, a clear escalation path, and structured post-incident reviews. Having these procedures documented before an incident occurs dramatically reduces mean time to recovery and prevents repeated failures from the same root causes.
