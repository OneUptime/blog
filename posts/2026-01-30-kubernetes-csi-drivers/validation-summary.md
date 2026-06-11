# Validation Summary: How to Build Kubernetes CSI Drivers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Container Storage Interface (CSI)
- CSI sidecar containers
- Go
- gRPC
- Kubernetes StorageClass, CSIDriver, Deployment, and DaemonSet manifests
- CSI sanity testing

## Sources Consulted
- CSI specification and protobuf definitions: https://github.com/container-storage-interface/spec
- CSI Go package documentation: https://pkg.go.dev/github.com/container-storage-interface/spec/lib/go/csi
- Kubernetes CSI developer documentation: https://kubernetes-csi.github.io/docs/
- Kubernetes CSIDriver API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- CSI external-provisioner documentation: https://kubernetes-csi.github.io/docs/external-provisioner.html
- CSI external-snapshotter documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html
- CSI snapshot-controller documentation: https://kubernetes-csi.github.io/docs/snapshot-controller.html
- CSI node-driver-registrar documentation: https://kubernetes-csi.github.io/docs/node-driver-registrar.html

## Issues Found
- The Controller service RPC overview omitted newer CSI controller RPCs present in current CSI releases. Added `GetSnapshot`, `ControllerGetVolume`, and `ControllerModifyVolume`.
- The Go dependency pinned CSI spec `v1.9.0` while the text was updated to reflect current CSI APIs. Updated the dependency to `v1.12.0`.
- Several Go snippets referenced packages without importing them. Added missing imports for `wrapperspb`, `timestamppb`, `unix`, the hypothetical `storage` package, and the hypothetical `iscsi` package.
- The directory structure did not include the `pkg/iscsi` package used by the driver structure. Added it to the shown layout.
- The driver registered generated CSI services but did not embed the generated unimplemented server structs. Added `csi.UnimplementedIdentityServer`, `csi.UnimplementedControllerServer`, and `csi.UnimplementedNodeServer` for forward-compatible implementations.
- `ControllerGetCapabilities` advertised `LIST_VOLUMES`, `GET_CAPACITY`, and `LIST_SNAPSHOTS` even though the tutorial did not implement those RPCs. Removed those advertised capabilities.
- Snapshot support advertised create/delete snapshot capability but only implemented `CreateSnapshot`. Added a minimal `DeleteSnapshot` example.
- The node service snippet had unused imports and an unused `formatOptions` variable, and it used `unix.Statfs` without importing `golang.org/x/sys/unix`. Corrected the snippet.
- The StorageClass used `fsType`, which would be passed as an opaque CSI parameter rather than the reserved CSI filesystem type parameter. Changed it to `csi.storage.k8s.io/fstype`.
- The sidecar table described external-snapshotter as watching `VolumeSnapshots`. Corrected it to `VolumeSnapshotContents` and added the required note that snapshot support also needs VolumeSnapshot CRDs and the snapshot-controller.
- Test snippets used the hypothetical `storage` package and CSI sanity test helpers without all required imports. Added the missing imports.

## Review Notes
The article is still a high-level tutorial around a hypothetical storage backend, so backend-specific packages such as `storage` and `iscsi` remain illustrative. The sidecar image versions shown are older than the latest available releases as of this review date; they are valid examples for compatible Kubernetes clusters, but production users should select sidecar versions from the Kubernetes CSI compatibility matrix for their cluster version.
