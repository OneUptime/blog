# Validation Summary: How to Set Up Traffic Splitting Between Revisions in Azure Container Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Azure CLI
- Azure Container Apps revisions
- Azure Container Apps traffic splitting
- Azure Monitor and Log Analytics
- Kusto Query Language

## Sources Consulted
- Microsoft Learn: Traffic splitting in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/traffic-splitting
- Microsoft Learn: Update and deploy changes in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/revisions
- Microsoft Learn: Manage revisions in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/revisions-manage
- Microsoft Learn Azure CLI reference: az containerapp ingress traffic - https://learn.microsoft.com/en-us/cli/azure/containerapp/ingress/traffic
- Microsoft Learn Azure CLI reference: az containerapp revision - https://learn.microsoft.com/en-us/cli/azure/containerapp/revision
- Microsoft Learn Azure CLI reference: az containerapp - https://learn.microsoft.com/en-us/cli/azure/containerapp
- Microsoft Learn: Communicate between container apps in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/connect-apps
- Microsoft Learn: Session Affinity in Azure Container Apps - https://learn.microsoft.com/en-us/azure/container-apps/sticky-sessions
- Microsoft Learn: Monitor Azure Container Apps metrics - https://learn.microsoft.com/en-us/azure/container-apps/metrics
- Microsoft Learn Azure Monitor reference: ContainerAppConsoleLogs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerappconsolelogs

## Issues Found
- The create command used `--revision-mode multiple`, but the current Azure CLI option for `az containerapp create` is `--revisions-mode`. Updated the command so it uses the documented flag.
- The examples used revision names such as `my-api--v2`. Azure Container Apps revision suffixes are appended with a single hyphen, so `--revision-suffix v2` produces a name like `my-api-v2`. Updated all revision-name examples.
- The post described `latest` as a label. In Azure CLI traffic splitting, `latest=weight` is a special revision-weight target. Updated the wording to avoid confusing it with revision labels.
- The post said each revision gets its own unique URL for direct testing. Current Microsoft documentation describes direct stable access through revision labels and label FQDNs. Updated the section to add a label with `az containerapp revision label add` and changed the sample URL to the documented triple-dash label FQDN format.
- The production tips said an active old revision costs nothing if it receives no traffic and scales to zero. That depends on the revision's scale settings. Updated the wording to say it can scale to zero if its scale settings allow it.

## Review Notes
The Log Analytics query uses the legacy/custom table and column names (`ContainerAppConsoleLogs_CL`, `ContainerAppName_s`, `RevisionName_s`, `Log_s`), which are still documented for Log Analytics workspaces. Azure Monitor resource-specific tables may use unsuffixed names such as `ContainerAppConsoleLogs`, `ContainerAppName`, `RevisionName`, and `Log`.
