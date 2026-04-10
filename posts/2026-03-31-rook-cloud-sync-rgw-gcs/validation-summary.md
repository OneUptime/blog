# Validation Summary: How to Configure Cloud Sync Module for RGW to GCS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph RGW Cloud Sync Module
- Google Cloud Storage (GCS) S3-compatible interoperability API
- gcloud CLI
- radosgw-admin CLI
- Prometheus metrics for RGW

## Sources Consulted
- [Cloud Sync Module — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/cloud-sync-module/)
- [Cloud Transition — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/cloud-transition/)
- [HTTP Frontends — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/frontends/)
- [Ceph Multisite Documentation](https://docs.ceph.com/en/latest/radosgw/multisite/)
- [RGW Metrics — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/metrics/)
- [gcloud storage buckets create — Google Cloud SDK Reference](https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create)
- [gcloud storage hmac — Google Cloud SDK Reference](https://docs.cloud.google.com/sdk/gcloud/reference/storage/hmac)
- [Google Cloud Storage Interoperability](https://docs.cloud.google.com/storage/docs/interoperability)
- [Ceph Pacific: deprecate civetweb frontend (GitHub PR #41367)](https://github.com/ceph/ceph/pull/41367)
- [RGW data sync perf counters (GitHub PR #26722)](https://github.com/ceph/ceph/pull/26722)

## Issues Found

1. **`--storage-class` flag incorrect in `gcloud storage buckets create`**: The correct flag is `--default-storage-class`, not `--storage-class`. Also normalized location casing from `US-CENTRAL1` to `us-central1` to match canonical convention.

2. **`connection.id=gcs-main` is not a valid tier-config parameter**: In the trivial (single-connection) cloud sync configuration, there is no `connection.id` parameter. Multi-connection setups use an array-based `connections[-1].id` syntax. Removed this parameter since the post uses a single-connection setup.

3. **`connection.region=auto` is not a cloud sync module parameter**: The `connection.region` parameter is not documented for the Ceph RGW cloud sync module. GCS uses a single global S3-compatible endpoint (`storage.googleapis.com`), so a region parameter is unnecessary. Removed this parameter.

4. **`retain_head_object` belongs to the cloud transition module, not cloud sync**: This parameter is from the cloud transition module (lifecycle-based tiering), not the cloud sync module. Replaced this command with a `period update --commit` to commit the multipart threshold changes.

5. **`civetweb` frontend is deprecated and removed**: Civetweb was deprecated in Ceph Pacific and removed in Ceph Quincy. The `beast` frontend is the current default. Changed `rgw_frontends = civetweb port=7482` to `rgw_frontends = beast port=7482`.

6. **`rgw_sync_full_sync_index_count` Prometheus metric does not exist**: This metric name does not appear in Ceph documentation or source code. RGW data sync metrics are exported under the `ceph_data_sync_from_<zone>_*` namespace. Changed the grep pattern to `ceph_data_sync_from`.

## Review Notes
- The `radosgw -n client.rgw.gcs-sync -d --no-mon-config` startup command is technically valid but unusual. The `-d` flag runs in foreground debug mode (not suitable for production), and `--no-mon-config` prevents fetching config from monitors, requiring a complete local `ceph.conf`. In modern Ceph deployments (Quincy+), RGW instances are typically managed via cephadm rather than started manually. This is acceptable for a tutorial context but readers should be aware it is not a production deployment pattern.
- The post title references "Rook" in the tags but doesn't use Rook/Kubernetes at all — the configuration is done entirely via native Ceph CLI tools. This is not technically incorrect but may be misleading for readers searching for Rook-specific instructions.
