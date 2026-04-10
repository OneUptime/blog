# How to Set Up Active-Passive RGW Multisite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Active-Passive, Multisite, Disaster Recovery

Description: Learn how to configure active-passive Ceph RGW multisite where one zone serves production traffic and the other acts as a hot standby for disaster recovery.

---

## Active-Passive Overview

In active-passive multisite:
- The **active zone** serves all reads and writes from clients
- The **passive zone** is read-only and receives data via async replication from the active zone
- The passive zone becomes active during disaster recovery

This is the preferred pattern when you need a DR copy without routing production traffic to both sites.

## Step 1: Configure the Active Zone

Set up the primary zone normally:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm create --rgw-realm=mycompany --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup create \
  --rgw-zonegroup=us --master --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-primary \
  --master --default \
  --endpoints=http://rgw-primary:80

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Step 2: Configure the Passive (Read-Only) Zone

Pull the realm on the secondary cluster and create a read-only zone:

```bash
# On secondary cluster
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm pull \
  --url=http://rgw-primary:80 \
  --access-key=sync-key \
  --secret=sync-secret

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-dr \
  --access-key=sync-key \
  --secret=sync-secret \
  --endpoints=http://rgw-dr:80 \
  --read-only

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Step 3: Verify Read-Only Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone get --rgw-zone=us-dr | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('read_only:', d.get('read_only', 'not set'))"
```

## Step 4: Test Replication

Write to the primary and verify the DR zone receives the data:

```bash
# Write to primary
aws s3 cp /etc/hostname s3://my-bucket/test.txt --endpoint-url http://rgw-primary:80

# Check sync status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync status

# Read from DR zone (read-only)
aws s3 ls s3://my-bucket/ --endpoint-url http://rgw-dr:80
```

## Step 5: Failover Procedure

When the primary fails:

```bash
# On the DR cluster, promote to master
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone modify \
  --rgw-zone=us-dr \
  --master --default \
  --read-only=false

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup modify \
  --rgw-zonegroup=us \
  --master

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit

# Update DNS to point to DR endpoint
# Route53 / external-dns update here
```

## Summary

Active-passive RGW multisite protects object storage with a hot standby zone that continuously syncs from the primary. The passive zone is read-only during normal operations, preventing clients from accidentally writing to the DR site. Failover requires promoting the DR zone and updating DNS routing.
