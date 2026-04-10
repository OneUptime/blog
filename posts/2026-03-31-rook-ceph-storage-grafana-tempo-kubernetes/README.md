# How to Set Up Ceph Storage for Grafana Tempo on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Tempo, Kubernetes, Storage, Tracing

Description: Configure Grafana Tempo to store distributed traces in Ceph RGW S3-compatible object storage on Kubernetes using Rook for durable, scalable trace retention.

---

## Overview

Grafana Tempo is a distributed tracing backend that stores traces in object storage. Its S3 backend makes Ceph RGW a perfect on-premises replacement for AWS S3, keeping trace data local while using the same Tempo configuration format.

## Set Up Ceph Object Store for Tempo

Create the CephObjectStore:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: tempo-store
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
```

Create the Tempo user and bucket:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=tempo \
  --display-name="Tempo User" \
  --access-key=tempoaccesskey \
  --secret-key=temposecretkey

aws s3 mb s3://tempo-traces \
  --endpoint-url http://rook-ceph-rgw-tempo-store.rook-ceph:80
```

## Deploy Tempo with Ceph Backend

Create `tempo-values.yaml`:

```yaml
storage:
  trace:
    backend: s3
    s3:
      bucket: tempo-traces
      endpoint: rook-ceph-rgw-tempo-store.rook-ceph:80
      region: us-east-1
      access_key: tempoaccesskey
      secret_key: temposecretkey
      insecure: true
      forcepathstyle: true

traces:
  zipkin:
    enabled: true
```

Install Tempo:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install tempo grafana/tempo-distributed \
  --namespace tracing \
  --create-namespace \
  -f tempo-values.yaml
```

## Send Test Traces

Use the Tempo CLI to verify ingestion. First, port-forward the distributor:

```bash
kubectl -n tracing port-forward svc/tempo-distributor 9411
```

Send a test span using the Zipkin format:

```bash
curl -X POST http://localhost:9411/api/v2/spans \
  -H "Content-Type: application/json" \
  -d '[{"traceId":"4e441824ec2b6a44ffdc9bb9a6453df3","id":"ffdc9bb9a6453df3","name":"test-span","timestamp":1700000000000000,"duration":1000}]'
```

Query the trace via Tempo API:

```bash
kubectl -n tracing port-forward svc/tempo-query-frontend 3200
curl http://localhost:3200/api/traces/4e441824ec2b6a44ffdc9bb9a6453df3 | jq .
```

## Compaction and Retention

Tempo compacts trace blocks to reduce storage use. Configure retention in the Helm values:

```yaml
tempo:
  ingester:
    trace_idle_period: 30s
  compactor:
    compaction:
      block_retention: 336h  # 14 days
```

## Summary

Ceph RGW provides a drop-in S3 replacement for Grafana Tempo's object store backend, enabling on-premises trace storage without cloud vendor lock-in. Rook handles Ceph cluster operations declaratively, making this stack easy to maintain and scale as trace volume grows.
