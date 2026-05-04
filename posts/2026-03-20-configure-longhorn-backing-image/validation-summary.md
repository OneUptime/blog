# Validation Summary: How to Configure Longhorn Backing Image

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Longhorn BackingImage CRD (longhorn.io/v1beta2)
- Longhorn Volume CRD (longhorn.io/v1beta2)
- Kubernetes StorageClass (storage.k8s.io/v1)
- Kubernetes PersistentVolumeClaim
- KubeVirt (kubevirt.io/v1)
- kubectl

## Sources Consulted
- Longhorn Backing Image documentation: https://longhorn.io/docs/1.11.1/advanced-resources/backing-image/backing-image/
- Longhorn StorageClass Parameters reference: https://longhorn.io/docs/1.11.0/references/storage-class-parameters/
- Longhorn Settings reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn RWX Volume docs: https://longhorn.io/docs/1.11.1/nodes-and-volumes/volumes/rwx-volumes/
- longhorn-manager CRD source: https://github.com/longhorn/longhorn-manager/blob/master/k8s/crds.yaml
- Backing Image enhancement proposal: https://github.com/longhorn/longhorn/blob/master/enhancements/20210701-backing-image.md
- Longhorn Volume CRD discussion #3429: https://github.com/longhorn/longhorn/discussions/3429

## Issues Found

1. **Incorrect StorageClass parameter name** — The post used `backingImage:` as a StorageClass parameter, but the correct parameter name is `backingImageName:` per the official Longhorn StorageClass parameters reference. Fixed by renaming the field in the StorageClass YAML example.

2. **Incorrect description of `backing-image-cleanup-wait-interval` setting** — The post described this setting as setting "the minimum number of copies of backing images to maintain", but per the Longhorn settings reference this setting is actually the wait interval (in minutes) before Longhorn cleans up an unused backing image file from a disk after no replica on that disk is using it. Fixed by:
   - Correcting the prose and the inline comment to describe the actual cleanup-wait behavior.
   - Adding a second `kubectl patch` example using the correct setting (`default-min-number-of-backing-image-copies`) for configuring the minimum number of backing image copies the cluster maintains.

## Review Notes

- The `BackingImage` `checksum:` field in the YAML matches the actual CRD field name (the conceptual term "expected checksum" appears in design docs, but the field on the CRD spec is `checksum`).
- The `export-from-volume` parameter keys `volume-name` and `snapshot-name` are correctly hyphenated; these are passed verbatim as a string map to the backing-image-manager.
- The Longhorn `Volume` CRD spec correctly uses the lowercase short form `accessMode: rwx` (rather than the PVC-style `ReadWriteMany`), which the post follows.
- The post's claim that volume creation copies the backing image to the new volume is a slight simplification — Longhorn replicas reference the local backing image file as a read-only base layer, and only the divergent data is stored per replica. The "starts with the image's data already present" framing is accurate for users.
- Version-specific caveat: settings and parameters were verified against Longhorn v1.11.x. Older clusters (v1.4 and earlier) may not expose all the same settings (e.g., `default-min-number-of-backing-image-copies` was introduced in v1.6).
