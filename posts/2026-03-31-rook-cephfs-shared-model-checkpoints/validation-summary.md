# Validation Summary: How to Set Up CephFS for Shared Model Checkpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- Kubernetes (Jobs, CronJobs, PVCs, StorageClasses)
- PyTorch (distributed training, checkpointing)
- Python

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/job-v1/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- PyTorch torch.load documentation: https://pytorch.org/docs/2.1/generated/torch.load.html
- PyTorch distributed training documentation: https://pytorch.org/docs/2.1/distributed.html

## Issues Found
1. **Missing `restartPolicy` in Job template** (line ~101): The Kubernetes Job for distributed training omitted `restartPolicy` in the pod template spec. Kubernetes Jobs require `restartPolicy` to be either `Never` or `OnFailure` -- the default `Always` is rejected by the API server with a validation error. Fixed by adding `restartPolicy: Never`.

2. **Missing `restartPolicy` in CronJob template** (line ~144): The CronJob for checkpoint rotation also omitted `restartPolicy` in its pod template spec. Same issue as above. Fixed by adding `restartPolicy: OnFailure`.

## Review Notes
- The CephFilesystem CRD spec is correct and matches current Rook documentation. All fields (`metadataPool`, `dataPools`, `metadataServer` with `activeCount` and `activeStandby`) are valid.
- The PyTorch checkpoint code is correct for PyTorch 2.1.0 (the version in the referenced Docker image). However, `torch.load` without explicit `weights_only=True` will fail in PyTorch 2.6+ where the default changed to `weights_only=True`. If the Docker image is upgraded in the future, the `load_latest_checkpoint` function will need `weights_only=False` added explicitly or the checkpoint format restructured.
- The `load_latest_checkpoint` function uses `sorted(os.listdir(checkpoint_dir))` without filtering for `.pt` files. This works correctly when the checkpoint directory contains only checkpoint files (as expected in this setup), but is fragile if other files are introduced.
- The text says "Create a StorageClass and PVC" but only shows the PVC creation. The StorageClass `rook-cephfs` is assumed to already exist from a standard Rook deployment.
- The CronJob references `/scripts/rotate-checkpoints.sh` but doesn't show how the script is mounted into the container (e.g., via a ConfigMap). Readers will need to create and mount the script separately.
- The Kubernetes Job is a simplified example for demonstrating volume mounting. Real distributed PyTorch training would typically use a PyTorchJob (Kubeflow) or similar controller that configures the distributed environment variables (MASTER_ADDR, MASTER_PORT, WORLD_SIZE, RANK).
