# Validation Summary: How to Create a Container Group in Azure Container Instances Using YAML

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Instances
- Azure CLI
- YAML
- Azure Container Registry
- Azure Files
- Container health probes

## Sources Consulted
- Microsoft Learn: YAML reference for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: Azure CLI `az container` reference - https://learn.microsoft.com/en-us/cli/azure/container
- Microsoft Learn: Introduction to container groups - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-container-groups
- Microsoft Learn: Tutorial - Deploy a multi-container group using YAML - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-multi-container-yaml
- Microsoft Learn: Mount secret volume to container group - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-volume-secret
- Microsoft Learn: Configure liveness probes - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-liveness-probe
- Microsoft Learn: Configure readiness probes - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-readiness-probe
- Microsoft Learn: Execute a command in a running container instance - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-exec

## Issues Found
- The examples used `apiVersion: '2021-09-01'` while the current Microsoft YAML reference applies to `2021-10-01`. Updated the examples and field explanation to use `2021-10-01`.
- The resource examples used `memoryInGb`. The current YAML reference documents the property as `memoryInGB`. Updated all YAML snippets accordingly.
- The production tip said a container without limits can consume all available resources. In ACI, container group allocation is based on requests, and limits allow usage above the request up to the configured limit. Updated the tip to describe requests and limits accurately.

## Review Notes
- Azure CLI is not installed in the local review environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
- The private registry example is technically valid, but production deployments should generally use managed identity for Azure Container Registry instead of embedding registry credentials in YAML.
