# Validation Summary: How to Configure Custom MIME Types for Rook Object Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph Operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- Kubernetes ConfigMaps and Deployments
- AWS CLI (s3 and s3api subcommands)
- S3-compatible object storage
- Kustomize / Helm (mentioned for deployment overlays)

## Sources Consulted
- Ceph RGW Configuration Reference (`rgw_mime_types_file` option, default `/etc/mime.types`) — https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph source `config_opts.h` — confirms `OPTION(rgw_mime_types_file, OPT_STR, "/etc/mime.types")`
- Rook CephObjectStore CRD documentation — `spec.gateway.rgwCommandFlags` field confirmed as `map[string]string`
- Rook CRD Go types (`pkg/apis/ceph.rook.io/v1/types.go`) — `RgwCommandFlags map[string]string`
- AWS CLI v2 help for `aws s3 cp` — confirms `--endpoint-url` and `--content-type` flags
- AWS CLI v2 help for `aws s3api head-object` — confirms `--bucket`, `--key`, `--endpoint-url` flags
- Ceph PR #26998 — RGW handling of missing `/etc/mime.types`
- Rook Issue #5312 — clarification that RGW stores client-provided Content-Type for S3 API

## Issues Found
No technical issues found. All code examples, YAML snippets, CLI commands, and configuration field names are syntactically correct and reference real, existing APIs and options.

## Review Notes
- **MIME types file scope**: The Ceph `rgw_mime_types_file` is documented as "Used for Swift auto-detection of object types." For S3 API uploads, RGW stores the Content-Type header sent by the client, not the one resolved from the server-side MIME types file. The blog's approach is valid but readers should be aware that the primary use case for server-side MIME resolution is Swift API, not S3. The "S3 Content-Type Override" section at the end is actually the standard S3 approach.
- **Built-in Rook MIME types mechanism**: Rook automatically creates a ConfigMap named `rook-ceph-rgw-<STORE-NAME>-mime-types` for each object store, which it mounts into RGW pods. Users can edit this ConfigMap directly to add custom MIME types without needing `rgwCommandFlags` or manual deployment patches. This simpler, built-in approach is not mentioned in the post.
- **Deployment patch durability**: Manually patching the RGW deployment (as shown in `rgw-mime-patch.yaml`) may be overwritten by Rook's reconciliation loop, since Rook manages these deployments. Using Kustomize overlays at Helm chart deploy time would mitigate this, but the post could be clearer about this risk.
- **Verification step caveat**: The `aws s3 cp` command in the verification step will use the AWS CLI's own client-side MIME detection to set Content-Type at upload time. On modern systems with Python 3.x, `application/wasm` is already in the `mimetypes` module, so the test might pass due to client-side detection rather than server-side MIME resolution.
