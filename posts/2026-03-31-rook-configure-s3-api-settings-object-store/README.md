# How to Configure S3 API Settings in Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, S3, Object Storage, Kubernetes

Description: Configure S3 API settings in a Rook CephObjectStore to control authentication, ACLs, bucket policies, and endpoint behavior.

---

## Overview of S3 API Settings in Rook

The Rook `CephObjectStore` CRD exposes several S3-compatible API knobs through the `protocols` and `gateway` fields. Tuning these settings lets you control which authentication mechanisms are accepted, whether bucket policies are enforced, how multipart uploads behave, and more.

## Enabling S3 in the CephObjectStore

The minimal `CephObjectStore` already serves S3. To explicitly control S3 protocol settings, use the `protocols` field:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
  protocols:
    s3:
      enabled: true
      authUseKeystone: false
```

Set `authUseKeystone: true` to authenticate S3 requests via an OpenStack Keystone identity service instead of native Ceph user keys.

## Configuring the S3 Endpoint

You can control the URL path style (path-based vs virtual-hosted) using the `CephObjectStore` gateway settings and external DNS. Ceph RGW defaults to path-style (`s3.example.com/bucket-name`). To support virtual-hosted style (`bucket-name.s3.example.com`), configure your DNS wildcard record and set the `rgw_dns_name` parameter:

```yaml
spec:
  gateway:
    port: 80
    instances: 2
    externalRgwEndpoints:
      - ip: 192.168.1.100
```

Then patch the RGW config map to set the DNS name:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- ceph config set client.rgw rgw_dns_name s3.example.com
```

## Tuning Multipart Upload Settings

Large object uploads use the S3 multipart API. You can tune minimum part size (default 5 MiB) and maximum number of parts (default 10000):

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph config set client.rgw rgw_multipart_min_part_size 16777216

kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph config set client.rgw rgw_multipart_part_upload_limit 5000
```

## Bucket Policies

Bucket policies (IAM-style JSON policies) are enabled by default in Ceph RGW and do not require any additional configuration to use. You can apply a bucket policy using the S3 API or the `aws` CLI:

```bash
aws --endpoint-url http://<rgw-endpoint> s3api put-bucket-policy \
  --bucket my-bucket \
  --policy file://policy.json
```

## Enabling Object Lock (WORM)

S3 Object Lock prevents deletion or overwrite for a specified retention period. Object Lock is enabled per-bucket at creation time using the S3 API:

```bash
aws --endpoint-url http://<rgw-endpoint> s3api create-bucket \
  --bucket my-locked-bucket \
  --object-lock-enabled-for-bucket
```

Note: Object Lock automatically enables bucket versioning and cannot be disabled after the bucket is created.

## Verifying Settings

List current RGW configuration values:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph config dump | grep rgw
```

Check which settings are applied to the running daemon:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph config get client.rgw
```

## Summary

Rook exposes S3 API settings through the `CephObjectStore` CRD and through Ceph config parameters set via the toolbox. Key areas include enabling Keystone auth, tuning multipart upload limits, applying bucket policies, and optionally turning on Object Lock for immutable storage. Apply changes incrementally and verify each one through the toolbox before moving on.
