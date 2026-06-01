# Validation Summary: How to Run Background Tasks with WebJobs in Azure App Service

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure App Service
- Azure WebJobs
- Azure WebJobs SDK
- Azure Storage Queues
- Azure CLI
- Kudu API
- C# / .NET

## Sources Consulted
- Microsoft Learn: App Service WebJobs overview - https://learn.microsoft.com/en-us/azure/app-service/overview-webjobs
- Microsoft Learn: Run background tasks with WebJobs - https://learn.microsoft.com/en-us/azure/app-service/webjobs-create
- Microsoft Learn: How WebJobs run in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/webjobs-execution
- Microsoft Learn: Get started with the Azure WebJobs SDK - https://learn.microsoft.com/en-us/azure/app-service/webjobs-sdk-get-started
- Microsoft Learn: Use the Azure WebJobs SDK for event-driven background processing - https://learn.microsoft.com/en-us/azure/app-service/webjobs-sdk-how-to
- Microsoft Learn: QueueTriggerAttribute API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.webjobs.queuetriggerattribute
- Microsoft Learn: Azure CLI `az webapp` reference - https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: Azure CLI `az webapp webjob triggered` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/webjob/triggered
- Microsoft Learn: Deploy files to App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-zip

## Issues Found
- The post described the queue listener as a triggered WebJob. The WebJobs SDK documentation says event-triggered SDK functions, such as queue-triggered functions, should be deployed as continuous WebJobs with Always On enabled. I changed the section title and explanation to distinguish SDK triggers from App Service triggered WebJob deployment type.
- The C# function snippet used `JsonSerializer` without importing `System.Text.Json`, referenced an `Order` model that was not defined, and the function class was not static. I added the missing using directive, included a minimal `Order` model, made the class `public static` to match Microsoft guidance, and added a null check after deserialization so the sample is safer and more complete.
- The Azure CLI command used `az webapp webjob triggered upload`, which is not present in the current Azure CLI reference. I replaced it with `az webapp deploy --type zip --target-path ...` to deploy the ZIP into the WebJob folder.
- The retry customization example used `[QueueTrigger(..., MaxDequeueCount = 3)]`, but `QueueTriggerAttribute` does not expose `MaxDequeueCount`. I changed the example to configure `options.MaxDequeueCount` in `AddAzureStorageQueues`, as documented for the WebJobs SDK queue extension.
- The scaling section stated continuous WebJobs run on all instances by default. Current Microsoft docs are not completely consistent on the default, so I revised the wording to say continuous WebJobs can run on all instances when configured for multi-instance scale and kept the `is_singleton` guidance.

## Review Notes
The post is now technically valid for current WebJobs SDK and App Service guidance. Future improvements could include adding a minimal `.csproj` with required NuGet packages and a note that WebJobs support varies by App Service OS/runtime, especially for Linux and custom containers.
