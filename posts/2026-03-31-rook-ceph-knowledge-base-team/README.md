# How to Build a Ceph Knowledge Base for Your Team

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Knowledge Base, Documentation, Team

Description: Build a Ceph knowledge base for your team by organizing runbooks, post-mortems, procedures, and reference docs in a structure that reduces mean time to resolution.

---

Tribal knowledge about Ceph operations is a team risk. When the one person who knows how to recover MON quorum is on vacation during an incident, a team knowledge base becomes the difference between a 15-minute fix and a 4-hour outage.

## Knowledge Base Structure

Organize content into four categories:

```text
ceph-knowledge-base/
  reference/          # What things are and how they work
  procedures/         # How to perform specific tasks
  runbooks/           # How to respond to specific alerts or failures
  post-mortems/       # What went wrong and what we learned
```

## Reference Documentation

Reference docs explain concepts and cluster-specific configuration:

```markdown
# reference/cluster-topology.md

## Production Cluster (prod-ceph-01)

### MON Nodes
- ceph-mon-1: 10.0.1.10 (primary)
- ceph-mon-2: 10.0.1.11
- ceph-mon-3: 10.0.1.12

### OSD Distribution
- Rack A: OSD 0-5 (ceph-osd-1, 2)
- Rack B: OSD 6-11 (ceph-osd-3, 4)
- Rack C: OSD 12-17 (ceph-osd-5, 6)

### Pool Purpose Map
- replicapool: RBD images for Kubernetes PVCs
- cephfs-data: CephFS for shared storage
- .rgw.root: RGW object storage
```

## Procedure Documentation

Procedures cover routine operational tasks:

```markdown
# procedures/add-osd.md

## Adding a New OSD

### When to use this
When adding capacity to the cluster.

### Steps
1. Verify the new disk has no existing partitions:
```bash
lsblk /dev/sdX
wipefs -a /dev/sdX
```
2. Label the node if required by Rook OSD placement rules
3. Rook auto-discovers and provisions the OSD within 10 minutes
4. Verify success:
```bash
ceph osd tree
watch ceph status  # Watch for recovery to complete
```
```markdown

## Runbooks

Runbooks are incident response guides tied to specific alerts:

```markdown
# runbooks/osd-down.md

## Alert: CephOSDDown

### Immediate Actions (0-5 minutes)
1. Check if the OSD is restarting automatically:
```bash
kubectl get pods -n rook-ceph | grep osd
```
2. Check health:
```bash
ceph health detail
```

### Diagnosis (5-15 minutes)
```bash
ceph daemon osd.N status
journalctl -u ceph-osd@N --since "30 min ago" -p err
smartctl -a /dev/sdX
```

### Resolution
- If disk failed: follow procedures/replace-osd.md
- If memory issue: check node OOM killer logs
- If network: follow runbooks/connectivity.md
```markdown

## Keeping the Knowledge Base Current

Automate freshness with a simple process:

```bash
# Add to post-incident review
# 1. Was documentation used?
# 2. Was it accurate?
# 3. What needs updating?
git add post-mortems/2026-03-15-osd-crash.md
git commit -m "Add post-mortem for OSD crash incident"
```

## Making It Discoverable

Use a team wiki (Notion, Confluence, or a Git repo with a README index) that all team members can search. Add a table of contents:

```markdown
# Ceph Knowledge Base

## Quick Links
- [5-Minute Health Check](procedures/health-check.md)
- [Alert Runbooks](runbooks/)
- [Cluster Topology](reference/cluster-topology.md)
- [Recent Post-Mortems](post-mortems/)
```

## Summary

A Ceph team knowledge base organized into reference docs, procedures, runbooks, and post-mortems reduces mean time to resolution during incidents and accelerates onboarding of new team members. The key to keeping it useful is a lightweight update process tied to every incident review and procedure change, preventing the knowledge base from becoming stale.
