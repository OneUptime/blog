# How to Set Up Ceph Documentation Wikis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Documentation, Wiki, Operation

Description: Learn how to structure and maintain Ceph documentation wikis covering cluster topology, runbooks, change logs, and troubleshooting guides for effective team knowledge sharing.

---

## Why Ceph Needs Dedicated Documentation

Ceph clusters evolve over time - nodes are added, pools are tuned, and CRUSH rules are modified. Without centralized documentation, institutional knowledge lives only in engineers' heads, making onboarding difficult and incident response slower.

## Wiki Structure

Organize your Ceph wiki with a clear hierarchy:

```text
ceph-wiki/
  overview/
    cluster-topology.md
    hardware-inventory.md
    network-diagram.md
  runbooks/
    osd-replacement.md
    mon-recovery.md
    capacity-expansion.md
    version-upgrade.md
  configuration/
    pool-settings.md
    crush-map.md
    rgw-settings.md
    csi-configuration.md
  troubleshooting/
    common-errors.md
    performance-issues.md
    network-issues.md
  change-log/
    2026-changes.md
```

## Cluster Topology Page Template

Every team member should be able to find cluster details quickly:

```markdown
## Cluster: rook-ceph-prod

- Ceph Version: 18.2.1 (Reef)
- Rook Operator Version: 1.13.2
- Kubernetes Version: 1.29

### Nodes and OSDs

| Node          | OSD IDs | Disk Type | Capacity |
|---------------|---------|-----------|----------|
| worker-node-1 | 0, 1, 2 | NVMe SSD  | 3x 2TB   |
| worker-node-2 | 3, 4, 5 | NVMe SSD  | 3x 2TB   |
| worker-node-3 | 6, 7, 8 | HDD       | 3x 8TB   |

### Pools

| Pool Name | Type | Replicas | PGs | Use Case |
|-----------|------|----------|-----|----------|
| rbd       | replicated | 3 | 128 | Block storage |
| cephfs-data | replicated | 3 | 64 | Shared filesystem |
| rgw.buckets.data | replicated | 3 | 32 | Object storage |
```

## Automate Documentation Refresh

Keep the hardware inventory page up-to-date by scripting data collection:

```bash
#!/bin/bash
# refresh-ceph-docs.sh
echo "# Ceph Cluster State - $(date)" > /wiki/current-state.md
echo "" >> /wiki/current-state.md

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash -c "
  echo '## Health'
  ceph health detail
  echo '## OSD Tree'
  ceph osd tree
  echo '## Pool Summary'
  ceph df detail
  echo '## Version'
  ceph version
" >> /wiki/current-state.md
```

Commit this file to your Git-backed wiki repository automatically.

## Runbook Format

Use a consistent format for all runbooks to speed up incident response:

```markdown
# Runbook: Replace a Failed OSD

**Purpose**: Safely remove a failed OSD and replace the underlying disk.
**When to use**: OSD is persistently down and disk hardware has failed.
**Estimated duration**: 30-60 minutes depending on data size.

## Prerequisites
- kubectl access to rook-ceph namespace
- Physical access or remote IPMI to the affected node

## Steps

1. Identify the failed OSD ID
   ```bash
   ceph osd tree | grep -E "down|out"
   ```

2. Mark the OSD out
   ```bash
   ceph osd out osd.<id>
   ```

3. Wait for PG recovery to complete before removing the OSD.
```text

## Change Log Format

Track all configuration changes in a dated change log:

```markdown
## 2026-03-31

- **Added**: 3 new OSDs on worker-node-4 (osd.9, osd.10, osd.11)
- **Modified**: Increased rbd pool PG count from 128 to 256
- **Updated**: Rook operator from 1.13.1 to 1.13.2

## 2026-03-24

- **Fixed**: Resolved OSD 3 slow read issue by replacing disk on worker-node-2
```

## Summary

A well-structured Ceph documentation wiki contains cluster topology, hardware inventory, pool and CRUSH configuration, runbooks, and a change log. Automating the refresh of state-based pages through scripting ensures documentation stays accurate, reducing the knowledge gap between cluster changes and what the team can reference during incidents.
