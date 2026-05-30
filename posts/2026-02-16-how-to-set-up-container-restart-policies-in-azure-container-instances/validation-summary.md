# Validation Summary: How to Set Up Container Restart Policies in Azure Container Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Instances
- Azure CLI
- Azure Container Instances YAML configuration
- Container restart policies
- Container exit codes and logs

## Sources Consulted
- Microsoft Learn: Run containerized tasks with restart policies - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-restart-policy
- Microsoft Learn: YAML reference for Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: Azure CLI `az container` reference - https://learn.microsoft.com/en-us/cli/azure/container
- Microsoft Learn: Manually stop or start containers in Azure Container Instances - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-stop-start
- Microsoft Learn: Azure Container Instances FAQ - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-faq
- Microsoft Learn: Azure Container Instances liveness probes - https://learn.microsoft.com/en-us/azure/container-instances/container-instances-liveness-probe
- Microsoft Learn: Container Groups - Get REST API reference - https://learn.microsoft.com/en-us/rest/api/container-instances/container-groups/get

## Issues Found
- The YAML snippets used `memoryInGb`, but the official ACI YAML schema uses `memoryInGB`. Updated all YAML examples to use the correct property name.
- The billing section described billing as tied to individual running containers and labeled a state query as showing "billing status." Azure documents billing at the container group level: meters stop once the entire container group is stopped. Updated the wording and query comment accordingly.
- The logs command said it included previous instance logs if available. The Azure CLI documentation describes `az container logs` as examining logs for a container in a container group, without that guarantee. Removed the unsupported parenthetical.
- The backoff section stated that the first restart is immediate and that the maximum backoff is around 5 minutes. Microsoft documentation confirms exponential backoff but does not document those exact timings. Removed the unsupported timing claims.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI validation was performed against the official Microsoft Learn Azure CLI reference instead of local `az --help` output. The post is otherwise consistent with current Microsoft documentation for ACI restart policy values, CLI flags, YAML structure, instance view fields, and stopped container group billing behavior.
