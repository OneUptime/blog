# Validation Summary: How to Configure Rook-Ceph for Video Streaming Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephObjectStore CRD, RGW, CephFS, RBD)
- Kubernetes (Jobs, PersistentVolumeClaims, ConfigMaps)
- AWS CLI (S3-compatible commands for Ceph RGW)
- FFmpeg (HLS transcoding)
- Python boto3 (presigned URL generation)
- HLS (HTTP Live Streaming)

## Sources Consulted
- Rook CephObjectStore CRD documentation — https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CephBlockPool CRD documentation (pool parameters) — https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Ceph Configuration documentation — https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-configuration/
- Ceph Object Gateway Config Reference — https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph HTTP Frontends documentation — https://docs.ceph.com/en/pacific/radosgw/frontends/
- Ceph RGW source (rgw.yaml.in) — https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Kubernetes Job documentation (restartPolicy requirements)
- AWS CLI S3 sync documentation (--content-type behavior)
- boto3 S3 presigned URL documentation

## Issues Found

### 1. Incorrect content type applied to all files in `aws s3 sync` (lines 57-63)
**What was wrong:** The original command used `--content-type "application/vnd.apple.mpegurl"` on the entire `aws s3 sync` operation. This flag applies to ALL files being synced, meaning `.ts` video transport stream segments would incorrectly receive the `application/vnd.apple.mpegurl` MIME type instead of the correct `video/MP2T`. This could cause video playback failures in HLS players that rely on correct content types.

**What was changed:** Split the single sync command into two separate commands: one for `.m3u8` playlist files with `--content-type "application/vnd.apple.mpegurl"`, and one for `.ts` segment files with `--content-type "video/MP2T"`, each using `--exclude "*" --include` filters.

### 2. Missing `restartPolicy` in Kubernetes Job spec (lines 70-103)
**What was wrong:** The Job's pod template spec did not include a `restartPolicy` field. Kubernetes defaults `restartPolicy` to `Always`, which is invalid for Jobs (only `Never` and `OnFailure` are allowed). The API server would reject this Job manifest with a validation error.

**What was changed:** Added `restartPolicy: Never` to the pod spec.

## Review Notes
- The `rook-config-override` ConfigMap approach for Ceph configuration overrides still works but is considered legacy. Rook documentation now recommends using the `cephConfig` field in the CephCluster CRD instead, which applies settings via `ceph config set` to the monitor config database.
- The `ms_tcp_nodelay = true` setting is already the default in Ceph, so setting it explicitly is redundant (but harmless).
- The `rgw_thread_pool_size` parameter still affects the Beast frontend (default since Ceph Quincy), but its behavior is different from CivetWeb. With Beast, it controls the async worker thread pool size rather than a thread-per-connection limit. The tuning advice is still valid but readers should understand the distinction.
- The CephObjectStore YAML, `bulk: "true"` pool parameter, RGW service naming convention, FFmpeg HLS command, and boto3 presigned URL code are all technically correct.
