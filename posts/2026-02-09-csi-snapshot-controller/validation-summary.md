# Validation Summary: How to Configure CSI Snapshot Controller for Snapshot Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CSI Volume Snapshots
- Kubernetes CSI external-snapshotter
- Kubernetes CustomResourceDefinitions
- Kubernetes RBAC, Deployments, StatefulSets, and Jobs
- Prometheus / PromQL

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI external-snapshotter documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html
- Kubernetes CSI external-snapshotter GitHub repository and release manifests: https://github.com/kubernetes-csi/external-snapshotter
- Kubernetes CSI external-snapshotter v8.6.0 release: https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v8.6.0
- Kubernetes CSI external-snapshotter README command-line options: https://github.com/kubernetes-csi/external-snapshotter/blob/v8.6.0/README.md
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post used moving `master` branch URLs while pinning old v6.3.0 images. Updated install URLs to the tagged v8.6.0 release and updated example images to the versions used by the tagged upstream manifests.
- The deployment commands created a `snapshot-controller` namespace, but the upstream manifests install the controller in `kube-system`. Removed the namespace creation step and clarified the upstream namespace behavior.
- The post used `app=snapshot-controller` labels, but current upstream manifests use `app.kubernetes.io/name=snapshot-controller`. Updated the verification and log commands accordingly.
- The controller example included `--timeout=300s`, which is a CSI snapshotter sidecar flag, not a snapshot-controller flag. Replaced it with valid controller options, including `--http-endpoint=:8080` and `--retry-interval-max=5m`.
- The controller probes referenced `/healthz` and `/readyz`, but the external-snapshotter HTTP endpoint exposes metrics and `/healthz/leader-election`. Updated the liveness probe and removed the unsupported readiness probe.
- The sidecar example used an old image tag and a non-CSI-style driver endpoint value. Updated the sidecar image and changed the driver endpoint to `unix:///csi/csi.sock`.
- The monitoring rules referenced non-existent `snapshot_controller_create_snapshot_errors_total` and `snapshot_controller_delete_snapshot_errors_total` counters. Replaced them with queries against the real `snapshot_controller_operation_total_seconds_count` metric labels.
- The test job referenced a `snapshot-tester` service account without creating it. Added minimal ServiceAccount, Role, and RoleBinding resources.
- The test job assumed generic `standard` and `csi-snapshot-class` class names. Reworded the example so readers replace them with a CSI StorageClass and matching VolumeSnapshotClass supported by their driver.

## Review Notes
The latest GitHub release on 2026-06-04 is v8.6.0, but the tagged upstream deployment manifests still reference v8.5.0 container images. The post now follows the tagged upstream manifests rather than inventing image tags. The CSI snapshotter sidecar is normally installed with the CSI driver vendor's controller deployment, so the generic sidecar YAML remains illustrative.
