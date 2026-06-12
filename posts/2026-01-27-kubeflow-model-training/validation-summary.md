# Validation Summary: How to Use Kubeflow for Model Training

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubeflow
- Kubernetes
- Kubeflow Training Operator
- TFJob
- PyTorchJob
- PyTorch DistributedDataParallel
- PyTorch model parallelism
- NVIDIA GPUs and MIG
- Katib
- TensorFlow / Keras
- MLflow
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubeflow manifests / community distribution: https://github.com/kubeflow/manifests
- Kubeflow Training Operator PyTorchJob documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/pytorch/
- Kubeflow Training Operator distributed training reference: https://www.kubeflow.org/docs/components/trainer/legacy-v1/reference/distributed-training/
- Kubeflow Training Operator release-1.9 CRDs and examples: https://github.com/kubeflow/training-operator/tree/release-1.9
- Kubeflow Katib experiment configuration: https://www.kubeflow.org/docs/components/katib/user-guides/hp-tuning/configure-experiment/
- Kubeflow Katib early stopping documentation: https://www.kubeflow.org/docs/components/katib/user-guides/early-stopping/
- Kubeflow Katib resume policy / config documentation: https://www.kubeflow.org/docs/components/katib/user-guides/katib-config/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- NVIDIA Kubernetes device plugin documentation: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA MIG support documentation: https://docs.nvidia.com/datacenter/cloud-native/kubernetes/latest/index.html
- PyTorch torchrun documentation: https://docs.pytorch.org/docs/stable/elastic/run.html
- PyTorch pipeline parallelism tutorial: https://docs.pytorch.org/tutorials/intermediate/pipelining_tutorial.html
- MLflow Python API / MLflow 3 migration notes: https://mlflow.org/docs/latest/ml/mlflow-3/

## Issues Found
- The TFJob example placed `ttlSecondsAfterFinished` directly under `spec`. In the Kubeflow Training Operator v1 CRD, this field belongs under `spec.runPolicy`. Moved it to `runPolicy.ttlSecondsAfterFinished`.
- The PyTorchJob example used deprecated `torch.distributed.launch` and mixed elastic training with a master/worker layout. Updated it to use `torch.distributed.run` with an elastic Worker replica spec and `c10d`, matching current Training Operator examples.
- The PyTorch DDP script manually built a TCP init method and mapped GPU IDs from global rank. Updated it to rely on `torchrun` environment variables and use `LOCAL_RANK` for CUDA device selection.
- The model-parallel PyTorch snippet used `Pipe` on a custom `nn.Module`, which is not a valid minimal example for current pipeline APIs. Simplified the snippet to a basic two-GPU model-parallel example without the invalid `Pipe` wrapper.
- The Kubernetes GPU pod example manually set `NVIDIA_VISIBLE_DEVICES` and `CUDA_VISIBLE_DEVICES`. Removed those settings because the NVIDIA device plugin exposes allocated devices to the container.
- The Katib search space allowed `num_layers` up to 10, but the Keras MNIST CNN repeatedly applies valid 3x3 convolutions and 2x2 pooling to 28x28 inputs; more than 3 layers would create invalid spatial dimensions. Reduced the maximum to 3.
- The MLflow example used the older positional model artifact path. Updated `mlflow.pytorch.log_model` to use the current `name="model"` argument.

## Review Notes
Kubeflow Trainer v2 is now the current direction for new Kubeflow training APIs, while TFJob and PyTorchJob are documented as legacy Training Operator v1 APIs. The post remains technically useful because it is explicitly about TFJob and PyTorchJob, but a future refresh could add a note about Trainer v2 migration.
