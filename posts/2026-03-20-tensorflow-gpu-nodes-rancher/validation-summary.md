# Validation Summary: How to Deploy TensorFlow on GPU Nodes in Rancher

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Rancher-managed Kubernetes
- NVIDIA GPU Operator
- NVIDIA Container Toolkit and CUDA GPU visibility
- TensorFlow GPU containers
- Kubeflow Training Operator TFJob
- TensorFlow Serving
- Kubernetes Jobs, Deployments, Services, PersistentVolumeClaims, node selectors, tolerations, and kubectl commands

## Sources Consulted
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes PersistentVolume and PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- NVIDIA GPU Operator installation documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- NVIDIA GPU Operator MIG labeling examples: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/22.9.1/gpu-operator-mig.html
- NVIDIA CUDA environment variables documentation: https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#env-vars
- NVIDIA Container Toolkit user guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.8.0/user-guide.html
- NVIDIA DCGM Exporter documentation: https://docs.nvidia.com/datacenter/dcgm/latest/gpu-telemetry/dcgm-exporter.html
- TensorFlow Docker installation documentation: https://www.tensorflow.org/install/docker
- TensorFlow GPU guide: https://www.tensorflow.org/guide/gpu
- TensorFlow Serving Docker documentation: https://www.tensorflow.org/tfx/serving/docker
- TensorFlow Serving configuration documentation: https://www.tensorflow.org/tfx/serving/serving_config
- Kubeflow TFJob documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/tensorflow/
- Docker Hub TensorFlow image tag listing: https://hub.docker.com/r/tensorflow/tensorflow/tags?name=2.14.0-gpu
- Docker Hub TensorFlow Serving image tag listing: https://hub.docker.com/r/tensorflow/serving/tags?name=2.14.0-gpu

## Issues Found
- The manifests used the `ml-training` namespace but did not create it. Added a `Namespace` object to the storage manifest so the namespaced resources can be applied on a clean cluster.
- The TFJob example depends on the Kubeflow Training Operator CRD and controller. Added a prerequisite for Kubeflow Training Operator v1.
- The training examples reference `/app/train.py` and `/app/distributed_train.py`, but the official TensorFlow image does not include those application files. Added a prerequisite for a `training-scripts` ConfigMap and mounted it in the TFJob Chief and Worker pod templates.
- `CUDA_VISIBLE_DEVICES: "all"` is not valid CUDA syntax; CUDA expects GPU indices or UUIDs. Removed it and left GPU exposure to the Kubernetes NVIDIA device plugin via the `nvidia.com/gpu` limit.
- The TensorFlow Serving Deployment was in `ml-inference` while mounting a PVC created in `ml-training`. PVCs are namespaced, so changed the serving Deployment and Service to `ml-training`.
- The storage class comment implied generic Longhorn or Ceph classes could satisfy `ReadWriteMany`. Clarified that the class must be RWX-capable, such as Longhorn RWX or CephFS.
- The distributed worker GPU comment said 6 GPUs total even though the Chief also requested 2 GPUs. Changed it to "6 worker GPUs."
- The log command used command substitution that can break if the Job has more than one matching pod. Replaced it with `kubectl logs -l job-name=tensorflow-training --follow`.

## Review Notes
The YAML snippets parse successfully locally. I did not apply them to a live Kubernetes cluster from this workspace. GPU requests and limits are valid because the GPU request equals the GPU limit, although Kubernetes documents GPUs as normally being specified in `limits`. The TFJob API used here is Kubeflow Training Operator v1, which Kubeflow now documents as legacy; a future update could show the current Kubeflow Trainer v2 workflow. Docker Hub confirmed the referenced `tensorflow/tensorflow:2.14.0-gpu` and `tensorflow/serving:2.14.0-gpu` tags are active as of 2026-04-21.
