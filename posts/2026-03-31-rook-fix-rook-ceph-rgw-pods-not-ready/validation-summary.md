# Validation Summary: How to Fix Rook-Ceph RGW Pods Not Ready

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- Kubernetes (kubectl, pods, services, deployments)
- S3-compatible object storage
- CephObjectStore CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook source code (`pkg/operator/ceph/object/objectstore.go`) for RGW pod labels, pool names, service naming, and probe configuration
- Rook source code (`pkg/apis/ceph.rook.io/v1/types.go`) for CephObjectStore status Phase and spec structure
- Rook official example YAML (`deploy/examples/object.yaml`) for CephObjectStore spec fields
- Rook toolbox configuration (`deploy/examples/toolbox.yaml`) for default toolbox image contents
- Ceph documentation for `radosgw-admin` CLI commands

## Issues Found

1. **Readiness probe type mischaracterized** (Common Cause 2): The post stated "RGW uses an HTTP readiness probe." In Rook, the RGW readiness probe is actually an **exec-based probe** that runs a shell script (`rgw-probe.sh`) which internally uses `curl` to check the HTTP endpoint. It is not a native Kubernetes `httpGet` probe. Fixed to: "RGW uses an exec-based readiness probe that internally checks the HTTP endpoint."

2. **`aws` CLI not available in default toolbox** (Verify RGW After Fix): The verification section used `aws s3 ls --endpoint-url ... --no-sign-request` inside the `rook-ceph-tools` pod. The default Rook toolbox image (`quay.io/ceph/ceph`) does **not** include the AWS CLI. Replaced with a `curl` command that checks the HTTP status code of the RGW endpoint, which works with the default toolbox and provides a clear connectivity test.

## Review Notes
- The list of expected RGW pools omits `<store>.rgw.buckets.non-ec` and `<store>.rgw.otp`, but the post uses the word "include" which makes it non-exhaustive. This is acceptable.
- The advice to delete and recreate the CephObjectStore to fix missing pools is a valid but heavy-handed approach. Users should be aware this causes downtime. The post doesn't explicitly warn about this, but it's acceptable for a troubleshooting guide.
- All `kubectl`, `radosgw-admin`, and `ceph` commands use correct syntax and flags.
- The CephObjectStore YAML example is correct and matches the official Rook examples.
