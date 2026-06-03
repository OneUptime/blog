# Validation Summary: How to Implement Rook-Ceph Object Store for S3-Compatible Storage on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph
- Ceph Object Gateway (RGW)
- Kubernetes Services, Ingress, Deployments, Secrets, ConfigMaps, and StorageClasses
- ObjectBucketClaim
- AWS CLI
- boto3
- Prometheus/PromQL

## Sources Consulted
- Rook Object Storage Overview: https://rook.io/docs/rook/latest-release/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook Object Bucket Claim documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CRD API specification: https://rook.io/docs/rook/latest-release/CRDs/specification/
- Rook Object Store Multisite documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- Ceph Monitoring Overview: https://docs.ceph.com/en/latest/monitoring/
- Ceph RGW Metrics documentation: https://docs.ceph.com/en/latest/radosgw/metrics/
- boto3 put_bucket_lifecycle_configuration documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_lifecycle_configuration.html
- boto3 S3 bucket policy examples: https://docs.aws.amazon.com/boto3/latest/guide/s3-example-bucket-policies.html

## Issues Found
- The external Service example used the same name as the internal RGW Service Rook creates automatically. Changed it to `rook-ceph-rgw-my-store-external` and added the standard Rook selector/label fields so it targets the intended object store pods.
- The application Deployment mapped only `BUCKET_HOST` to `AWS_ENDPOINT_URL`, but AWS CLI expects an endpoint URL with a scheme and, for OBCs, the port is provided separately as `BUCKET_PORT`. Changed the example to use `AWS_HOST` and `AWS_PORT` and build `http://$AWS_HOST:$AWS_PORT` in the command.
- The Prometheus bandwidth examples used `ceph_rgw_sent` and `ceph_rgw_received`, which are not the current RGW byte counters shown in Ceph monitoring docs. Replaced them with `ceph_rgw_op_global_put_obj_bytes` and `ceph_rgw_op_global_get_obj_bytes`.
- The multi-site section implied that realm, zonegroup, and zone resources alone configure replication. Added a `CephObjectStore` that references the zone, matching Rook's documented multi-site requirements.
- The lifecycle policy example used the older top-level `Prefix` form. Updated it to the current boto3 `Filter: {'Prefix': 'backups/'}` shape.

## Review Notes
The tutorial assumes an existing healthy Rook Ceph cluster with enough OSDs for the requested replica sizes and a working bucket provisioner. The AWS CLI installation command installs AWS CLI v1 via pip; it is still usable for these commands, but production environments may prefer the official AWS CLI v2 installer.
