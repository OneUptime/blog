# How to Fix Rook-Ceph RGW Pods Not Ready

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, RGW, Object Storage

Description: Learn how to diagnose and fix Rook-Ceph RGW pods not reaching Ready state by checking object store configuration, pool health, realm/zone setup, and service endpoint issues.

---

## Understanding RGW Pods

The Rados Gateway (RGW) provides S3 and Swift compatible object storage API. In Rook, RGW is deployed as a Deployment managed by the CephObjectStore resource. When RGW pods are not Ready, S3 and Swift API calls fail for all clients.

## Step 1: Check RGW Pod Status

```bash
# List RGW pods
kubectl -n rook-ceph get pods -l app=rook-ceph-rgw

# Check readiness probe details
kubectl -n rook-ceph describe pod rook-ceph-rgw-my-store-<id>

# View logs
kubectl -n rook-ceph logs rook-ceph-rgw-my-store-<id> --tail=100
```

## Step 2: Check the CephObjectStore Resource

```bash
kubectl -n rook-ceph get cephobjectstore
kubectl -n rook-ceph describe cephobjectstore my-store
```

The status should show `Phase: Ready`. If it shows `Progressing` or an error, the RGW is not ready.

## Common Cause 1: Required Pools Not Created

RGW needs several pools to be created before it can start. Check that these pools exist:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool ls | grep -E 'rgw|my-store'
"
```

Expected pools include: `.rgw.root`, `my-store.rgw.buckets.index`, `my-store.rgw.buckets.data`, `my-store.rgw.log`, `my-store.rgw.control`, `my-store.rgw.meta`.

If pools are missing, delete and recreate the CephObjectStore to trigger pool creation:

```bash
kubectl -n rook-ceph delete cephobjectstore my-store
kubectl apply -f objectstore.yaml
```

## Common Cause 2: Readiness Probe Failure

RGW uses an exec-based readiness probe that internally checks the HTTP endpoint. Check if RGW is actually responding:

```bash
# Port-forward and test the endpoint
kubectl -n rook-ceph port-forward svc/rook-ceph-rgw-my-store 8080:80 &
curl -v http://localhost:8080/
```

A healthy RGW returns a `200 OK` or `403 Forbidden` (authentication required).

If RGW returns errors, check for zone/realm configuration issues in the logs:

```bash
kubectl -n rook-ceph logs rook-ceph-rgw-my-store-<id> | grep -E "error|ERROR|failed"
```

## Common Cause 3: Realm or Zone Configuration Issues

Errors like `failed to get realm info` or `zone not found` indicate RGW realm setup problems:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  radosgw-admin realm list
  radosgw-admin zone list
  radosgw-admin zonegroup list
"
```

If the realm or zone is missing, check the CephObjectStore spec for `zone` configuration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 1
```

## Common Cause 4: Resource Constraints

RGW pods may fail readiness probes if under memory pressure:

```bash
kubectl -n rook-ceph top pod -l app=rook-ceph-rgw

# Increase resources if needed
```

```yaml
spec:
  gateway:
    resources:
      requests:
        memory: "512Mi"
      limits:
        memory: "1Gi"
```

## Common Cause 5: Service Port Mismatch

Verify the RGW Service is pointing to the correct port:

```bash
kubectl -n rook-ceph get service rook-ceph-rgw-my-store
kubectl -n rook-ceph describe service rook-ceph-rgw-my-store
```

The Service targetPort must match the gateway port in the CephObjectStore spec.

## Verify RGW After Fix

Test S3 API access:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Create a test user
  radosgw-admin user create --uid=testuser --display-name='Test User'

  # Test the RGW endpoint with curl
  curl -s -o /dev/null -w '%{http_code}' http://rook-ceph-rgw-my-store.rook-ceph.svc:80/
"
```

A response of `200` or `403` confirms RGW is running and accepting requests.

## Summary

Rook-Ceph RGW pods not reaching Ready state are typically caused by missing required pools, readiness probe failures due to configuration errors, realm or zone setup issues, resource constraints, or Service port mismatches. Checking the CephObjectStore status, RGW pod logs, and testing the HTTP endpoint with curl identifies the root cause. Recreating the object store, fixing resource limits, or correcting realm configuration restores RGW readiness.
