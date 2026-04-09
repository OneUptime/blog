# How to Failover to Secondary Zone in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Multisite, Failover, Disaster Recovery, Zone

Description: Execute a failover from the primary zone to a secondary zone in Ceph RGW multisite by promoting the secondary zone to master and redirecting client traffic.

---

## Overview

When the primary Ceph RGW zone becomes unavailable due to hardware failure, network partition, or planned maintenance, you need to promote the secondary zone to master. This guide covers both planned (graceful) and emergency failover procedures.

## Prerequisites

- Ceph RGW multisite configured with primary and secondary zones
- Access to RGW hosts in the secondary zone
- DNS or load balancer control for client endpoint

## Check Secondary Zone Sync Status Before Failover

```bash
# On the secondary zone - check sync lag
radosgw-admin sync status

# Verify data sync is caught up
radosgw-admin sync status | grep -E "behind|caught up"

# Check specific bucket sync status
radosgw-admin bucket sync status --bucket=mybucket
```

## Planned Failover (Primary Zone Available)

When the primary is still available, stop writes there first:

```bash
# On primary zone - mark zone as non-master (graceful handoff)
# First ensure secondary is fully caught up
radosgw-admin sync status | grep "caught up"

# On secondary zone host - promote to master
radosgw-admin zone modify --rgw-zone=us-west --master
radosgw-admin period update --commit
```

## Emergency Failover (Primary Zone Unavailable)

When the primary is completely unreachable:

```bash
# On secondary zone host - force promote to master
radosgw-admin zone modify --rgw-zone=us-west --master
radosgw-admin period update --commit

# Restart RGW on secondary
systemctl restart ceph-radosgw@rgw.us-west
# Or in Rook:
kubectl -n rook-ceph delete pod -l app=rook-ceph-rgw,rgw=us-west
```

## Update DNS for Client Cutover

```bash
# Update DNS A record to point to secondary RGW load balancer
# Using Route 53 as example
aws route53 change-resource-record-sets --hosted-zone-id Z1234 \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "s3.example.com",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [{"Value": "10.0.2.100"}]
        }
      }]
    }'
```

## Verify Failover is Working

```bash
# Test write to secondary (now master) zone
aws s3 mb s3://failover-test --endpoint-url http://us-west-rgw.example.com
echo "failover-ok" | aws s3 cp - s3://failover-test/probe.txt \
    --endpoint-url http://us-west-rgw.example.com

# Verify zone is now master
radosgw-admin zone get --rgw-zone=us-west | grep master

# Check RGW log for write acceptance
journalctl -u ceph-radosgw@rgw.us-west --no-pager | tail -20
```

## Verify Data Consistency After Failover

```bash
# Check what was in-flight during failover
radosgw-admin datalog list

# Verify bucket stats on secondary
radosgw-admin bucket stats --bucket=critical-bucket

# Run a data integrity check
radosgw-admin bucket check --bucket=critical-bucket
```

## Monitor Secondary Zone After Failover

```bash
# Watch RGW error rate
ceph daemon rgw.us-west perf dump | python3 -m json.tool | grep -E "err|fail"

# Check for any orphan objects (note: radosgw-admin orphans find is deprecated)
rgw-orphan-list --pool us-west.rgw.buckets.data
```

## Summary

Failing over to a secondary Ceph RGW zone involves promoting the secondary zone to master using `radosgw-admin zone modify --master`, committing the updated period, and updating DNS to redirect client traffic. For emergency failovers where the primary is unreachable, expect some data loss based on the sync lag at the time of failure. Always verify write acceptance and run integrity checks after completing the failover.
