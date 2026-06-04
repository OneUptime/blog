# Validation Summary: How to Set Up Distributed TensorFlow Training Across Multiple GPU Nodes

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- NVIDIA GPU Operator
- Kubeflow Training Operator
- Kubeflow TFJob
- Kubeflow MPIJob
- TensorFlow and Keras
- TensorFlow MultiWorkerMirroredStrategy
- Horovod
- NVIDIA NCCL
- TensorBoard

## Sources Consulted
- TensorFlow multi-worker training with Keras: https://www.tensorflow.org/tutorials/distribute/multi_worker_with_keras
- TensorFlow distributed training guide: https://www.tensorflow.org/guide/distributed_training
- TensorFlow Keras saving and serialization guide: https://www.tensorflow.org/guide/keras/serialization_and_saving
- Kubeflow Training Operator installation documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/installation/
- Kubeflow TFJob user guide: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/tensorflow/
- Kubeflow MPIJob user guide: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/mpi/
- NVIDIA GPU Operator installation documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html
- Horovod running documentation: https://horovod.readthedocs.io/en/stable/running_include.html
- Horovod with Keras documentation: https://horovod.readthedocs.io/en/stable/keras.html

## Issues Found
- The GPU node verification used `nvidia.com/gpu.present=true`, which is not the NVIDIA GPU Operator's documented GPU worker node label. Changed it to `feature.node.kubernetes.io/pci-10de.present=true`.
- The NVIDIA GPU Operator install command omitted adding and updating the NVIDIA Helm repository. Added the documented `helm repo add` and `helm repo update` steps and adjusted the install command to use the documented namespace flags.
- The Kubeflow Training Operator install command used an outdated `v1.7.0` ref and omitted the documented `--server-side` apply flag and `.git` repository URL. Updated it to the documented standalone install command for `v1.8.1`.
- The TensorFlow training script treated both a dedicated `chief` task and worker index 0 as chief, which would cause worker 0 to write chief-only artifacts in a Chief/Worker TF_CONFIG layout. Added an `is_chief` helper that handles both documented TF_CONFIG layouts.
- The TensorFlow training script used chief-only model saving with MultiWorkerMirroredStrategy. TensorFlow requires every worker to participate in full-model saves, with non-chief workers writing to unique temporary paths. Added worker-specific save paths and cleanup, and changed the final model path to the recommended `.keras` format.
- The TensorFlow training script passed manually distributed datasets to Keras `model.fit`. The official Keras multi-worker guide passes normal `tf.data.Dataset` objects and lets the strategy integration handle distribution. Removed the manual `experimental_distribute_dataset` calls.
- The checkpointing example used `ModelCheckpoint` as the multi-worker fault-tolerance mechanism. TensorFlow documents `BackupAndRestore` for this purpose. Replaced it with `BackupAndRestore` and kept TensorBoard output chief-only.
- The Horovod example imported `horovod.tensorflow` while using `tf.keras`. Horovod documents `horovod.tensorflow.keras` for TensorFlow Keras integration. Updated the import and added GPU memory growth setup.
- The Horovod Keras compile step omitted the documented `experimental_run_tf_function=False` setting for TensorFlow 2 Keras with Horovod's distributed optimizer. Added it for the TensorFlow 2.14-era example.
- The Horovod Kubernetes manifest used `TFJob` with `horovodrun` in each worker pod and `-H localhost:2`, which would not launch a single multi-node Horovod job. Replaced it with a Kubeflow `MPIJob` manifest using one launcher, four workers, and `slotsPerWorker: 2`.
- The Horovod manifest referenced `/app/horovod_train.py` while using a public base image that would not contain the script. Changed the image to a user-built image and added a note that it must include the training script.

## Review Notes
- The TensorFlow and Horovod versions shown are version-specific and older than current releases, but the examples are now internally consistent for the pinned TensorFlow 2.14/Horovod-style workflow.
- The Kubeflow Training Operator v1 documentation is marked legacy by Kubeflow; future updates should consider Kubeflow Trainer V2 if the article is refreshed more broadly.
- The snippets were locally checked for Python syntax and YAML parseability; runtime execution was not performed because it requires a Kubernetes GPU cluster, Kubeflow CRDs, shared RWX storage, and GPU-enabled container images.
