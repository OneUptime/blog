# How to Configure Ops Log Sidecar for RGW in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Store, Logging, Kubernetes

Description: Learn how to configure the ops log sidecar container for the RADOS Gateway in Rook to capture and stream S3 operation logs.

---

## What Is the RGW Ops Log

The Ceph RADOS Gateway (RGW) can emit an operations log - a structured record of every S3 or Swift API call, including the requester, bucket, object, HTTP method, response code, and latency. This is invaluable for auditing, debugging, and billing. In Rook, RGW pods can run an ops log sidecar container that reads the log socket and forwards entries to stdout or a file, making logs accessible via standard Kubernetes tooling.

## Enabling the Ops Log Sidecar

The ops log sidecar is configured in the `CephObjectStore` spec under `gateway`. Set `rgwConfig` to enable the log backend, and configure the sidecar via the `opsLogSidecar` field if your Rook version supports it. For older versions, you enable the UNIX socket backend and let the sidecar tail it.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 1
    rgwConfig:
      rgw_ops_log_socket_path: "/var/run/ceph/rgw-ops.sock"
      rgw_enable_ops_log: "true"
      rgw_ops_log_data_backlog: "8388608"
```

This tells RGW to write operation records to a Unix domain socket at the specified path inside the pod.

## Reading Ops Logs with a Sidecar

Add a sidecar container definition that reads from the socket. Since RGW writes UNIX socket data, a simple socat or custom log forwarder reads it and emits to stdout:

```yaml
# This snippet would be part of a custom Rook operator configuration
# or a patch applied to the RGW deployment
containers:
  - name: rgw-ops-log
    image: alpine:3.18
    command:
      - sh
      - -c
      - |
        apk add --no-cache socat
        socat UNIX-LISTEN:/var/run/ceph/rgw-ops.sock,fork STDOUT
    volumeMounts:
      - name: rgw-run
        mountPath: /var/run/ceph
```

## Parsing Ops Log Entries

RGW ops log entries are JSON objects. A typical entry looks like this:

```json
{
  "bucket": "my-bucket",
  "time": "2026-03-31T10:00:00.000000Z",
  "remote_addr": "10.0.0.5",
  "user": "alice",
  "operation": "get_obj",
  "object": "images/photo.jpg",
  "uri": "GET /my-bucket/images/photo.jpg HTTP/1.1",
  "http_status": "200",
  "bytes_sent": 204800,
  "total_time": 45
}
```

Each field maps to the request lifecycle, making it easy to pipe entries into log aggregators like Loki or Elasticsearch.

## Shipping Logs to a Centralized System

Once the sidecar emits JSON to stdout, use Fluentd, Promtail, or Vector to collect and forward:

```yaml
# Promtail scrape config for RGW ops logs
scrape_configs:
  - job_name: rgw-ops-log
    pipeline_stages:
      - json:
          expressions:
            bucket: bucket
            operation: operation
            status: http_status
    static_configs:
      - labels:
          job: rook-rgw-ops
```

## Summary

Configuring an ops log sidecar for RGW in Rook involves enabling the ops log UNIX socket via `rgwConfig`, then running a sidecar container that reads the socket and emits structured JSON to stdout. This pattern integrates cleanly with Kubernetes log collection pipelines, giving you full S3 audit trails without modifying the core RGW process.
