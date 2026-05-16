# Validation Summary: How to Set Up Kubeflow on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubeflow
- Kubernetes
- Kustomize
- Istio
- Dex
- Kubeflow Notebooks
- Kubeflow Pipelines SDK
- Katib
- NVIDIA GPUs on Kubernetes

## Sources Consulted
- Kubeflow installation documentation: https://www.kubeflow.org/docs/started/installing-kubeflow/
- Kubeflow manifests repository README: https://github.com/kubeflow/manifests
- Kubeflow Central Dashboard access documentation: https://www.kubeflow.org/docs/components/central-dash/access/
- Kubeflow Notebooks API reference: https://www.kubeflow.org/docs/components/notebooks/api-reference/notebook-v1/
- Kubeflow Notebooks container images documentation: https://www.kubeflow.org/docs/components/notebooks/container-images/
- Kubeflow Pipelines compile documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/compile-a-pipeline/
- Kubeflow Pipelines run documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/run-a-pipeline/
- Kubeflow Pipelines artifact documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/data-handling/artifacts/
- Kubeflow Katib experiment documentation: https://www.kubeflow.org/docs/components/katib/experiment/
- Kubeflow Katib trial template documentation: https://www.kubeflow.org/docs/components/katib/user-guides/trial-template/
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config
- Talos Linux NVIDIA GPU documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/hardware-and-drivers/nvidia-gpu

## Issues Found
- The post used the older Kubeflow `v1.8-branch`. Updated it to `v1.11-branch`, which is the current stable branch referenced by the official Kubeflow installation documentation.
- The single-command install omitted the current manifests README's `kubectl apply --server-side --force-conflicts` flags and used a shorter retry sleep. Updated the command to match the current official install command.
- The GPU prerequisite only mentioned the NVIDIA device plugin. Updated it to include Talos NVIDIA system extensions and runtime class setup, which Talos requires for NVIDIA GPU workloads.
- The Dex configuration used an older callback path and direct password hash field. Updated the example to use `/oauth2/callback` and `hashFromEnv: DEX_USER_PASSWORD`, matching the current Kubeflow manifests pattern.
- The notebook image referenced the older Docker Hub `kubeflownotebookswg` image and `v1.8.0` tag. Updated it to the current GHCR notebook image path used by the manifests.
- The Kubeflow Pipelines example passed `/tmp` file paths as strings between components, which would not transfer files between pods. Updated it to use KFP `Dataset` and `Model` artifacts with `Input` and `Output`.
- The KFP compiler call used a positional package path. Updated it to `package_path="mnist_pipeline.yaml"` for clarity and alignment with the current SDK documentation.
- The Katib example referenced `/scripts/train.py` inside a base PyTorch image where that script would not exist, and it did not guarantee that the objective metric would be emitted. Replaced it with an inline Python command that prints `accuracy=<value>` and added the Istio sidecar injection opt-out annotation recommended for Kubeflow Platform trials that need simple network/runtime behavior.
- The Talos-specific note claimed Istio requires additional kernel modules. Reworded it to the accurate broader statement that kernel modules should be configured through Talos when required by the CNI, service mesh dataplane, or GPU runtime.

## Review Notes
The post is now technically valid as an introductory Kubeflow-on-Talos guide. For a future production-focused revision, the storage section could be expanded with concrete RWX storage guidance and the authentication section could show a full Kustomize overlay instead of a standalone ConfigMap example.
