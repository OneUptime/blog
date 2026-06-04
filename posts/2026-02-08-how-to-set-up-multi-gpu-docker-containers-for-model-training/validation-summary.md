# Validation Summary: How to Set Up Multi-GPU Docker Containers for Model Training

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- NVIDIA Container Toolkit
- NVIDIA CUDA containers
- NVIDIA GPU runtime configuration
- PyTorch DistributedDataParallel
- torchrun
- PyTorch DataLoader and DistributedSampler
- TensorFlow MirroredStrategy
- NVIDIA DCGM exporter

## Sources Consulted
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- Docker GPU access documentation: https://docs.docker.com/engine/containers/gpu/
- Docker Compose GPU support documentation: https://docs.docker.com/compose/how-tos/gpu-support/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- PyTorch DistributedDataParallel documentation: https://docs.pytorch.org/docs/stable/generated/torch.nn.parallel.DistributedDataParallel.html
- PyTorch torchrun documentation: https://docs.pytorch.org/docs/stable/elastic/run.html
- PyTorch data loading documentation: https://docs.pytorch.org/docs/stable/data.html
- TensorFlow Docker install documentation: https://www.tensorflow.org/install/docker
- TensorFlow distributed training guide: https://www.tensorflow.org/guide/distributed_training

## Issues Found
- The Docker Compose examples used `version: "3.8"`. Current Docker Compose treats the top-level `version` property as obsolete and only informative, so it was removed from all Compose snippets.
- The PyTorch example accepted a `--batch-size` argument but hardcoded `batch_size=64` in the `DataLoader`. The `DataLoader` now uses `args.batch_size` so the documented command-line flag actually controls training.
- The troubleshooting advice said to reduce the per-GPU batch size, "not the global batch size." In distributed training the global batch size is derived from per-process/per-GPU batch size times world size unless additional techniques are used. The sentence now recommends reducing per-GPU batch size or using gradient accumulation to preserve the same global batch size.

## Review Notes
- The NVIDIA Container Toolkit installation flow, `nvidia-ctk runtime configure --runtime=docker`, `docker run --gpus` examples, and Docker Compose GPU reservation fields match current official documentation.
- The PyTorch DDP example is appropriate for single-node multi-GPU training launched with `torchrun`; multi-node deployments would need additional rendezvous and rank configuration.
- The TensorFlow `MirroredStrategy` example correctly relies on all visible GPUs and uses a global batch size scaled by `strategy.num_replicas_in_sync`.
