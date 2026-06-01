# Validation Summary: How to Use AKS Cluster Cost Analysis with Azure Cost Management and Kubecost

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Cost Management
- Azure CLI
- Azure REST API
- Kubecost
- OpenCost
- Kubernetes
- Helm
- jq

## Sources Consulted
- Microsoft Learn: Azure Kubernetes Service cost analysis: https://learn.microsoft.com/en-us/azure/aks/cost-analysis
- Microsoft Learn: Use Azure tags in AKS: https://learn.microsoft.com/en-us/azure/aks/use-tags
- Microsoft Learn: Add an Azure Spot node pool to an AKS cluster: https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: Azure Consumption budget CLI reference: https://learn.microsoft.com/en-us/cli/azure/consumption/budget
- Microsoft Learn: Azure Cost Management Query REST API: https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage
- IBM Kubecost docs: Allocation API: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-allocation-api
- IBM Kubecost docs: Multi-cloud integrations: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=integrations-multi-cloud
- Kubecost Helm chart docs: https://kubecost.github.io/kubecost/

## Issues Found
- Replaced the unsupported `az costmanagement query` example with a documented `az rest` call to the Azure Cost Management Query API.
- Replaced invalid budget notification flags on `az consumption budget create` with the documented `az consumption budget create-with-rg` shape using `--notifications` and `--time-period`.
- Corrected the AKS cost analysis add-on description from Kubecost-based to OpenCost-based, matching Microsoft documentation.
- Updated the full Kubecost Helm install example to the current Kubecost chart repository and chart name, and updated the port-forward target to `svc/kubecost-frontend`.
- Replaced the outdated Kubecost Azure integration secret fields with the current cloud integration format based on Azure cost exports, and added the required Helm value that points Kubecost at the secret.
- Changed Kubecost Allocation API examples from `aggregate=deployment` to `aggregate=controller`, which is the documented aggregation value.
- Fixed the idle namespace jq example so `group_by` is preceded by `sort_by`, and changed the misleading `totalCPURequests` field to a count of containers with CPU requests.
- Fixed the weekly idle cost jq expression, which referenced `.data[0]` after changing context and would not calculate correctly.
- Updated final wording from deployments to controllers to match the corrected Kubecost API terminology.

## Review Notes
- The AKS cost analysis add-on has prerequisites and limitations, including Standard or Premium tier, managed identity, supported offer types, and Azure CLI 2.61.0 or later. The post's command is correct, but readers should check those prerequisites before enabling it.
- Spot node pool commands were consistent with Microsoft guidance. The savings percentage is workload- and region-dependent, so it should be treated as an estimate rather than a guarantee.
