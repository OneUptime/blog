# Validation Summary: How to Configure Ceph Storage for IoT and Edge Computing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage - RGW, RBD, BlueStore)
- Kubernetes (CephCluster CRD, CephObjectStore CRD, StatefulSet, PVCs)
- Python / boto3 (S3 client for sensor data ingest)
- AWS CLI (S3 sync operations)
- InfluxDB / TimescaleDB (time-series databases)
- S3 lifecycle policies

## Sources Consulted
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook CephObjectStore CRD documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- AWS CLI S3 documentation - `--endpoint-url` global option behavior (https://docs.aws.amazon.com/cli/latest/reference/s3/)
- boto3 S3 client documentation (https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html)
- Ceph BlueStore compression documentation (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- S3 lifecycle configuration reference (https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html)
- Cross-referenced with 250+ other Rook/Ceph blog posts in this repository for CRD field consistency

## Issues Found
1. **Data sync script: cross-endpoint copy bug** - The original script used `aws --endpoint-url http://edge-ceph-rgw.local:8080 s3 cp s3://${BUCKET}/{} ${CLOUD_BUCKET}/{}` to copy from edge Ceph to cloud AWS S3. The `--endpoint-url` is a global AWS CLI option that affects both source and destination in a single command, so the destination `s3://cloud-iot-archive/...` would also resolve against the edge Ceph RGW endpoint, not the default AWS endpoint. This means the copy would fail (bucket not found on edge) or copy to the wrong location. **Fix:** Replaced with a two-step `aws s3 sync` approach - first download from edge Ceph to a local temp directory, then upload to cloud S3 without `--endpoint-url` so it uses the default AWS endpoint.

2. **Misleading comment in sync script** - The original comment said "List objects from last hour" but the `aws s3 ls --recursive` command listed all objects with no time filtering. **Fix:** Removed the misleading comment and used `aws s3 sync` which is both simpler and more appropriate for this use case.

## Review Notes
- The StatefulSet YAML for InfluxDB is a partial manifest (missing required fields: `selector`, `template`, `serviceName`). This is a common blog convention to focus on the storage-relevant portion and is acceptable, but readers should know it is not directly applicable without completing the manifest.
- The Ceph image `v19.2.0` (Squid release) is current as of the post date.
- Reduced replication (`size: 2`) is correctly noted as an edge trade-off. Readers should be aware this provides less fault tolerance than the standard `size: 3`.
- The Python example uses hardcoded credentials (`DEVICE_KEY`/`DEVICE_SECRET`) which is appropriate for a demonstration but should use environment variables or a secrets manager in production.
