# Validation Summary: How to Configure Availability Tests in Azure App Insights to Monitor Endpoint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Application Insights availability tests
- Azure Monitor alerts and Log Analytics
- Azure Resource Manager templates
- Azure CLI service tags
- C# Azure Functions
- Microsoft Application Insights .NET SDK

## Sources Consulted
- Microsoft Learn: Application Insights availability tests, https://learn.microsoft.com/en-us/azure/azure-monitor/app/availability
- Microsoft Learn: Application Insights availability standard tests, https://learn.microsoft.com/en-us/azure/azure-monitor/app/availability-standard-tests
- Microsoft Learn: Microsoft.Insights/webtests ARM template reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/webtests
- Microsoft Learn: Azure CLI `az network list-service-tags`, https://learn.microsoft.com/en-us/cli/azure/network
- Microsoft Learn: AppAvailabilityResults table reference, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/appavailabilityresults
- Microsoft Learn: TelemetryClient class and TrackAvailability API, https://learn.microsoft.com/en-us/dotnet/api/microsoft.applicationinsights.telemetryclient
- Microsoft Azure: Azure Monitor pricing, https://azure.microsoft.com/en-us/pricing/details/monitor/

## Issues Found
- The post presented URL ping tests as a normal basic option. Microsoft has deprecated URL ping tests and will retire them on September 30, 2026. I updated the types section and introduction to recommend standard tests instead.
- The post said Application Insights offers "several" availability test types but omitted the retired multi-step web test type from the taxonomy. I added it with the August 31, 2024 retirement status.
- The retry description said retries run once before failure. Microsoft documents that a failure is reported only after three successive failed attempts. I corrected the retry explanation.
- The ARM template example omitted the resource-level `kind` property required by the `Microsoft.Insights/webtests` schema examples. I added `"kind": "standard"`.
- The KQL query used classic Application Insights table and column names (`availabilityResults`, `timestamp`, `success`, `location`, `name`). Current workspace-based Application Insights resources use `AppAvailabilityResults` with `TimeGenerated`, `Success`, `Location`, and `Name`. I updated the query and later table references.
- The custom TrackAvailability snippet created a default telemetry configuration without setting the Application Insights connection string. I updated it to read `APPLICATIONINSIGHTS_CONNECTION_STRING`, matching Microsoft guidance for Azure Functions examples.
- The Azure CLI command used `az network service-tag list`, which is not the current documented command. I changed it to `az network list-service-tags`.
- The cost section said Azure provides a free tier of up to 10 tests. Current Azure Monitor pricing lists ping web tests as free and standard web tests as charged per scheduled test execution. I corrected the pricing explanation.
- The multi-step web test section said those tests are deprecated. They were retired in Application Insights on August 31, 2024, so I updated the wording.

## Review Notes
The C# sample remains intentionally simplified and does not include all production hardening from Microsoft's full custom availability test sample, such as preserving operation context, reusing a static TelemetryClient, and recording exception messages on the availability telemetry. Those would be reasonable future improvements, but the corrected sample now uses the supported TrackAvailability API and an explicit connection string.
