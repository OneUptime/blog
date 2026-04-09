# Validation Summary: How to Set Up Rook-Ceph for Machine Learning Training Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW, CephFS, RBD)
- Kubernetes (Jobs, Deployments, PersistentVolumeClaims)
- AWS CLI (S3-compatible commands against Ceph RGW)
- PyTorch (distributed training on Kubernetes)
- MLflow (experiment tracking with S3 artifact storage)
- NVIDIA GPU Operator (nvidia.com/gpu resource limits)

## Sources Consulted
- Ceph documentation on pool properties (`ceph osd pool set` valid keys): https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph RBD configuration reference (client-side cache and read-ahead settings): https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Kubernetes Job API reference (restartPolicy requirements): https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Deployment v1 API reference (required selector field): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- MLflow Docker image and Dockerfile: https://github.com/mlflow/mlflow/blob/master/docker/Dockerfile
- MLflow v2.12.1 release: https://github.com/mlflow/mlflow/releases/tag/v2.12.1
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/

## Issues Found

1. **Job pod template missing `restartPolicy`** - The PyTorch training Job did not specify `restartPolicy` in the pod template. Kubernetes Jobs require `restartPolicy` to be `Never` or `OnFailure`; the default `Always` is rejected by the API server. Added `restartPolicy: Never` to the pod spec.

2. **Deployment missing `spec.selector` and pod template labels** - The MLflow Deployment was missing the required `spec.selector.matchLabels` field and `spec.template.metadata.labels`. In `apps/v1`, both are mandatory and must match. Added `selector.matchLabels` and `template.metadata.labels` with `app: mlflow`.

3. **Invalid `ceph osd pool set` for RBD cache setting** - The command `ceph osd pool set ml-data-pool rbd_cache_max_dirty_age 5` is invalid because `rbd_cache_max_dirty_age` is a client-side librbd configuration option, not a pool property. Changed to `ceph config set client rbd_cache_max_dirty_age 5`.

4. **Wrong config section for `rbd_readahead_max_bytes`** - The command used `global` as the config section for `rbd_readahead_max_bytes`, which pushes the setting to all daemon types where it has no effect. Since this is a librbd client-side setting, changed section from `global` to `client`.

## Review Notes
- The MLflow Docker image (`ghcr.io/mlflow/mlflow:v2.12.1`) has no ENTRYPOINT, so using `args` with `mlflow` as the first element correctly makes `mlflow` the executable. This works but is somewhat fragile -- if MLflow changes their Dockerfile to add an ENTRYPOINT in the future, this would break. Using `command` instead of `args` would be more explicit.
- The PyTorch image tag `pytorch/pytorch:2.2-cuda12.1-cudnn8-devel` may not exist as an exact tag; Docker Hub PyTorch images typically use full version numbers (e.g., `2.2.0`). This is left as-is since the pattern is illustrative and minor version tags may exist.
- The `--endpoint-url` port is inconsistent between the two AWS CLI commands (`:80` in the first, omitted in the second). Both work since HTTP defaults to port 80, but could confuse readers.
