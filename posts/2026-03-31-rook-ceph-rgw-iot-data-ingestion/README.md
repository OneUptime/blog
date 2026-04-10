# How to Use Ceph RGW for IoT Data Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, IoT, Object Storage, Data Ingestion, S3

Description: Use Ceph RGW as scalable S3-compatible storage for IoT device data ingestion, supporting high-concurrency writes from thousands of sensors.

---

## Introduction

IoT deployments often involve thousands of devices sending small payloads at high frequency. Ceph RGW's S3-compatible API makes it a natural landing zone for IoT data before it flows into processing pipelines. This guide shows how to set up Ceph RGW to handle IoT data ingestion at scale.

## Designing the Storage Topology

IoT workloads produce many small objects. To avoid metadata bottlenecks, use multiple buckets organized by device type or time partition:

```yaml
s3://iot-temperature/temperature/2026-03-31/device-001/
s3://iot-humidity/humidity/2026-03-31/device-002/
s3://iot-pressure/pressure/2026-03-31/device-003/
```

Create the object store with enough gateway instances for concurrency:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: iot-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 2
  gateway:
    port: 80
    instances: 4
```

## Creating Per-Device-Type Users

```bash
radosgw-admin user create \
  --uid=iot-ingest \
  --display-name="IoT Ingest User" \
  --access-key=IOTACCESSKEY \
  --secret=IOTSECRETKEY

# Create buckets
for bucket in temperature humidity pressure motion; do
  aws s3api create-bucket --bucket iot-$bucket \
    --endpoint-url http://rook-ceph-rgw-iot-store.rook-ceph:80
done
```

## Device-Side Publishing (Python Example)

```python
import boto3
import json
from datetime import datetime

s3 = boto3.client(
    "s3",
    endpoint_url="http://rook-ceph-rgw-iot-store.rook-ceph:80",
    aws_access_key_id="IOTACCESSKEY",
    aws_secret_access_key="IOTSECRETKEY",
)

def publish_reading(device_id, sensor_type, value):
    ts = datetime.utcnow().isoformat()
    key = f"{sensor_type}/{ts[:10]}/{device_id}/{ts}.json"
    payload = {"device": device_id, "type": sensor_type, "value": value, "ts": ts}
    s3.put_object(
        Bucket=f"iot-{sensor_type}",
        Key=key,
        Body=json.dumps(payload),
        ContentType="application/json",
    )
```

## Configuring Lifecycle Policies for Retention

IoT data often has short retention windows. Use S3 lifecycle policies to automatically delete old data:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket iot-temperature \
  --endpoint-url http://rook-ceph-rgw-iot-store.rook-ceph:80 \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-after-30-days",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Expiration": {"Days": 30}
    }]
  }'
```

## Scaling RGW for High-Concurrency Writes

Tune RGW for small-object IoT workloads:

```bash
ceph config set client.rgw rgw_thread_pool_size 256
ceph config set client.rgw rgw_max_put_size 10485760
ceph config set client.rgw rgw_op_thread_timeout 600
```

Monitor ingestion rate with:

```bash
ceph daemon client.rgw.iot-store perf dump | grep -i put
```

## Summary

Ceph RGW provides a horizontally scalable, S3-compatible endpoint well suited to IoT data ingestion. By organizing data into partitioned buckets, tuning gateway concurrency, and applying lifecycle policies, teams can ingest high-frequency sensor data on-premises with full control over retention and cost.
