# Validation Summary: How to Expand PersistentVolumeClaims on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, talosctl)
- Kubernetes (PersistentVolumeClaim, StorageClass, CSIDriver, StatefulSet, Deployment)
- CSI (Container Storage Interface, external-resizer sidecar, EXPAND_VOLUME capability)
- Longhorn (volumes.longhorn.io, engines.longhorn.io)
- Rook-Ceph (RBD, CephFS, rook-ceph-tools)
- Prometheus (PrometheusRule, kubelet_volume_stats metrics)

## Sources Consulted
- Kubernetes CSI documentation — CSIDriver object: https://kubernetes-csi.github.io/docs/csi-driver-object.html
- Kubernetes CSI documentation — Volume Expansion: https://kubernetes-csi.github.io/docs/volume-expansion.html
- Kubernetes docs — Expanding Persistent Volumes Claims: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims
- Talos Linux configuration reference (v1alpha1, machine.disks): https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- talosctl CLI reference: https://www.talos.dev/latest/reference/cli/
- Longhorn documentation — Volume CR / Engine CR naming: https://longhorn.io/docs/
- KEP-4650 — StatefulSet Support for Updating Volume Claim Template: https://github.com/kubernetes/enhancements/pull/4651

## Issues Found

1. **Incorrect CSI driver capability check.** The post instructed readers to grep CSIDriver YAML for `volumeLifecycleModes` to verify expansion support. `volumeLifecycleModes` indicates Persistent vs. Ephemeral support — it has nothing to do with `EXPAND_VOLUME`. The CSIDriver object does not expose expansion capability at all; that capability is advertised by the driver's gRPC ControllerGetCapabilities response. Replaced the snippet with a check for the `external-resizer` sidecar plus a note that StorageClass `allowVolumeExpansion: true` is the canonical kubectl-level signal.

2. **Wrong resource name for Longhorn volume lookup.** The post queried `volumes.longhorn.io my-data-pvc`, treating the PVC name as the Longhorn volume name. Longhorn volume CRs are named after the PV (`pvc-<uuid>`), not the PVC. Updated the snippet to first resolve `spec.volumeName` from the PVC, then use that for both the `volumes.longhorn.io` lookup and the `longhornvolume=` label selector on engines (the label key itself was correct; only the value was wrong).

3. **Invalid Talos partition size sentinel.** The example used `size: 0  # Use entire disk`. Per the Talos v1alpha1 configuration reference, the `size:` field should simply be **omitted** to use all remaining disk space; `0` is not the documented sentinel. Replaced the `size: 0` line with a comment instructing the reader to omit `size`.

4. **Non-existent talosctl subcommand.** The troubleshooting section used `talosctl -n 10.0.0.11 usage /var`. There is no `usage` subcommand in talosctl. Replaced it with `talosctl -n 10.0.0.11 df`, which reports filesystem usage on the Talos node.

## Review Notes
- The claim that Kubernetes does not support changing `volumeClaimTemplates` on an existing StatefulSet is still accurate as of Kubernetes 1.30. KEP-4650 is in flight to relax this (allowing in-place storage size, VolumeAttributesClass, label, and annotation changes), but it has not graduated. The post's `--cascade=orphan` workaround remains the standard approach for now and may become unnecessary once that KEP ships.
- The `kubectl patch storageclass local-path -p '{"allowVolumeExpansion": true}'` example assumes the default Rancher local-path-provisioner StorageClass, which historically does not support expansion at the provisioner level — patching the StorageClass alone will not enable real expansion on that driver. The post does not claim otherwise, but a future revision could call this out explicitly.
- The Prometheus alert rule uses `kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes`, which is correct, though in production it would typically also gate on `kubelet_volume_stats_capacity_bytes > 0` to avoid division-by-zero spikes.
