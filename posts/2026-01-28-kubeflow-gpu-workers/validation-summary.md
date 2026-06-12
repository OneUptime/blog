# Validation Summary: How to Use Kubeflow with GPU Workers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubeflow
- Kubeflow Pipelines
- Kubeflow Training Operator / PyTorchJob
- Kubernetes GPU scheduling
- NVIDIA drivers, Container Toolkit, and device plugin
- NVIDIA DCGM exporter
- PyTorch, DataParallel, DistributedDataParallel, AMP, and gradient checkpointing
- Prometheus / PromQL

## Sources Consulted
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes device plugin documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Kubernetes device plugin manifest v0.14.3: https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.3/nvidia-device-plugin.yml
- Kubeflow PyTorchJob documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/pytorch/
- Kubeflow Pipelines platform-specific features documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/platform-specific-features/
- kfp-kubernetes node selector API reference: https://kfp-kubernetes.readthedocs.io/en/kfp-kubernetes-1.2.0/_modules/kfp/kubernetes/node_selector.html
- kfp-kubernetes toleration API reference: https://kfp-kubernetes.readthedocs.io/en/kfp-kubernetes-1.2.0/_modules/kfp/kubernetes/toleration.html
- Kubeflow Pipelines PipelineTask API reference: https://kubeflow-pipelines.readthedocs.io/en/stable/_modules/kfp/dsl/pipeline_task.html
- PyTorch torchrun documentation: https://docs.pytorch.org/docs/2.12/elastic/run.html
- PyTorch AMP documentation: https://docs.pytorch.org/docs/2.12/amp.html
- PyTorch checkpoint documentation: https://docs.pytorch.org/docs/2.12/checkpoint.html
- NVIDIA DCGM exporter Kubernetes manifest: https://github.com/NVIDIA/dcgm-exporter/blob/main/dcgm-exporter.yaml

## Issues Found
- The infrastructure diagram implied that a host CUDA Toolkit layer is required. Updated it to describe CUDA libraries in the container image, which better matches Kubernetes GPU container workflows.
- The NVIDIA Container Toolkit repository setup used the deprecated `apt-key` flow and was placed under driver installation. Replaced it with NVIDIA's current signed keyring repository setup in the Container Toolkit section.
- The Kubeflow Pipelines example used `add_node_selector_constraint("accelerator", "nvidia-tesla-a100")`, but current KFP treats that method as a deprecated accelerator-type wrapper with a single argument. Replaced it with `kfp.kubernetes.add_node_selector`.
- The pipeline example called `set_gpu_limit(1)` after already setting the accelerator type and limit. Replaced it with `kfp.kubernetes.add_toleration` so the task can schedule on tainted GPU nodes.
- The PyTorchJob manifest used deprecated `python -m torch.distributed.launch`. Updated it to `torchrun` with current dashed flags.
- The PyTorchJob was in a Kubeflow user namespace but did not disable Istio sidecar injection. Added `sidecar.istio.io/inject: "false"` annotations to replica pod templates, matching Kubeflow Training Operator guidance.
- The PyTorchJob selected GPU nodes but did not tolerate the GPU taint used elsewhere in the post. Added matching tolerations to Master and Worker pod specs.
- The mixed precision example used deprecated `torch.cuda.amp` imports and constructors. Updated it to `torch.amp.autocast("cuda")` and `torch.amp.GradScaler("cuda")`.
- The gradient checkpointing example omitted `use_reentrant`. Added `use_reentrant=False` to make behavior explicit with current PyTorch.
- The mixed precision section said FP16 doubles effective batch size. Softened the claim because memory savings are workload-dependent.
- The troubleshooting section checked `/etc/docker/daemon.json` from inside a workload pod, which does not verify the node runtime in containerd-based Kubernetes clusters. Replaced it with a node container runtime check.

## Review Notes
The post remains version-sensitive. `nvidia-driver-535`, NVIDIA device plugin v0.14.3, Kubeflow notebook image v1.8.0, and the DCGM exporter image are valid examples but may not be the latest choices for a new cluster. PyTorch `DataParallel` is still available, but `DistributedDataParallel` is generally preferred for performance; the post already introduces DDP in the distributed training section.
