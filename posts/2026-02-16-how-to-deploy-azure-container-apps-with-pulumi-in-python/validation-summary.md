# Validation Summary: How to Deploy Azure Container Apps with Pulumi in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Pulumi
- Pulumi Azure Native provider
- Python
- Azure Container Registry
- Azure Log Analytics
- KEDA scaling
- Dapr

## Sources Consulted
- Pulumi Azure Native `app.ContainerApp` documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/app/containerapp/
- Pulumi Azure Native v2 `app.ContainerApp` documentation: https://www.pulumi.com/registry/packages/azure-native@2.x/api-docs/app/containerapp/
- Pulumi Azure Native `app.ManagedEnvironment` documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/app/managedenvironment/
- Pulumi Azure Native v2 `app.ManagedEnvironment` documentation: https://www.pulumi.com/registry/packages/azure-native@2.x/api-docs/app/managedenvironment/
- Pulumi Azure Native `containerregistry.Registry` documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/containerregistry/registry/
- Pulumi Azure Native `containerregistry.listRegistryCredentials` documentation: https://www.pulumi.com/registry/packages/azure-native/api-docs/containerregistry/listregistrycredentials/
- Pulumi Azure getting started documentation: https://www.pulumi.com/docs/iac/get-started/azure/create-project/
- Microsoft Learn Azure Container Apps scaling documentation: https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- Microsoft Learn Azure Container Apps workload profiles documentation: https://learn.microsoft.com/en-in/azure/container-apps/workload-profiles-overview
- Microsoft Learn Azure Container Apps environment documentation: https://learn.microsoft.com/en-us/azure/container-apps/environment

## Issues Found
- The post pinned `pulumi-azure-native>=2.0.0,<3.0.0` while using `app.WorkloadProfileArgs(name=...)`, which is a v3 SDK argument. Updated the dependency to `pulumi-azure-native>=3.0.0,<4.0.0` so the code matches the documented and locally verified v3 API.
- The `app.TrafficWeightArgs` examples used `percentage`, but Pulumi Azure Native uses `weight` for revision traffic weights. Replaced all `percentage` arguments with `weight`.
- The infrastructure introduction said the example deployed two applications, but the post defines API, worker, and web apps. Updated the count to three.

## Review Notes
- The example enables ACR admin credentials for simple registry authentication. This is technically valid, but production deployments should usually prefer managed identity-based pulls and avoid long-lived registry passwords.
- The sample assumes `api:latest`, `worker:latest`, and `web:latest` images already exist in the created ACR before the Container Apps deploy successfully.
