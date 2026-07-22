# Validation Summary: How to Install the CSI Snapshot Controller and CRDs on a kubeadm Cluster

## Status

validated

## Post Type

Technical installation and verification guide

## Technologies Covered

- Kubernetes
- kubeadm
- Container Storage Interface (CSI)
- CSI external-snapshotter
- VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass APIs
- Kubernetes CustomResourceDefinitions (CRDs)
- Kubernetes RBAC and leader election
- kubectl

## Sources Consulted

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [kubectl wait reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [External Snapshotter v8.5.0 release](https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v8.5.0)
- [External Snapshotter v8.5.0 CRD manifests](https://github.com/kubernetes-csi/external-snapshotter/tree/v8.5.0/client/config/crd)
- [External Snapshotter v8.5.0 snapshot-controller manifests](https://github.com/kubernetes-csi/external-snapshotter/tree/v8.5.0/deploy/kubernetes/snapshot-controller)
- [External Snapshotter v8.0 changelog: CEL validation and webhook deprecation](https://github.com/kubernetes-csi/external-snapshotter/blob/v8.5.0/CHANGELOG/CHANGELOG-8.0.md)
- [External Snapshotter v8.2 changelog: validation webhook removal](https://github.com/kubernetes-csi/external-snapshotter/blob/v8.5.0/CHANGELOG/CHANGELOG-8.2.md)
- [Kubernetes CSI external-snapshotter documentation](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI versioning and compatibility policy](https://kubernetes-csi.github.io/docs/project-policies.html)

## Issues Found

- The post stated that the external-snapshotter project publishes a compatibility matrix for every supported release. The central compatibility table does not currently enumerate every published supported release. Changed this to say that the project publishes compatibility information for its releases; the post already correctly directs readers to the selected tag's release page and release notes for version-specific requirements.

## Review Notes

- The post's `v8.5.0` example is a published release with a minimum and recommended Kubernetes version of 1.25.
- The exact `v8.5.0` setup manifest deploys two snapshot-controller replicas in `kube-system`, enables leader election, and uses the `app.kubernetes.io/name=snapshot-controller` label shown in the verification command.
- The exact `v8.5.0` setup manifest references `snapshot-controller:v8.4.0`. The post correctly tells readers to review the rendered image and not assume every version string must match the repository tag.
- The validating admission webhook was deprecated in external-snapshotter v8.0 and removed in v8.2. The separate webhook included in v8.5.0 is a conversion webhook for VolumeGroupSnapshot API versions, so excluding it from a volume-snapshot-only installation is correct.
- A newer `v8.6.0` tag exists as of validation. Retaining `v8.5.0` as a concrete published example is technically valid because the post instructs administrators to select a release compatible with their cluster rather than treating the example as the latest version.
- The Kubernetes API objects, YAML fields, raw manifest URLs, rollout and wait commands, RBAC checks, sidecar explanation, deletion policies, and snapshot readiness fields were verified and are technically correct.
