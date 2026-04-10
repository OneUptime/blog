# Validation Summary: How to Configure Ceph Version Image and Pull Policy in Rook

## Status
validated

## Post Type
Configuration Guide / Reference

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Squid/v19.x)
- Kubernetes (CRDs, ConfigMaps, Secrets, kubectl)
- Container registries (quay.io, Docker Hub, private registries)

## Sources Consulted
- Rook CephCluster CRD specification (`spec.cephVersion` fields: image, allowUnsupported, imagePullPolicy)
- Rook operator ConfigMap variables for CSI images (`ROOK_CSI_CEPH_IMAGE` and related variables), cross-referenced with `posts/2026-03-31-rook-custom-csi-images/README.md`
- Rook Ceph upgrade process documentation, cross-referenced with `posts/2026-03-31-rook-upgrade-ceph-version/README.md` and `posts/2026-03-31-rook-how-to-upgrade-ceph-version-through-rook/README.md`
- Kubernetes imagePullPolicy specification (IfNotPresent, Always, Never)
- Ceph release naming conventions (19.x = Squid)

## Issues Found

1. **Incorrect upgrade monitoring command (`get jobs -w`)**: The post used `kubectl -n rook-ceph get jobs -w` to monitor a Ceph image upgrade. Rook performs rolling upgrades by updating daemon Deployments, not by creating Kubernetes Jobs. Other Rook upgrade posts in this repository confirm monitoring is done by watching pods. Changed to `kubectl -n rook-ceph get pods -w`.

2. **Incorrect `ROOK_CSI_CEPH_IMAGE` usage**: The post set `ROOK_CSI_CEPH_IMAGE` to the main Ceph daemon image (`my-registry.internal/ceph/ceph:v19.2.0`). This ConfigMap variable configures the CephCSI plugin image (e.g., `cephcsi/cephcsi:v3.x`), not the Ceph daemon image. The Ceph daemon image is configured solely via `spec.cephVersion.image`. Additionally, the surrounding text said "Reference the secret in the Rook operator ConfigMap" but the YAML showed an image override, not a secret reference. Fixed the image value to a correct CephCSI image reference and corrected the explanatory text.

## Review Notes
- The `spec.cephVersion` field structure (image, allowUnsupported, imagePullPolicy) is correct per the Rook CephCluster CRD.
- The Ceph version codename "squid" for 19.x is correct.
- The `imagePullSecrets` placement at `spec` level (not under `cephVersion`) is correct.
- The OSD pod label selector `app=rook-ceph-osd` is correct.
- The `quay.io/ceph/ceph` registry recommendation is accurate and current.
- For a fully comprehensive private registry guide, users would also need to override additional CSI sidecar images (`ROOK_CSI_REGISTRAR_IMAGE`, `ROOK_CSI_PROVISIONER_IMAGE`, etc.), but this is outside the scope of this post's focus on `cephVersion`.
