# How to Set Up Active-Active RGW Multisite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Active-Active, Multisite, Object Storage

Description: Learn how to configure active-active Ceph RGW multisite where both zones accept reads and writes simultaneously, with automatic bidirectional replication.

---

## Active-Active Overview

In active-active multisite, both zones accept reads and writes. Changes made in either zone are automatically replicated to the other. This provides:
- Geographic redundancy with full read/write availability in both sites
- No failover required when one zone goes down (other zone continues serving)
- Eventual consistency for writes across zones

## Prerequisites

Active-active requires both zones to be fully operational and in sync before enabling bidirectional writes.

## Step 1: Create a Bidirectional Zone Configuration

Both zones must be configured as peers in the same zone group:

```bash
# On Cluster A (zone: us-east)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm create --rgw-realm=mycompany --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zonegroup create \
  --rgw-zonegroup=us --master --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-east \
  --master --default

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

Pull the realm and add the secondary zone from Cluster B:

```bash
# On Cluster B (zone: us-west)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm pull \
  --url=http://rgw-us-east:80 \
  --access-key=sync-key \
  --secret=sync-secret

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin realm default --rgw-realm=mycompany

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone create \
  --rgw-zonegroup=us \
  --rgw-zone=us-west \
  --access-key=sync-key \
  --secret=sync-secret \
  --endpoints=http://rgw-us-west:80

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin period update --commit
```

## Step 2: Configure Both Zones to Accept Writes

In active-active, there is no read-only zone designation. Both zones accept writes by default in a standard multisite setup. Verify neither zone is configured as read-only:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin zone get --rgw-zone=us-east | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('read_only:', d.get('read_only', False))"
```

## Step 3: Set Up Load Balancer for Active-Active

Route traffic to both zones based on client location:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rgw-active-active
  namespace: rook-ceph
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-rgw
  ports:
  - port: 80
    targetPort: 8080
```

Use Route53 latency-based routing to direct clients to their nearest zone.

## Step 4: Verify Bidirectional Replication

Create a bucket on Zone A and verify it appears on Zone B:

```bash
# On Zone A
aws s3 mb s3://test-bucket --endpoint-url http://rgw-us-east:80

# Check replication status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin sync status

# Verify bucket exists on Zone B
aws s3 ls --endpoint-url http://rgw-us-west:80 | grep test-bucket
```

## Summary

Active-active RGW multisite provides full read/write availability across both zones with automatic bidirectional replication. Since both zones accept writes, clients can be routed to their nearest zone for lower latency. Data consistency is eventual - writes on one zone propagate to the other asynchronously.
