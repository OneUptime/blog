# Validation Summary: How to Deploy PyTorch Training Jobs Using the Kubeflow Training Operator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubeflow Training Operator v1
- Kubeflow Trainer v2
- PyTorch
- PyTorch DistributedDataParallel
- TorchElastic / torch.distributed.run
- NVIDIA GPU scheduling on Kubernetes
- PersistentVolumeClaim
- ResourceQuota
- Prometheus metrics

## Sources Consulted
- Kubeflow Training Operator v1 installation documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/installation/
- Kubeflow Training Operator v1 getting started documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/getting-started/
- Kubeflow PyTorchJob documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/pytorch/
- Kubeflow Training Operator v1 Prometheus monitoring documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/prometheus/
- Kubeflow Trainer v2 installation documentation: https://www.kubeflow.org/docs/components/trainer/operator-guides/installation/
- Kubeflow Training Operator v1.8.1 PyTorchJob CRD schema: https://raw.githubusercontent.com/kubeflow/training-operator/v1.8.1/manifests/base/crds/kubeflow.org_pytorchjobs.yaml
- Kubeflow Training Operator v1.8.1 PyTorch examples: https://github.com/kubeflow/training-operator/tree/v1.8.1/examples/pytorch
- PyTorch DistributedDataParallel documentation: https://docs.pytorch.org/docs/stable/generated/torch.nn.parallel.DistributedDataParallel.html
- PyTorch distributed package documentation: https://docs.pytorch.org/docs/stable/distributed.html
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Prometheus Operator ServiceMonitor design documentation: https://prometheus-operator.dev/docs/getting-started/design/

## Issues Found
- The install command pinned `v1.7.0` without noting that Training Operator v1 is now legacy. Updated the Kustomize command to the official stable v1 `v1.8.1` form using `--server-side` and added a note to review Kubeflow Trainer v2 for new deployments.
- The Helm repository and chart command used `https://kubeflow.github.io/training-operator`, which is not the official documented install path for the legacy `PyTorchJob` API and returned no chart index. Removed the invalid Helm install block.
- The DDP script saved `model.pt` under `/workspace`, but that path is mounted from a ConfigMap in the example and is read-only. Added an `emptyDir` checkpoint mount and changed the save path to `/checkpoints/model.pt`.
- The DDP script claimed to aggregate loss across all ranks but only averaged the local process loss. Added `dist.all_reduce` and divided by `world_size`.
- The elastic training example manually passed `torchrun` rendezvous arguments using `MASTER_ADDR` and `MASTER_PORT`. Updated the command to the `python -m torch.distributed.run` pattern used by the official Kubeflow elastic examples, letting the Training Operator apply the elastic policy.
- The monitoring section showed a `ServiceMonitor` for training pods with a non-standard `training.kubeflow.org/job-role` selector and no backing Service. Replaced it with the official Training Operator metrics endpoint workflow using `kubectl port-forward` and `/metrics`.
- The TTL example placed `ttlSecondsAfterFinished` directly under `spec`; the PyTorchJob CRD defines it under `spec.runPolicy`. Moved it under `runPolicy`.

## Review Notes
The article uses the legacy `kubeflow.org/v1` `PyTorchJob` API. That is still valid for Training Operator v1, but Kubeflow documentation now directs new users toward Kubeflow Trainer v2, which uses a different API and installation flow.
