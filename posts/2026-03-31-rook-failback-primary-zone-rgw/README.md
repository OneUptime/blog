# How to Failback to Primary Zone in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Failback, Disaster Recovery, Zone

Description: Execute a failback from the secondary zone back to the primary zone in Ceph RGW multisite after the primary is restored, with data resync and safe traffic cutover.

---

## Overview

After a failover to the secondary zone, you eventually need to fail back to the primary zone once it is restored. Failback requires resynchronizing data that was written to the secondary during the outage, then promoting the primary back to master and redirecting traffic.

## Prerequisites

- Primary zone restored and Ceph cluster healthy
- Secondary zone is currently the master
- Network connectivity between zones restored

## Step 1 - Verify Primary Zone Health

```bash
# On the primary zone - verify Ceph cluster is healthy
ceph status
ceph health detail

# Verify all OSDs are up
ceph osd tree | grep down

# Verify RGW on primary is running
systemctl status ceph-radosgw@rgw.us-east
# Or in Rook:
kubectl -n rook-ceph get pod -l app=rook-ceph-rgw,rgw=us-east
```

## Step 2 - Sync Data from Secondary to Primary

The primary needs to sync all writes that occurred during the failover period:

```bash
# On primary zone - pull the current period from secondary (now master)
radosgw-admin period pull --url=http://us-west-rgw.example.com \
    --access-key=<sync-access-key> --secret=<sync-secret-key>

# Restart RGW on primary so it picks up the new period and begins syncing
systemctl restart ceph-radosgw@rgw.us-east
# Or in Rook, the operator handles restarts when the CephObjectStore is updated

# Monitor sync progress
watch -n 10 'radosgw-admin sync status'
```

## Step 3 - Wait for Sync to Complete

```bash
# Wait until primary is fully caught up with secondary
radosgw-admin sync status | grep "caught up"

# Check sync lag
radosgw-admin sync status | grep "behind"

# Verify no data remaining to sync
radosgw-admin data sync status --source-zone=us-west | grep "caught up"
```

## Step 4 - Promote Primary Back to Master

Once sync is complete and the primary is fully caught up:

```bash
# On primary zone host - promote back to master
radosgw-admin zone modify --rgw-zone=us-east --master
radosgw-admin period update --commit

# Restart RGW on primary to apply the new period
systemctl restart ceph-radosgw@rgw.us-east
```

## Step 5 - Demote Secondary to Non-Master

```bash
# On secondary zone host - pull the updated period from the new master (primary)
radosgw-admin period pull --url=http://us-east-rgw.example.com \
    --access-key=<sync-access-key> --secret=<sync-secret-key>

# Restart RGW on secondary to pick up new config
systemctl restart ceph-radosgw@rgw.us-west
```

## Step 6 - Update DNS for Traffic Cutover

```bash
# Update DNS back to primary RGW endpoint
aws route53 change-resource-record-sets --hosted-zone-id Z1234 \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "s3.example.com",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [{"Value": "10.0.1.100"}]
        }
      }]
    }'
```

## Step 7 - Verify Primary is Accepting Writes

```bash
# Test write to primary
echo "failback-ok" | aws s3 cp - s3://test-bucket/failback-probe.txt \
    --endpoint-url http://us-east-rgw.example.com

# Verify sync from primary to secondary (normal direction)
sleep 60
aws s3 ls s3://test-bucket/failback-probe.txt \
    --endpoint-url http://us-west-rgw.example.com

# Check primary zone is master
radosgw-admin zone get --rgw-zone=us-east | grep master
```

## Post-Failback Checks

```bash
# Verify bidirectional sync is healthy
radosgw-admin sync status

# Check error rates
ceph daemon rgw.us-east perf dump | python3 -m json.tool | grep "err"

# Run bucket integrity check on critical buckets
radosgw-admin bucket check --bucket=critical-bucket
```

## Summary

Failing back to the primary Ceph RGW zone requires syncing data written during the outage from the secondary, waiting for full sync completion, promoting the primary back to master, and updating DNS. The critical step is confirming the primary is fully caught up before promoting it - failing back with a lagging primary would result in data loss from the failover period.
