# Validation Summary: How to Schedule GPU Workloads in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes scheduling
- NVIDIA GPUs
- NVIDIA GPU Operator / GPU Feature Discovery
- ResourceQuota
- PriorityClass
- Kubeflow MPI Operator
- `kubectl`

## Sources Consulted
- Kubernetes: Schedule GPUs - https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- NVIDIA GPU Operator: GPU Operator with MIG - https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/24.9.2/gpu-operator-mig.html
- NVIDIA GPU Operator: Troubleshooting the NVIDIA GPU Operator - https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.3.2/troubleshooting.html
- Kubeflow MPI Operator README and examples - https://github.com/kubeflow/mpi-operator

## Issues Found
- The `nodeSelector` example mixed a documented NVIDIA GPU label with a non-standard `accelerator` label that was not defined anywhere in the post. I replaced it with the NVIDIA GPU Operator / GPU Feature Discovery label `nvidia.com/gpu.product` so the example uses documented GPU node labels.
- The `ResourceQuota` example incorrectly set both `requests.nvidia.com/gpu` and `limits.nvidia.com/gpu`. Kubernetes only allows quota entries with the `requests.` prefix for extended resources such as GPUs, so I removed the invalid `limits.nvidia.com/gpu` entry.
- The `Job` example omitted `restartPolicy`. For Kubernetes Jobs, the pod template must use `Never` or `OnFailure`, so I added `restartPolicy: Never`.
- The MPI example used `apiVersion: kubeflow.org/v1`, which does not match the current MPI Operator examples. I updated it to `kubeflow.org/v2beta1`.
- The MPI launcher command was too minimal for a common containerized Open MPI setup. I added `--allow-run-as-root`, matching current MPI Operator examples that run MPI launchers in containers.
- The first monitoring command was not valid: it piped formatted `kubectl get pods -o wide` table rows into `kubectl describe pod`, which would not resolve namespace and pod names correctly. I replaced it with a valid JSONPath-based `kubectl get` command that lists namespace, pod, node, and requested GPU count.
- The `nvidia-smi` example targeted a `dcgm-exporter` pod, which is not the documented place to run `nvidia-smi` for GPU Operator troubleshooting. I replaced it with the NVIDIA-documented pattern of executing `nvidia-smi` from the `nvidia-driver-daemonset`.

## Review Notes
- The post is technically a Kubernetes scheduling guide that applies in Rancher because Rancher relies on Kubernetes scheduling primitives.
- Labels such as `nvidia.com/gpu.present` and `nvidia.com/gpu.product` depend on NVIDIA GPU Operator / GPU Feature Discovery or equivalent node labeling being present in the cluster.
- The example uses floating image tags such as `horovod/horovod:latest`. That is workable for an example, but it can drift over time and may need future revalidation.
