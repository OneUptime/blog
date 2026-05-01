# Validation Summary: How to Set Up Distributed Training on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubeflow Training Operator / PyTorchJob / TFJob
- PyTorch Distributed Data Parallel (DDP)
- TensorFlow distributed training
- NCCL
- NVIDIA DCGM Exporter

## Sources Consulted
- Kubeflow Training Operator v1 installation docs: https://www.kubeflow.org/docs/components/trainer/legacy-v1/installation/
- Kubeflow distributed training reference: https://www.kubeflow.org/docs/components/trainer/legacy-v1/reference/distributed-training/
- Kubeflow PyTorchJob guide: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/pytorch/
- Kubeflow TFJob guide: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/tensorflow/
- PyTorch `torchrun` docs: https://docs.pytorch.org/docs/2.11/elastic/run.html
- PyTorch distributed docs: https://docs.pytorch.org/docs/2.11/distributed.html
- TorchVision `resnet50` API docs: https://docs.pytorch.org/vision/main/models/generated/torchvision.models.resnet50
- TorchVision model weights migration docs: https://docs.pytorch.org/vision/2.0/models.html
- TensorFlow distributed training guide: https://www.tensorflow.org/guide/distributed_training
- TensorFlow `ParameterServerStrategy` docs: https://www.tensorflow.org/api_docs/python/tf/distribute/experimental/ParameterServerStrategy
- Kubernetes command/args environment variable expansion docs: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- NVIDIA NCCL environment variable docs: https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/env.html
- NVIDIA DCGM Exporter docs: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html

## Issues Found
- The PyTorch DDP script was not runnable as written: it was missing `os`, used an undefined `load_dataset`, had no CLI entry point, and did not accept the `--local-rank` / `--local_rank` argument that current `torchrun` passes. I replaced it with a runnable example using `torchvision.datasets.ImageFolder`, added the required imports and argument parsing, and added the missing main entry point.
- The PyTorch example used `torchvision.models.resnet50(pretrained=False)`, which is deprecated in current TorchVision. I changed it to `weights=None`.
- The logging condition used `local_rank == 0`, which would print once per node instead of once globally. I changed it to `dist.get_rank() == 0`.
- The PyTorchJob `Master` and `Worker` commands were inconsistent. The worker command did not receive the same dataset or training arguments as the master command. I added matching `--data-path`, `--epochs`, and `--batch-size` arguments so all ranks run the same training configuration.
- The NCCL snippet included `NCCL_TIMEOUT`, which is not a documented NCCL environment variable. I removed it and clarified that the YAML block is a fragment to place under the training container spec.
- The monitoring example tried to run `nvidia-smi dmon` inside a `dcgm-exporter` pod. DCGM Exporter is documented to expose metrics on `/metrics`, not to serve as an `nvidia-smi` shell target. I replaced that example with a `kubectl port-forward` plus `curl` workflow using `DCGM_FI_DEV_GPU_UTIL`.
- The conclusion referred to `TF MirroredStrategy`, but the TensorFlow example uses a Chief/Worker/PS topology that aligns with parameter-server training. I corrected the conclusion to reference `TensorFlow ParameterServerStrategy`.

## Review Notes
- Kubeflow Training Operator v1 is documented as the legacy API line. The post is technically valid after the fixes above, but readers should expect newer Kubeflow Trainer v2 APIs in current deployments.
- The `nvidia.com/gpu.present` node label shown in the examples is environment-dependent. The portable scheduling requirement is the `nvidia.com/gpu` resource request; label usage may vary by GPU Operator / node feature discovery setup.
- `kubectl` was not available in the local review environment, so command syntax was validated against official documentation rather than local `--help` output.
