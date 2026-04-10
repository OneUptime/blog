# How to Configure Ceph Storage for IoT and Edge Computing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, IoT, Edge, Computing, Time Series, Telemetry, Storage

Description: Configure lightweight Rook/Ceph deployments for IoT edge computing environments to store sensor data, time-series telemetry, and device state locally before cloud sync.

---

## IoT and Edge Storage Requirements

IoT edge deployments require storage that differs significantly from data center Ceph:
- **Small footprint**: Edge nodes have limited hardware resources
- **High write rate**: Millions of sensor readings per hour
- **Time-series data**: Sequential append-heavy workloads
- **Local processing**: Analytics before data reduction and cloud sync
- **Intermittent connectivity**: Must operate during WAN outages
- **Durability despite hardware limits**: Often commodity or ruggedized hardware

## Minimal Ceph Cluster for Edge

A 3-node edge cluster with minimal resources:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: edge-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 1
  resources:
    mon:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "1"
        memory: 2Gi
    osd:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: "2"
        memory: 4Gi
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: sdb
```

## Object Store for Sensor Data Ingest

Use RGW S3 as the local sensor data landing zone:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: iot-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 2   # Reduced replication for edge (2 copies)
  dataPool:
    replicated:
      size: 2
    parameters:
      compression_mode: aggressive  # Sensor data compresses very well
  gateway:
    instances: 1
    port: 8080
```

## Sensor Data Ingest from Edge Devices

IoT devices write data using lightweight S3 clients:

```python
import boto3
import json
import time

# Edge device telemetry client
s3 = boto3.client(
    's3',
    endpoint_url='http://edge-ceph-rgw.local:8080',
    aws_access_key_id='DEVICE_KEY',
    aws_secret_access_key='DEVICE_SECRET'
)

def publish_reading(sensor_id: str, reading: dict):
    """Publish a sensor reading to edge Ceph storage."""
    key = f"sensors/{sensor_id}/{int(time.time())}.json"
    s3.put_object(
        Bucket='iot-telemetry',
        Key=key,
        Body=json.dumps(reading),
        ContentType='application/json'
    )

# Example: temperature sensor
publish_reading('temp-sensor-001', {
    'timestamp': time.time(),
    'temperature': 23.5,
    'humidity': 45.2,
    'location': 'factory-floor-a'
})
```

## Time-Series Database with Block Storage

Use InfluxDB or TimescaleDB backed by Ceph RBD for processed metrics:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: influxdb-edge
  namespace: iot
spec:
  replicas: 1
  volumeClaimTemplates:
    - metadata:
        name: influx-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: rook-ceph-block
        resources:
          requests:
            storage: 100Gi
```

## Data Reduction and Cloud Sync

Aggregate and reduce edge data before syncing to cloud:

```bash
#!/bin/bash
# Sync sensor data from edge Ceph to cloud S3
BUCKET="iot-telemetry"
CLOUD_BUCKET="cloud-iot-archive"
TMPDIR="/tmp/edge-sync"

mkdir -p "${TMPDIR}"

# Download from edge Ceph RGW to local staging
aws --endpoint-url http://edge-ceph-rgw.local:8080 \
  s3 sync s3://${BUCKET}/sensors/ ${TMPDIR}/sensors/

# Upload to cloud S3 (uses default AWS endpoint)
aws s3 sync ${TMPDIR}/sensors/ s3://${CLOUD_BUCKET}/sensors/

# Cleanup temp files
rm -rf "${TMPDIR}"
```

## Lifecycle Policy for Local Data Retention

Keep only 30 days of raw data locally; older data must be synced to cloud first:

```json
{
  "Rules": [{
    "ID": "expire-old-sensor-data",
    "Status": "Enabled",
    "Filter": {"Prefix": "sensors/"},
    "Expiration": {"Days": 30}
  }]
}
```

## Summary

A lightweight Rook/Ceph cluster at the edge handles IoT sensor data ingest with minimal resources: reduced replication (2 copies instead of 3) saves disk space, aggressive compression reduces storage for repetitive sensor readings, and a single RGW instance is sufficient for edge throughput. RBD-backed time-series databases provide fast local analytics, and automated lifecycle policies manage local retention while syncing to cloud archives.
