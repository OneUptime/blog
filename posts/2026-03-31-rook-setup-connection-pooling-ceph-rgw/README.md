# How to Set Up Connection Pooling for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Performance

Description: Set up connection pooling for Ceph RGW in Rook to reduce connection overhead for client applications by configuring keepalive, RADOS handles, and proxy pooling.

---

## Why Connection Pooling Matters for RGW

Opening a new TCP connection and performing TLS handshake for every S3 request adds significant latency. At scale, this overhead can dominate request latency and reduce throughput. Connection pooling allows clients and the gateway to reuse established connections.

## HTTP Keepalive on the RGW Frontend

Configure the Beast frontend to support long-lived connections:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_frontends \
    "beast port=80 num_threads=512 request_timeout_ms=120000"
```

The Beast frontend supports HTTP/1.1 keep-alive by default and will reuse connections until the client closes them or the `request_timeout_ms` idle timeout expires. No additional keepalive configuration is required beyond the frontend settings above.

## RADOS Connection Handles

Each RGW worker thread uses RADOS handles to communicate with the OSD layer. Pool these to avoid creating new RADOS connections per request:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_num_rados_handles 32
```

## Client-Side Connection Pooling

Configure AWS SDK v2 (Python boto3) to reuse connections:

```python
import boto3
from botocore.config import Config

config = Config(
    max_pool_connections=100,
    connect_timeout=5,
    read_timeout=60,
    retries={"max_attempts": 3}
)

s3 = boto3.client(
    "s3",
    endpoint_url="http://rgw-endpoint",
    config=config
)
```

For Go applications using the AWS SDK:

```go
cfg, err := config.LoadDefaultConfig(context.TODO())
cfg.HTTPClient = &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        200,
        MaxIdleConnsPerHost: 100,
        IdleConnTimeout:     90 * time.Second,
        DisableKeepAlives:   false,
    },
}
```

## HAProxy as a Connection Pool Layer

For applications that cannot configure connection pooling, deploy HAProxy in front of RGW to pool connections:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-config
  namespace: rook-ceph
data:
  haproxy.cfg: |
    defaults
      timeout connect 5s
      timeout client  300s
      timeout server  300s
      option forwardfor

    frontend rgw-frontend
      bind *:80
      default_backend rgw-backend

    backend rgw-backend
      balance roundrobin
      option http-keep-alive
      timeout http-keep-alive 120s
      server rgw1 rook-ceph-rgw-my-store:80 check
```

## Monitoring Connection Pool Utilization

Check active RADOS connections:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.* config set debug_rados 10

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status
```

Watch established TCP connections on RGW pods:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-rgw -o name | head -1) \
  -- ss -tn state established | wc -l
```

## Summary

Connection pooling for Ceph RGW operates at two levels: HTTP keepalive on the frontend to reuse TCP connections from clients, and RADOS handle pooling to avoid re-establishing connections to the OSD layer. Client-side SDK configuration to enable connection reuse is the most impactful change with zero server configuration required.
