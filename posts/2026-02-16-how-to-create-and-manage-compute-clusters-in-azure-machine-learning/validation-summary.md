# Validation Summary: How to Create and Manage Compute Clusters in Azure Machine Learning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning compute clusters
- Azure Machine Learning Python SDK v2 (`azure-ai-ml`)
- Azure CLI `ml` extension
- Azure GPU and CPU virtual machine sizes
- Azure virtual network integration for Azure ML compute
- Azure Cost Management

## Sources Consulted
- Microsoft Learn: Create and manage Azure Machine Learning compute clusters - https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-attach-compute-cluster?view=azureml-api-2
- Microsoft Learn: `azure.ai.ml.entities.AmlCompute` class - https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.amlcompute?view=azure-python
- Microsoft Learn: `azure.ai.ml.entities.NetworkSettings` class - https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.networksettings?view=azure-python
- Microsoft Learn: `azure.ai.ml.operations.ComputeOperations` class - https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.operations.computeoperations?view=azure-python
- Microsoft Learn: `az ml compute` CLI reference - https://learn.microsoft.com/en-us/cli/azure/ml/compute?view=azure-cli-latest
- Microsoft Learn: Secure Azure ML training environments with virtual networks - https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-training-vnet?view=azureml-api-2
- Microsoft Learn: Azure NCv3-series VM sizes - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/ncv3-series
- Microsoft Learn: Azure NC A100 v4-series VM sizes - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nca100v4-series
- Microsoft Learn: Azure Dsv2-series VM sizes - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv2-series

## Issues Found
- The VNet Python SDK sample used `vnet_name` and `subnet_name` directly on `AmlCompute`. Updated it to use `NetworkSettings(vnet_name=..., subnet=...)`, which is the current SDK v2 API.
- The Python SDK examples passed `type="amlcompute"` to `AmlCompute`. Removed it because the current `AmlCompute` constructor represents the compute type through the class itself; the `type` value remains in the CLI examples where `--type AmlCompute` is documented.
- The network isolation sample described a VNet-attached cluster as unable to access the public internet by default. Updated the wording to specify the condition where public IPs are disabled or outbound rules are restrictive, and added `enable_node_public_ip=False` to the sample.
- The monitoring sample printed `cluster.size` as the current node count, but `size` is the VM SKU. Updated it to use `ml_client.compute.list_nodes(...)` and print the number of returned nodes.
- The compute listing sample used a loose `hasattr` check to identify clusters. Updated it to call `ml_client.compute.list(compute_type="amlcompute")`, which is the documented SDK filter.
- The low-priority VM section claimed a fixed "up to 80% discount." Reworded it to "reduced price" because Azure Spot/low-priority pricing varies by region, SKU, and current capacity.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI examples were validated against the official Microsoft Learn CLI reference rather than local `az --help` output. VM size examples matched current Microsoft Learn VM size references, but availability and quota can vary by Azure region and subscription.
