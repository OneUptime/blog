# Validation Summary: How to Use Ceph RGW for IoT Data Ingestion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3-compatible object storage
- Python boto3 SDK
- AWS CLI (s3api)
- radosgw-admin CLI

## Sources Consulted
- Ceph RGW documentation: https://docs.ceph.com/en/latest/radosgw/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/adminops/
- Ceph daemon admin socket commands: https://docs.ceph.com/en/latest/man/8/ceph/#daemon
- Ceph RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- boto3 S3 client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/

## Issues Found

1. **Topology example inconsistent with implementation**: The storage topology example showed `s3://iot-sensors/temperature/...` (a single `iot-sensors` bucket with type prefixes), but all subsequent code creates and uses per-sensor-type buckets (`iot-temperature`, `iot-humidity`, etc.). Updated the topology example to use per-type buckets matching the implementation: `s3://iot-temperature/...`, `s3://iot-humidity/...`, `s3://iot-pressure/...`.

2. **Incorrect `radosgw-admin` flag**: The `radosgw-admin user create` command used `--secret-key=IOTSECRETKEY`, but the correct flag is `--secret`. Changed to `--secret=IOTSECRETKEY`.

3. **Unused import in Python code**: The `import time` statement was included but never used in the `publish_reading` function. Removed it.

4. **Incorrect monitoring command**: The command `ceph -n client.rgw.iot-store daemon stats | grep -i put` had two issues: (a) the `-n` flag sets the CephX auth name and is not how you target a specific daemon with the `daemon` subcommand, and (b) `stats` is not a valid admin socket command. Changed to `ceph daemon client.rgw.iot-store perf dump | grep -i put`, which is the correct syntax for querying RGW performance counters via the admin socket.

## Review Notes
- `datetime.utcnow()` is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. The code still works but will emit a deprecation warning on Python 3.12+. A future update could replace it with the timezone-aware alternative.
- The Python key format includes the sensor type as a prefix within a bucket already named by sensor type (e.g., `temperature/...` inside `iot-temperature`). This redundancy is not incorrect but is worth noting for readers who may want to simplify their key structure.
- ISO 8601 timestamps used in S3 object keys contain colons (e.g., `2026-03-31T10:30:00`), which are valid in S3 keys but can cause issues with some filesystem-based tools that treat colons as special characters. Readers working with tools that sync S3 objects to local filesystems should be aware of this.
- The `ceph daemon` monitoring command requires running from a host (or pod) with access to the RGW daemon's admin socket. In a Rook/Kubernetes deployment, this means exec-ing into the RGW pod.
