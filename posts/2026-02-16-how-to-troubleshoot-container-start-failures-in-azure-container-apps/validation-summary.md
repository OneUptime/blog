# Validation Summary: How to Troubleshoot Container Start Failures in Azure Container Apps

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Container Apps
- Azure CLI
- Azure Container Registry
- Managed identities
- Log Analytics and Kusto Query Language
- Docker and Docker Buildx
- Container health probes

## Sources Consulted
- Azure Container Apps log streaming documentation: https://learn.microsoft.com/en-us/azure/container-apps/log-streaming
- Azure CLI `az containerapp logs` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/logs
- Azure CLI `az containerapp registry` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/registry
- Azure CLI `az containerapp identity` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/identity
- Azure CLI `az containerapp secret` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/secret
- Azure CLI `az containerapp ingress` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp/ingress
- Azure CLI `az containerapp update` reference: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps managed identity documentation: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- Azure Container Apps health probes documentation: https://learn.microsoft.com/en-us/azure/container-apps/health-probes
- Azure Container Apps containers documentation: https://learn.microsoft.com/en-us/azure/container-apps/containers
- Azure Container Apps Log Analytics monitoring documentation: https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/

## Issues Found
- The sensitive environment variable example used `az containerapp update --secrets`, but current Azure CLI manages Container Apps secrets with `az containerapp secret set`. Updated the example to create the secret first, then reference it with `--set-env-vars`.
- The managed identity ACR example configured `--identity system` without first assigning a system identity and granting `AcrPull` on the registry. Added the required identity assignment and role assignment commands.
- The CPU and memory table stopped at 2.0 vCPU / 4.0Gi. Current Container Apps consumption combinations go up to 4.0 vCPU / 8.0Gi, with a 2.0 vCPU / 4.0Gi maximum for Consumption-only environments. Updated the table and added the caveat.
- The health probe YAML used lowercase `liveness` and `readiness`; the documented Container Apps probe type values are `Liveness`, `Readiness`, and `Startup`. Updated the snippet to use the documented casing.
- The probe command comment said it disabled custom probes, but the YAML shown configures custom probes. Updated the comment to match the command.
- The Docker Buildx example built an AMD64 image and then ran `docker push`, but Buildx output is not always loaded into the local image store. Updated the command to use `--push` directly.

## Review Notes
The Log Analytics examples use the classic `*_CL` custom log table names, which remain valid for Log Analytics-backed Container Apps logs. Azure Monitor table names can omit the `_CL` suffix and string column suffixes depending on the log destination, so future revisions could mention that distinction.
