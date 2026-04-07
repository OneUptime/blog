# How to Set rgw_data and rgw_enable_apis in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Configuration, Object Storage, API

Description: Configure rgw_data for RGW data directory location and rgw_enable_apis to control which API protocols are active in Ceph RGW.

---

Two foundational RGW configuration parameters control where data is stored and which API protocols are enabled. Misconfiguring either can lead to data loss or broken client access.

## The rgw_data Parameter

`rgw_data` specifies the local directory RGW uses for its data files, including the keyring cache and socket files. The default is `/var/lib/ceph/radosgw/<cluster>-<id>`.

```bash
# View current setting
ceph config get client.rgw rgw_data

# Set a custom data directory
ceph config set client.rgw rgw_data /mnt/fast-ssd/radosgw/data
```

In containerized Rook deployments, this is typically managed by the operator and mounted via volumes. Override with care:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_data = /var/lib/ceph/radosgw/ceph-rgw.my-store.a
```

## The rgw_enable_apis Parameter

`rgw_enable_apis` is a comma-separated list of API protocols to enable. Available options:

- `s3` - Amazon S3 protocol
- `s3website` - S3 static website hosting
- `swift` - OpenStack Swift protocol
- `swift_auth` - Swift authentication endpoint
- `admin` - Ceph admin API
- `sts` - AWS Security Token Service
- `iam` - IAM-compatible API
- `notifications` - Pub/Sub bucket notification API (called `pubsub` in Ceph versions prior to Reef)

By default, all APIs are enabled.

```bash
# View current enabled APIs
ceph config get client.rgw rgw_enable_apis

# Enable only S3 and admin (disable Swift)
ceph config set client.rgw rgw_enable_apis "s3,admin"

# Enable all common APIs including STS and IAM
ceph config set client.rgw rgw_enable_apis "s3,swift,swift_auth,admin,sts,iam"

# Enable bucket notifications
ceph config set client.rgw rgw_enable_apis "s3,admin,notifications"
```

## Applying Changes in Rook

After modifying these settings, restart the RGW pods:

```bash
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
kubectl -n rook-ceph rollout status deployment rook-ceph-rgw-my-store-a
```

## Verifying API Availability

Test that the S3 API is responding:

```bash
curl -I http://rook-ceph-rgw-my-store.rook-ceph.svc/

# Expected response header
# HTTP/1.1 403 Forbidden  (anonymous request rejected - API is active)
```

Test the Swift endpoint:

```bash
curl -I http://rook-ceph-rgw-my-store.rook-ceph.svc/swift/v1/

# HTTP/1.1 401 Unauthorized  (auth required - Swift is active)
```

Test the admin API:

```bash
curl http://rook-ceph-rgw-my-store.rook-ceph.svc/admin/info
```

## Summary

`rgw_data` sets the local working directory for RGW data files and should only be changed with care in containerized environments. `rgw_enable_apis` controls which protocols are active - use a minimal set (e.g., `s3,admin`) if you do not need Swift or STS to reduce attack surface. Restart RGW after any changes.
