# Validation Summary: Set Up AKS Cluster Extensions for Azure Machine Learning Workload Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Machine Learning
- Azure Machine Learning Kubernetes compute
- Azure Kubernetes cluster extensions
- Azure CLI `k8s-extension` and `ml` extensions
- Kubernetes custom resources and node selectors
- Azure Machine Learning online endpoints and command jobs
- NVIDIA GPUs on AKS

## Sources Consulted
- Microsoft Learn: Deploy Azure Machine Learning extension on AKS or Azure Arc-enabled Kubernetes cluster: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-kubernetes-extension?view=azureml-api-2
- Microsoft Learn: Attach a Kubernetes cluster to Azure Machine Learning workspace: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-attach-kubernetes-to-workspace?view=azureml-api-2
- Microsoft Learn: Introduction to Kubernetes compute target in Azure Machine Learning: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-attach-kubernetes-anywhere?view=azureml-api-2
- Microsoft Learn: Create and manage Kubernetes instance types: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-kubernetes-instance-types?view=azureml-api-2
- Microsoft Learn: Azure CLI `az k8s-extension` reference: https://learn.microsoft.com/en-us/cli/azure/k8s-extension?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az ml compute` reference: https://learn.microsoft.com/en-us/cli/azure/ml/compute?view=azure-cli-latest
- Microsoft Learn: Azure Machine Learning online endpoint YAML reference: https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-endpoint-online?view=azureml-api-2
- Microsoft Learn: Azure Machine Learning managed online deployment YAML reference: https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-deployment-managed-online?view=azureml-api-2
- Microsoft Learn: Use GPUs on Azure Kubernetes Service: https://learn.microsoft.com/en-us/azure/aks/use-nvidia-gpu
- Microsoft Learn: Use labels in an Azure Kubernetes Service cluster: https://learn.microsoft.com/en-us/azure/aks/use-labels
- Azure ML schemas: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json and https://azuremlschemas.azureedge.net/latest/kubernetesOnlineDeployment.schema.json
- Microsoft Artifact Registry tag APIs for Azure ML container images: https://mcr.microsoft.com/v2/azureml/curated/acpt-pytorch-2.0-cuda11.7/tags/list and https://mcr.microsoft.com/v2/azureml/minimal-ubuntu22.04-py39-cpu-inference/tags/list

## Issues Found
- The prerequisites specified Kubernetes 1.25 or later, which is stale for AKS in 2026. Changed this to require a supported AKS Kubernetes version.
- The CLI prerequisites did not include the documented Azure CLI and `k8s-extension` minimum versions. Updated the prerequisite to Azure CLI 2.51.0 or later and `k8s-extension` 1.2.3 or later.
- The extension install commands used `--configuration-settings` and included redundant or incorrect settings. Updated the examples to use the documented `--config` form and removed the unnecessary `enableInference=False` from the training-only example.
- The inference router service type used `LoadBalancer`, but the Azure ML extension configuration expects `loadBalancer`, `nodePort`, or `clusterIP`. Updated the examples to use `loadBalancer`.
- The HTTP inference proof-of-concept example omitted `inferenceRouterHA=False`, which Microsoft includes for small AKS proof-of-concept clusters. Added it to match the documented quick-start scenario.
- The production TLS example passed certificate and key file paths through normal config and omitted `sslCname`. Moved the certificate and key settings to `--config-protected` and added `sslCname`.
- The compute attach example did not ensure the workload namespace exists and omitted the recommended managed identity setting. Added an idempotent namespace creation command and `--identity-type SystemAssigned`.
- The GPU instance type used the older `agentpool` node selector label. Updated it to the documented AKS label `kubernetes.azure.com/agentpool`.
- The training job image referenced a non-existent MCR repository. Replaced it with the published Azure ML curated ACPT PyTorch image `mcr.microsoft.com/azureml/curated/acpt-pytorch-2.0-cuda11.7:latest`.
- The inference deployment image used the wrong MCR path with `/curated/`. Replaced it with the documented Azure ML inference image path `mcr.microsoft.com/azureml/minimal-ubuntu22.04-py39-cpu-inference:latest`.
- The troubleshooting section understated Azure ML extension production resource guidance. Updated it to the documented minimum of 4 vCPU cores and 14 GB of memory.
- The GPU troubleshooting section said AKS automatically installs the NVIDIA device plugin on GPU node pools. Current AKS documentation says drivers are installed by default, but the device plugin must still be installed unless using a managed option such as AKS-managed GPU node pools or the NVIDIA GPU Operator. Updated the explanation and verification command.

## Review Notes
The Azure Machine Learning Kubernetes online endpoint schema is available, but the public deployment reference page focuses primarily on managed online endpoints. I validated the Kubernetes deployment fields directly against the published Azure ML schema. The post remains an illustrative tutorial and still assumes the reader has a registered Azure ML model, a working scoring script, and appropriate Azure permissions.
