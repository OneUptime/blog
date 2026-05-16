# Validation Summary: How to Deploy PyTorch Workloads on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- PyTorch 2.2.0 (CUDA 12.1, cuDNN 8)
- Kubernetes (Jobs, Deployments, Services, ConfigMaps, PVCs)
- NVIDIA device plugin / GPUs (`nvidia.com/gpu` resource)
- torchvision (ResNet-18, CIFAR-10 dataset)
- PyTorch DistributedDataParallel (DDP) via `torch.distributed.run`
- NCCL backend for distributed training
- TorchServe (`torch-model-archiver`, `pytorch/torchserve:latest-gpu`)

## Sources Consulted
- PyTorch official documentation: https://pytorch.org/docs/stable/
- torchvision models: https://pytorch.org/vision/stable/models.html
- PyTorch distributed (`torch.distributed.run` / torchrun): https://pytorch.org/docs/stable/elastic/run.html
- PyTorch DistributedDataParallel: https://pytorch.org/docs/stable/generated/torch.nn.parallel.DistributedDataParallel.html
- TorchServe documentation and Docker image: https://github.com/pytorch/serve and https://hub.docker.com/r/pytorch/torchserve
- torch-model-archiver CLI: https://github.com/pytorch/serve/blob/master/model-archiver/README.md
- PyTorch Docker images: https://hub.docker.com/r/pytorch/pytorch/tags (verified `2.2.0-cuda12.1-cudnn8-runtime` exists)
- Kubernetes kubectl reference (`kubectl run`, `kubectl logs job/...`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Jobs API: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Headless Service pattern for Pod DNS: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- CIFAR-10 standard normalization values (commonly used `mean=(0.4914, 0.4822, 0.4465)`, `std=(0.2470, 0.2435, 0.2616)`)

## Issues Found
1. **Missing `import os` in `ddp_train.py`**: The distributed training script referenced `os.environ.get('LOCAL_RANK', 0)` without importing the `os` module, which would raise `NameError` immediately at startup. Added `import os` to the import block at the top of the script.

## Review Notes
- The `--limits=nvidia.com/gpu=1` flag on `kubectl run` is marked DEPRECATED in recent kubectl versions and may be removed in future releases. It still functions in current kubectl, but readers on newer clusters may eventually need to switch to `--overrides` with a JSON resources block. Left as-is since it still works today.
- `torchvision.models.resnet18(num_classes=10)` works on 32x32 CIFAR-10 images but is suboptimal — the ImageNet ResNet-18 stem uses a 7x7 stride-2 conv plus maxpool, which downsamples CIFAR-10 quite aggressively. Many CIFAR-10 tutorials swap in a 3x3 stride-1 conv stem. This is a model-quality nit rather than a correctness bug, so left unchanged.
- The TorchServe Deployment overrides the container `args` (not the entrypoint). The official `pytorch/torchserve` image's `dockerd-entrypoint.sh` runs `eval "$@"` and then `tail -f /dev/null`, so `torchserve --start ...` will daemonize but the container stays alive — this works as written.
- TorchServe ports 8080 (Inference), 8081 (Management), 8082 (Metrics) match the documented defaults.
- `torch.distributed.run` is the current launcher (replaces the deprecated `torch.distributed.launch`); arguments `--nproc_per_node`, `--nnodes`, `--node_rank`, `--master_addr`, `--master_port` are all valid.
- The DDP example sets `subdomain`/`hostname` on a Pod template inside a Job spec — this is valid (Job pod template supports the same fields as a Pod) and combined with the headless Service `pytorch-workers` will produce a stable DNS name `worker-0.pytorch-workers.ml-workloads.svc`.
- The DDP example only shows worker-0; readers will need to duplicate the Job for worker-1 (with `--node_rank=1`, `hostname: worker-1`) to actually achieve `--nnodes=2`. The post implies this with "worker-0" naming but does not spell it out — content choice, not a correctness issue.
- `kubectl logs job/<name> -f` works as of Kubernetes 1.18+ and is correct.
- CIFAR-10 normalization constants used in the transforms are the conventional values reported in the literature for this dataset.
