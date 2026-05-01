# Validation Summary: How to Set Up Distributed Training on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Kubeflow Training Operator v1
- PyTorch
- `torchrun`
- NVIDIA GPU Operator
- GPU scheduling

## Sources Consulted
- Kubeflow legacy Training Operator v1 installation docs: https://www.kubeflow.org/docs/components/trainer/legacy-v1/installation/
- Kubeflow legacy PyTorchJob guide: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/pytorch/
- Kubeflow legacy getting started guide: https://www.kubeflow.org/docs/components/trainer/legacy-v1/getting-started/
- Official Kubeflow Training Operator v1 `PyTorchJobSpec` source (`nprocPerNode`): https://github.com/kubeflow/training-operator/blob/release-1.9/pkg/apis/kubeflow.org/v1/pytorch_types.go
- Official Kubeflow Training Operator v1 PyTorch env injection source (`PET_NNODES`, `PET_NODE_RANK`, `WORLD_SIZE`, `RANK`): https://github.com/kubeflow/training-operator/blob/release-1.9/pkg/controller.v1/pytorch/envvar.go
- Official Kubeflow Training Operator v1 `torchrun` example: https://github.com/kubeflow/training-operator/blob/release-1.9/examples/pytorch/cpu-demo/demo.yaml
- PyTorch `torchrun` docs: https://docs.pytorch.org/docs/stable/elastic/run.html
- NVIDIA GPU Operator installation docs: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/install-gpu-operator.html
- Kubernetes GPU scheduling docs: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes command and args env expansion docs: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found
- The post installed an older standalone Training Operator manifest (`v1.7.0`) without matching the current legacy v1 install command from Kubeflow docs. I updated it to the documented standalone install command for `v1.8.1` and added `--server-side`.
- The GPU Operator install snippet omitted `helm repo update` and did not wait for the chart to finish installing. I added `helm repo update` and `--wait` to align the command with NVIDIA’s installation guidance.
- The `PyTorchJob` manifest requested `nvidia.com/gpu` under `resources.requests` only. Kubernetes requires GPUs to be specified in `limits` (or in both `requests` and `limits` with equal values). I changed both replica specs to use `limits`.
- The original launcher used `python -m torch.distributed.launch` with only `--nproc_per_node=2`, which is deprecated in PyTorch and incomplete for multi-node execution. I replaced it with `torchrun` and added the required multi-node flags wired to the env vars injected by the Training Operator.
- The original manifest launched different train-script arguments on master and worker pods. I made the `torchrun` arguments consistent across master and worker so all ranks run the same training configuration.
- The post claimed to “launch” the job but only showed the YAML. I added the missing namespace creation and `kubectl apply -f pytorch-training-job.yaml` command.
- The Python example was not runnable as written: it was missing argument parsing for `--epochs`, `--batch-size`, and `torchrun`’s `--local-rank`; it also referenced undefined symbols (`MyModel`, `dataset`, `DataLoader`). I replaced it with a syntactically correct, runnable DDP example that matches the manifest’s launch pattern.
- The monitoring snippet used `nvidia-smi` inside the training pod as a generic utilization check, which is not reliable for arbitrary training images. I changed it to a PyTorch-based GPU visibility check that matches the stated container environment.
- The conclusion overstated what `PyTorchJob` automates. I corrected it to distinguish between operator-managed replica topology/env injection and application-managed `dist.init_process_group()` setup.

## Review Notes
- The post now accurately reflects the legacy Kubeflow Training Operator v1 flow. Kubeflow’s current docs position this API surface as legacy and recommend Kubeflow Trainer v2 for new work.
- The tutorial is still Rancher-light: it applies cleanly to Rancher-managed Kubernetes, but it does not cover Rancher-specific cluster setup, GPU node pool configuration, or namespace security policy nuances.
