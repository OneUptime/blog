# How to Plan Multisite DR Strategy with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Disaster Recovery, DR, Object Storage

Description: Plan a disaster recovery strategy for Ceph RGW multisite deployments covering RTO/RPO objectives, zone topology, sync lag monitoring, and failover procedures.

---

## Overview

Ceph RGW multisite replication enables disaster recovery by asynchronously replicating object data between zones in different physical locations. Planning a robust DR strategy requires understanding the replication model, defining recovery objectives, and documenting clear failover procedures.

## Understanding RGW Multisite Architecture

```text
Realm
  Zone Group (zonegroup)
    Zone A (primary) <---sync---> Zone B (secondary)
        RGW instances                RGW instances
        Ceph cluster A               Ceph cluster B
```

Key concepts:
- **Realm** - top-level namespace spanning all sites
- **Zone Group** - geographic grouping (e.g., US-East)
- **Zone** - a single Ceph cluster with RGW instances
- **Master zone** - handles authoritative metadata operations (e.g., bucket and user creation); all zones accept writes which are replicated via sync

## Defining RTO and RPO

Before configuring DR, define your objectives:

```text
RPO (Recovery Point Objective): Maximum acceptable data loss
  - With RGW sync: typically 1-60 minutes depending on sync lag
  - Monitor sync lag to verify RPO is achievable

RTO (Recovery Time Objective): Maximum acceptable downtime
  - Manual failover: 15-60 minutes
  - Scripted failover: 5-15 minutes
  - With DNS automation: 1-5 minutes
```

## Checking Current Sync Status

```bash
# View overall sync status
radosgw-admin sync status

# Check sync lag for each zone
radosgw-admin sync status | grep "behind"

# List zones and their sync state
radosgw-admin zone list
radosgw-admin zonegroup get | python3 -m json.tool
```

## Topology Design Considerations

```bash
# Create realm and zone group
radosgw-admin realm create --rgw-realm=production --default
radosgw-admin zonegroup create --rgw-zonegroup=us --master --default

# Create primary zone
radosgw-admin zone create --rgw-zonegroup=us --rgw-zone=us-east \
    --master --default

# Create secondary DR zone
radosgw-admin zone create --rgw-zonegroup=us --rgw-zone=us-west \
    --endpoints=http://us-west-rgw.example.com:7480

# Commit the period
radosgw-admin period update --commit
```

## DNS and Load Balancer Planning

```bash
# Primary DNS record
# s3.example.com --> us-east-rgw-lb.example.com

# Failover DNS record (lower TTL for fast cutover)
# s3.example.com TTL=60 --> us-east-rgw-lb.example.com
# On failover: change to --> us-west-rgw-lb.example.com
```

## DR Runbook Checklist Template

```yaml
DR Runbook: RGW Zone Failover
===============================
Pre-failover:
  [ ] Verify secondary zone sync lag < RPO threshold
  [ ] Confirm no writes in-flight on primary
  [ ] Notify stakeholders of planned/unplanned failover

Failover:
  [ ] Promote secondary zone to master
  [ ] Update DNS records
  [ ] Verify RGW on secondary is accepting writes
  [ ] Run smoke test against secondary endpoint

Post-failover:
  [ ] Monitor error rates on secondary
  [ ] Document data loss (if any) for RPO reporting
  [ ] Begin planning failback
```

## Testing DR Readiness

```bash
# Monthly DR test script
# 1. Check sync lag
SYNC_LAG=$(radosgw-admin sync status 2>&1 | grep "behind" | awk '{print $1}')
echo "Current sync lag: $SYNC_LAG"

# 2. Write a test object to primary
echo "dr-test-$(date +%s)" | aws s3 cp - s3://dr-test-bucket/probe.txt \
    --endpoint-url http://us-east-rgw.example.com

# 3. Verify it appears on secondary within RPO window
sleep 300  # Wait 5 minutes
aws s3 ls s3://dr-test-bucket/probe.txt \
    --endpoint-url http://us-west-rgw.example.com
```

## Summary

Planning Ceph RGW multisite DR requires defining RPO/RTO objectives, designing a zone topology that meets those objectives, and documenting detailed failover runbooks. Monitor sync lag continuously to verify the cluster is meeting its RPO target, and run regular DR tests to ensure the failover procedure works when needed. Keep DNS TTLs short for faster automated cutover.
