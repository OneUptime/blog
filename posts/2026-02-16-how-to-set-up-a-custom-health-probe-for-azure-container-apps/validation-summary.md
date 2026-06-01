# Validation Summary: How to Set Up a Custom Health Probe for Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Azure CLI
- Bicep
- YAML
- Node.js
- Express
- HTTP and TCP health probes

## Sources Consulted
- Microsoft Learn: Health probes in Azure Container Apps: https://learn.microsoft.com/azure/container-apps/health-probes
- Microsoft Learn: Azure CLI `az containerapp update`: https://learn.microsoft.com/cli/azure/containerapp
- Microsoft Learn: Microsoft.App/containerApps Bicep reference: https://learn.microsoft.com/azure/templates/microsoft.app/2024-08-02-preview/containerapps
- Microsoft Learn: Container Apps REST API probe schema: https://learn.microsoft.com/rest/api/resource-manager/containerapps/container-apps/get
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The YAML probe `type` values used lowercase strings. Azure Container Apps documentation and schema use `Liveness`, `Readiness`, and `Startup`, so the examples were updated to use the documented enum values.
- The examples used `initialDelaySeconds: 0` for liveness and readiness probes. The current Container Apps REST/Bicep schema documents a minimum value of 1 when the field is set, so those values were changed to `1`.
- The startup probe examples used `failureThreshold: 30`, but the current Container Apps REST/Bicep schema documents a maximum value of 10 for custom probe definitions. The examples now use `periodSeconds: 15` and `failureThreshold: 10` to preserve the slow-start behavior while staying within documented limits.
- The Bicep example used the older `Microsoft.App/containerApps@2023-05-01` API version and `managedEnvironmentId`. The example now uses `Microsoft.App/containerApps@2025-07-01` and `environmentId`, matching the current Bicep reference where `managedEnvironmentId` is documented as deprecated.
- The parameter table listed `initialDelaySeconds` default as `0` and omitted the documented maximum for `failureThreshold`. The table was corrected to reflect the current Container Apps schema.
- The TCP probe section implied gRPC probes were supported directly. Azure Container Apps documentation says gRPC probes are not supported, so the text now clarifies that gRPC services should use TCP socket probes instead.
- The Node.js sample referenced `connectToDatabase()` and `warmUpCache()` without defining them. Placeholder implementations were added so the sample is syntactically and operationally self-contained.

## Review Notes
Azure Container Apps health probe behavior is broadly Kubernetes-aligned, but Azure's documented Container Apps probe schema has service-specific restrictions, including unsupported `exec` and gRPC probes and integer-only port values. The post now stays within those documented constraints.
