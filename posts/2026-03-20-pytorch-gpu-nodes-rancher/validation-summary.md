# Validation Summary: How to Deploy PyTorch on GPU Nodes in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- PyTorch
- Kubeflow Training Operator
- TorchServe
- MLflow
- NVIDIA GPU scheduling on Kubernetes
- Docker

## Sources Consulted
- PyTorch previous versions: https://pytorch.org/get-started/previous-versions
- PyTorch distributed communication package: https://docs.pytorch.org/docs/stable/distributed.html
- Kubeflow Training Operator v1 getting started: https://www.kubeflow.org/docs/components/trainer/legacy-v1/getting-started/
- Kubernetes GPU scheduling: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- TorchServe Docker documentation: https://github.com/pytorch/serve/blob/master/docker/README.md
- TorchServe token authorization API: https://docs.pytorch.org/serve/token_authorization_api.html
- TorchServe configuration reference: https://docs.pytorch.org/serve/configuration.html
- MLflow remote tracking server tutorial: https://mlflow.org/docs/latest/ml/tracking/tutorials/remote-server/
- MLflow tracking server architecture: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- Official MLflow Docker image docs: https://mlflow.org/docs/latest/ml/docker/

## Issues Found
- The `PyTorchJob` example used `torch.distributed.launch`, which PyTorch documents as deprecated in favor of newer distributed launch patterns. I replaced that example with an operator-aligned `python train_distributed.py` invocation and reduced each replica to `1` GPU so it matches Kubeflow's documented `PyTorchJob` DDP pattern where the operator provides `WORLD_SIZE` and `RANK`.
- The distributed training comment claimed `4 workers x 4 GPUs = 16 GPUs`, but the manifest also allocated GPUs to the `Master` replica. I corrected the example to `4 workers + 1 master = 5 GPUs total` after updating the replica GPU allocation.
- The TorchServe deployment omitted any handling for TorchServe's current default token authorization. In a two-replica Service, per-pod tokens would make the simple load-balanced example fail. I added `--disable-token-auth` so the deployment works as shown.
- The MLflow deployment used the stock `ghcr.io/mlflow/mlflow:v2.7.0` image with PostgreSQL and S3 settings, but MLflow's official remote tracking docs require PostgreSQL and S3 Python dependencies. I updated the command to install `psycopg2-binary` and `boto3` before startup, and switched the server to `--artifacts-destination`, which matches current MLflow tracking-server guidance for proxied artifact storage.

## Review Notes
- `PyTorchJob` is the legacy Kubeflow Training Operator v1 API. The post is still technically valid after the fixes, but new deployments should evaluate Kubeflow Trainer v2.
- TorchServe is now in limited-maintenance mode upstream. The example remains usable, but it is not a strong long-term default for new production inference stacks.
- The `nodeSelector` labels such as `nvidia.com/gpu.present` and `nvidia.com/gpu.product` depend on NVIDIA GPU Feature Discovery or equivalent node labeling. They are valid when those labels exist, but they are not universal Kubernetes defaults.
- The MLflow S3 example still requires credentials to be supplied to the pod through the cluster's normal mechanism, such as workload identity or Kubernetes Secrets.
