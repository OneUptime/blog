# Validation Summary: How to Configure Azure Auth Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Azure Authenticator Extension (`azure_auth`)
- Azure Monitor OTLP ingestion
- Microsoft Entra ID authentication
- Azure managed identities
- Azure Workload Identity for Kubernetes
- Azure service principals
- Azure CLI

## Sources Consulted
- OpenTelemetry Collector Contrib Azure Authenticator Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/azureauthextension
- OpenTelemetry Collector Contrib Azure Authenticator Extension metadata and schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/azureauthextension
- OpenTelemetry Collector Contrib Azure Monitor Exporter README and authentication docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter
- Microsoft Learn, "Ingest OTLP data into Azure Monitor by using OTel Collector": https://learn.microsoft.com/en-us/azure/azure-monitor/containers/opentelemetry-protocol-ingestion
- Microsoft Learn, Azure CLI `az ad sp create-for-rbac` command reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest

## Issues Found
- The post used the deprecated/older component name `azureauth` and a top-level `resource` field. Updated examples to use the current `azure_auth` component name with `scopes`, matching the current extension schema.
- Managed identity examples used top-level `client_id`. Updated them to use `managed_identity.client_id` and `managed_identity: {}` for system-assigned identity.
- Service principal examples used top-level `tenant_id`, `client_id`, and `client_secret`. Updated them to use the required `service_principal` block.
- Certificate authentication included `client_certificate_password`, which is not part of the current extension schema. Removed that unsupported field.
- Workload Identity was described as automatic with no fields required. Updated the example to provide `workload_identity.client_id`, `tenant_id`, and `federated_token_file`.
- Azure Monitor examples used `resource: "https://monitor.azure.com"` and Application Insights instrumentation-key style exporter snippets. Updated Azure Monitor ingestion examples to use `otlphttp/azuremonitor` with Azure Monitor OTLP endpoint fields and `https://monitor.azure.com/.default` scope.
- Environment variable substitution used `${VAR}`. Updated Collector examples to use `${env:VAR}`.
- The multi-resource section referenced an unsupported `azureeventhubs` exporter example. Replaced it with multiple Azure Monitor OTLP exporters using separate `azure_auth` instances.
- The integration section referenced an unsupported `azureapplicationinsights` exporter. Replaced it with a single `otlphttp/azuremonitor` exporter configured for traces, metrics, and logs.
- Updated Azure Active Directory wording to Microsoft Entra ID where appropriate.

## Review Notes
The Azure Authenticator Extension is currently marked alpha in OpenTelemetry Collector Contrib. Microsoft's Azure Monitor OTLP ingestion documentation notes that recent `azure_auth` syntax requires Collector version 0.148.0 or later.
