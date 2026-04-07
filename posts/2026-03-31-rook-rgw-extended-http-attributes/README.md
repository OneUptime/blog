# How to Configure Extended HTTP Attributes in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, HTTP, Metadata, Object Storage

Description: Configure Ceph RGW to expose extended HTTP attributes and custom object metadata headers for S3 and Swift API responses.

---

Ceph RGW supports returning object metadata as HTTP response headers, including extended attributes (xattrs) stored in RADOS. Proper configuration enables richer metadata handling for applications and CDNs.

## Understanding Extended HTTP Attributes

When objects are stored with custom metadata (S3 user metadata, also called `x-amz-meta-*`), RGW returns these as HTTP headers in GET and HEAD responses. Extended xattr support also allows exposing RADOS-level attributes.

## Key Configuration Parameters

```bash
# Check metadata size limits
ceph config get client.rgw rgw_max_attr_size
ceph config get client.rgw rgw_max_attrs_num_in_req
```

## How User Metadata Works

S3 user metadata uses the `x-amz-meta-` prefix automatically. When you upload an object with custom metadata, RGW stores it and returns it in GET and HEAD responses without any special configuration.

## Uploading and Retrieving Extended Metadata

```bash
# Upload an object with custom metadata
aws s3 cp image.jpg s3://my-bucket/photo.jpg \
  --metadata '{"author":"nawazdhandala","project":"blog","version":"1.2"}' \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc

# Retrieve metadata via HEAD request
aws s3api head-object \
  --bucket my-bucket \
  --key photo.jpg \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

Expected response:

```json
{
    "ContentType": "image/jpeg",
    "Metadata": {
        "author": "nawazdhandala",
        "project": "blog",
        "version": "1.2"
    }
}
```

## Swift Extended Headers

For Swift-compatible clients, extended attributes are exposed via:

```bash
# X-Object-Meta-* headers
curl -X PUT http://rook-ceph-rgw-my-store.rook-ceph.svc/v1/AUTH_account/container/object \
  -H "X-Auth-Token: $TOKEN" \
  -H "X-Object-Meta-Author: nawazdhandala" \
  -T file.txt
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_max_attr_size = 4096
    rgw_max_attrs_num_in_req = 90
```

## Metadata Size Limits

Be aware of metadata size constraints:

```bash
# Maximum size of a single metadata value (bytes, 0 means no limit)
ceph config set client.rgw rgw_max_attr_size 4096

# Maximum number of metadata items per request (0 means no limit)
ceph config set client.rgw rgw_max_attrs_num_in_req 90
```

## Summary

Ceph RGW supports extended HTTP attributes via S3 `x-amz-meta-*` headers and Swift `X-Object-Meta-*` headers. Configure `rgw_max_attr_size` and `rgw_max_attrs_num_in_req` to control metadata limits. Always set metadata at upload time for best compatibility with downstream consumers.
