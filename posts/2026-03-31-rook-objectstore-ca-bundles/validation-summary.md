# Validation Summary: How to Configure CA Bundles for Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- Kubernetes Secrets
- TLS / CA certificates
- AWS CLI (S3 client example)

## Sources Consulted
- Rook CephObjectStore CRD source: `pkg/apis/ceph.rook.io/v1/types.go` — confirms `caBundleRef` and `sslCertificateRef` field definitions
- Rook RGW config source: `pkg/operator/ceph/object/config.go` — confirms `cabundle` key name and mount paths (`/etc/ceph/rgw-ca-bundle/`, `/etc/pki/ca-trust/`)
- Rook RGW spec source: `pkg/operator/ceph/object/spec.go` — confirms volume mount logic for CA bundles
- Rook CRD documentation: `Documentation/CRDs/Object-Storage/ceph-object-store-crd.md` — confirms CA bundle is NOT used by the operator for health checks
- Rook object store controller: `pkg/operator/ceph/object/controller.go` — confirms CA bundle secret changes do not auto-trigger reconciliation
- Rook example manifests: `deploy/examples/object.yaml` — confirms CRD field names

## Issues Found

1. **Secret key name was incorrect**: The post stated the key must be `ca.crt`, but the Rook source code defines `caBundleKeyName = "cabundle"`. Changed all occurrences of `ca.crt` (as the secret key) to `cabundle` across the secret creation command, verification command, client pod subPath, rotation command, and summary.

2. **CA bundle mount path was incorrect**: The post stated the mount path is `/var/lib/rook/ceph-client/`, but the actual Rook mount path is `/etc/ceph/rgw-ca-bundle/` (for Ceph Tentacle v20.0.0+) or `/etc/pki/ca-trust/source/anchors/` (for older versions). Corrected to `/etc/ceph/rgw-ca-bundle/`.

3. **Mounted file name was incorrect**: The post said to look for `ca.crt` in the mounted directory, but the actual file is `custom-ca-bundle.crt` (defined as `caBundleFileName` in the source). Corrected accordingly.

4. **False claim about operator health checks**: The post stated that "both the gateway and the operator can validate certificates" using the CA bundle, and that "the operator uses it when making health check requests." The Rook documentation explicitly states: "This bundle is **not** used by the rook operator when connecting to the RGW." The operator uses the `cert` key from `sslCertificateRef` instead. Corrected all references to clarify this distinction.

## Review Notes
- The CA bundle mount path `/etc/ceph/rgw-ca-bundle/` applies to Ceph Tentacle (v20.0.0+) and newer. Older Ceph versions use `/etc/pki/ca-trust/source/anchors/` with an init container running `update-ca-trust extract`. The post now uses the modern path, which is appropriate for current deployments but readers on older Ceph versions should be aware of this.
- The `rollout restart deployment -l app=rook-ceph-rgw` command for rotation is correct — CA bundle secret changes do not automatically trigger Rook reconciliation or pod restarts.
- The client pod example correctly demonstrates using `AWS_CA_BUNDLE` for the AWS CLI, which is a valid approach.
- The `caBundleRef` secret must be of type `Opaque` — the Rook code validates this and rejects other secret types. The post does not mention this requirement, but the default type for `kubectl create secret generic` is `Opaque`, so the commands are correct in practice.
