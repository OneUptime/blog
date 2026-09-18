# How to Check Whether Azure Storage Queues, Service Bus, and Functions Keep Data in Your Selected Geography

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Data Residency, Azure Storage, Azure Service Bus, Azure Function

Description: Audit Azure messaging and Functions locations, redundancy, platform backups, replication, and dependent storage before claiming regional data residency.

---

An Azure resource's `location` is the beginning of a residency review. Storage redundancy, messaging tier, disaster recovery, Functions hosting, and diagnostic destinations can add locations that are not obvious from the resource's overview page.

First clarify whether the requirement is a single region, a country, or a broader geography. Those boundaries are different, and each service's documented behavior must be checked against the actual requirement.

## Inventory the Messaging Workflow

Follow a synthetic message from producer to queue, function invocation, output destination, retry or dead-letter path, and logs. Include all storage used by the Functions host and any Durable Functions state.

Record resource IDs, selected subscriptions, regions, SKUs, replica destinations, and the documentation date. Avoid collecting connection strings in the evidence bundle. Reading application settings can expose secrets; prefer resource references and appropriately redacted configuration.

## Check Azure Storage Queue Redundancy

Queues use the redundancy configuration of their storage account. LRS and ZRS maintain copies within the primary region; geo-redundant options also replicate to a secondary region. Check the exact option and supported account configuration in [Azure Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy).

A read-only inspection can show the relevant account metadata:

```bash
az storage account show \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_STORAGE_ACCOUNT \
  --query '{id:id,primary:primaryLocation,secondary:secondaryLocation,sku:sku.name}' \
  --output json
```

Confirm the active subscription before running it. The [storage account CLI reference](https://learn.microsoft.com/en-us/cli/azure/storage/account#az-storage-account-show) documents the command. Verify whether a secondary region is within the approved geography instead of assuming that any paired region is acceptable.

Changing redundancy also requires a lifecycle review. Record the completed conversion state and obtain service-specific evidence about retained historical copies where that matters; a requested configuration change alone is not a deletion certificate.

## Distinguish Service Bus Tiers and Recovery Features

The current [Service Bus FAQ](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-faq) states that Standard uses Azure SQL Database for backend storage and that its database backups are normally in another region. It lists Brazil South and Southeast Asia as exceptions with same-region backups. Therefore, the namespace location alone cannot substantiate a single-region claim for Standard.

The same FAQ says Premium stores metadata and data in selected regions. Inspect its optional recovery configuration as well. Microsoft distinguishes two features in [Service Bus reliability guidance](https://learn.microsoft.com/en-us/azure/reliability/reliability-service-bus): Geo-Replication copies messages and metadata, while metadata Geo-Disaster Recovery copies configuration and metadata without replicating message data.

Both can introduce another regional footprint, and metadata can itself be sensitive. Do not describe all Service Bus disaster recovery as either message replication or metadata-only replication without identifying the feature.

Start with this namespace inspection, then examine the specific replication or disaster-recovery resource configuration:

```bash
az servicebus namespace show \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_NAMESPACE \
  --query '{id:id,location:location,tier:sku.tier}' \
  --output json
```

The [namespace CLI reference](https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace#az-servicebus-namespace-show) documents this metadata query. It is not a complete replica inventory by itself.

## Inspect Functions Hosting and Every Storage Dependency

A function app can use storage for host state, code, keys, trigger checkpoints, and application data. Some configurations also use Azure Files or separate deployment storage. Durable Functions adds persisted orchestration state.

Microsoft's [Functions storage considerations](https://learn.microsoft.com/en-us/azure/azure-functions/storage-considerations) say to use in-region redundant storage when all customer data must stay in one region, including Durable Functions storage. The same page specifies an internally load-balanced App Service Environment for keeping other platform-managed customer data solely within the region. Do not infer that an ordinary regional function app plus LRS establishes that stronger platform-wide guarantee.

Inspect the hosting plan and resource relationships:

```bash
az functionapp show \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_FUNCTION_APP \
  --query '{id:id,location:location,plan:serverFarmId,kind:kind}' \
  --output json
```

See the [function app CLI reference](https://learn.microsoft.com/en-us/cli/azure/functionapp#az-functionapp-show). Resolve the referenced plan and storage resources separately. Compare their actual configurations with the requirement and the hosting model's documentation.

## Close the Review with a Data-Flow Test

Inspect Application Insights or Log Analytics destinations, diagnostic exports, dead-letter handling, support bundles, and downstream APIs. Restrict message bodies and identifying attributes in logs according to the approved data policy.

Rehearse normal processing, retries, poison messages, and recovery using synthetic data. Confirm where each resulting copy resides. If documentation does not establish a required behavior, record the gap and obtain a service-specific answer before making the claim to customers.

The review should end with a list of verified locations and unresolved dependencies, not a single screenshot showing that the primary resources share a region.
