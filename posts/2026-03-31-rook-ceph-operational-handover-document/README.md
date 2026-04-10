# How to Create a Ceph Operational Handover Document

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Documentation, Operation, Handover

Description: Create a comprehensive Ceph operational handover document covering cluster topology, access credentials, routine procedures, runbooks, and escalation contacts.

---

An operational handover document ensures that any engineer on your team - or a new team member - can understand and operate your Ceph cluster without tribal knowledge. This guide shows what to include.

## 1 - Cluster Overview

Start with a one-page summary that answers the key questions:

```markdown
## Cluster Overview

- Name: prod-ceph-01
- Ceph Version: 18.2.2 (Reef)
- Deployment Method: Rook v1.16 on Kubernetes
- Kubernetes Cluster: eks-prod-us-east-1
- MON Count: 3
- OSD Count: 18 (NVMe, 2 TB each)
- Total Usable: ~12 TB (replica 3)
- Current Usage: 8.2 TB (68%)
- Networking: Public 10.0.1.0/24, Cluster 10.0.2.0/24
```

## 2 - Access and Credentials

Document how to access the cluster without embedding secrets:

```markdown
## Access

### Kubernetes Access
- Cluster: eks-prod-us-east-1
- kubeconfig: Retrieved via `aws eks update-kubeconfig --name eks-prod-us-east-1`
- Rook namespace: rook-ceph

### Ceph Toolbox
```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash
```

### Dashboard
- URL: https://ceph-dashboard.internal.example.com
- Username: admin
- Password: stored in 1Password under "Ceph Dashboard - prod"
```bash

## 3 - Routine Procedures

Document the common tasks with exact commands:

```markdown
## Routine Procedures

### Daily Health Check
```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health detail
```

### Adding an OSD
1. Add the disk to the node (physical or cloud volume)
2. Update node labels if needed
3. Rook discovers and adds OSDs automatically within 10 minutes
4. Verify: `ceph osd tree`

### Replacing a Failed OSD
1. Identify the failed OSD: `ceph osd tree | grep down`
2. Follow runbook: runbooks/osd-replacement.md
```text

## 4 - Monitoring and Alerts

```markdown
## Monitoring

- Grafana: https://grafana.internal.example.com (dashboard ID: ceph-overview)
- Prometheus: https://prometheus.internal.example.com
- Alert routing: PagerDuty service "Ceph Production"

### Key Alerts
| Alert | Severity | Runbook |
|-------|---------|---------|
| CephHealthError | Critical | runbooks/health-err.md |
| CephOSDDown | Warning | runbooks/osd-down.md |
| CephPoolNearFull | Warning | runbooks/pool-full.md |
```

## 5 - Runbook Index

```markdown
## Runbooks

- runbooks/osd-down.md - Diagnosing and recovering a down OSD
- runbooks/mon-quorum-loss.md - Recovering MON quorum
- runbooks/pool-full.md - Responding to near-full and full pool alerts
- runbooks/slow-requests.md - Diagnosing slow request floods
- runbooks/upgrade.md - Ceph version upgrade procedure
```

## 6 - Escalation Contacts

```markdown
## Escalation

1. On-call engineer: PagerDuty rotation "Storage On-Call"
2. Storage team lead: Alice Smith (alice@example.com)
3. Ceph community: ceph-users@ceph.io or #ceph on OFTC IRC
4. Rook issues: https://github.com/rook/rook/issues
```

## Summary

A Ceph operational handover document covers cluster overview, access methods, routine procedures, monitoring details, a runbook index, and escalation contacts. Keeping it in version control alongside the Rook configuration files ensures it stays up to date as the cluster evolves. Any engineer should be able to respond to a 3 AM alert using only this document and the linked runbooks.
