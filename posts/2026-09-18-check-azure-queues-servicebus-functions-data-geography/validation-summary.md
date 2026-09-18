# Validation Summary: Check Data Geography in Azure Storage Queues, Service Bus, and Functions

## Status

validated

## Post Type

Technical audit guide with three read-only Azure CLI examples.

## Technologies Covered

- Azure Storage accounts, Queue Storage, and storage redundancy.
- Azure Service Bus Standard and Premium, Geo-Replication, and metadata Geo-Disaster Recovery.
- Azure Functions, App Service Environment, Azure Files, and Durable Functions.
- Azure Monitor, Application Insights, Log Analytics, and diagnostic destinations.
- Azure CLI, Bash, JSON, and JMESPath.

## Sources Consulted

- [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy).
- [Change storage account replication](https://learn.microsoft.com/en-us/azure/storage/common/redundancy-migration).
- [Storage Accounts: Get Properties](https://learn.microsoft.com/en-us/rest/api/storagerp/storage-accounts/get-properties).
- [Service Bus FAQ](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-faq).
- [Service Bus reliability](https://learn.microsoft.com/en-us/azure/reliability/reliability-service-bus).
- [Functions storage considerations](https://learn.microsoft.com/en-us/azure/azure-functions/storage-considerations).
- [Functions zone redundancy, including the Flex Consumption plan query](https://learn.microsoft.com/en-us/azure/azure-functions/functions-zone-redundancy?pivots=flex-consumption-plan).
- [Durable Functions data persistence](https://learn.microsoft.com/en-us/azure/azure-functions/durable-functions/durable-functions-serialization-and-persistence).
- [Azure Monitor diagnostic settings](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings).
- [Storage account CLI reference](https://learn.microsoft.com/en-us/cli/azure/storage/account#az-storage-account-show).
- [Service Bus namespace CLI reference](https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace#az-servicebus-namespace-show).
- [Function App CLI reference](https://learn.microsoft.com/en-us/cli/azure/functionapp#az-functionapp-show).
- [Query Azure CLI results](https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-query).
- [Microsoft Azure CLI: show_functionapp implementation](https://github.com/Azure/azure-cli/blob/dev/src/azure-cli/azure/cli/command_modules/appservice/custom.py).
- [Microsoft Azure CLI: plan property normalization and raw Function App responses](https://github.com/Azure/azure-cli/blob/dev/src/azure-cli/azure/cli/command_modules/appservice/utils.py).

## Issues Found

- The Functions command queried only the top-level `serverFarmId` for the hosting-plan resource ID. Azure CLI normalizes the plan property to `appServicePlanId` for applicable non-Flex responses, while Flex Consumption returns a raw resource response containing `properties.serverFarmId`. The original query could therefore return null. Changed the plan expression to `(appServicePlanId || properties.serverFarmId || serverFarmId)` to support these response shapes. Verified the distinction against Microsoft's CLI implementation and the Flex Consumption documentation example. No other technical corrections were needed.

## Review Notes

- Reviewed on 2026-09-18. This is a technically relevant implementation guide, so neither exclusion status applies.
- Confirmed that Queue Storage inherits account redundancy: LRS and ZRS keep replicas in the primary region, while geo-redundant options introduce a secondary region. Checking conversion completion and requesting evidence about historical copies correctly avoids an undocumented deletion guarantee.
- Confirmed the Service Bus Standard SQL backend and cross-region backups, including the Brazil South and Southeast Asia exceptions. Premium residency and the distinction between message replication and metadata-only recovery are accurately described.
- Confirmed the Functions documentation's in-region storage guidance and internally load-balanced ASE condition for other platform-managed customer data. Host storage, deployment content, keys, and Durable Functions state require separate review. Deployments using another Durable Functions backend must inspect that backend as well.
- Verified all three command names, resource selectors, JSON output flags, and query structure. Bash syntax checks passed for all three examples. No deprecated command is used.
- All seven Microsoft Learn links in the post resolve to the intended documentation. The author attribution link is outside the technical review.
- No live Azure resources were inspected or authenticated Azure CLI commands executed. This review validates the published guidance, not a particular deployment's residency. Actual resource names, subscription context, permissions, replicas, hosting configuration, and telemetry destinations require deployment-specific verification.
- Synthetic tests can reveal application destinations but cannot independently prove the location or deletion of provider-managed copies. The post appropriately calls for documentation and service-specific evidence where behavior remains unresolved.
