# Diagnose Azure MySQL Bicep SKU, Zone, and Capacity Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Troubleshooting

Description: Separate Bicep errors from Azure MySQL quota, zone, and capacity failures using deployment details, regional capabilities, and controlled configuration changes.

A Bicep file can compile successfully and still fail to create an Azure MySQL server. Compilation checks the infrastructure description. It does not reserve hardware in a region, grant subscription access, or establish that the chosen availability zones can host the requested configuration.

When a deployment fails, preserve the exact request and find the most specific error before changing anything. Repeatedly choosing different server sizes or regions can obscure the original problem and accidentally weaken the intended architecture.

The examples below use documented Azure CLI commands, with command definitions reviewed against CLI 2.80.0 where noted. Shell syntax and the deployment-error query were checked locally. No Azure deployment, capacity lookup, or subscription change was performed.

## Identify the failure layer

A SKU is Azure's identifier for a particular server configuration. An availability zone is a distinct infrastructure location within a region. Neither a valid SKU name nor a region with MySQL support guarantees that every combination is available to your subscription at that moment.

Use this classification before editing the template:

| Failure layer | Evidence to look for | Useful next step |
| --- | --- | --- |
| Local Bicep compilation | Compiler diagnostic and source location | Fix syntax, types, or module inputs |
| Azure request validation | Specific nested resource error | Compare submitted values with the resource API |
| Subscription access or quota | Registration, access, or quota message | Follow the applicable access or quota process |
| Unsupported placement | SKU or zone unsupported message | Review supported configurations |
| Capacity allocation | Region or configuration temporarily unavailable | Evaluate approved alternatives or request assistance |

Microsoft's [MySQL capacity-error guide](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/resolve-capacity-errors) distinguishes quota, provider registration, region access, zone support, and SKU availability. A message saying a region is unsupported can concern subscription access; it is not automatically proof that the product is absent from that geography.

## Capture the failed operation

Start in the resource group's deployment history. Open the failed deployment and inspect the operation for the MySQL resource, including nested deployment failures if your Bicep file uses modules. Record the UTC time, resource ID, error code, message, and correlation ID. Azure support can use the correlation ID to locate related operations, as explained in the [deployment-history guide](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-history).

For the CLI alternative, sign in using an account allowed to read deployment history. Replace all uppercase placeholder values. These commands read the named resource-group deployment; they do not retry it:

```bash
SUBSCRIPTION_ID='REPLACE_WITH_SUBSCRIPTION_ID'
RESOURCE_GROUP='REPLACE_WITH_RESOURCE_GROUP'
DEPLOYMENT_NAME='REPLACE_WITH_DEPLOYMENT_NAME'

az deployment operation group list \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --query "[?properties.provisioningState=='Failed'].properties.statusMessage" \
  --output json

az deployment group show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --query properties.correlationId \
  --output tsv
```

The first command returns the failed operations' status messages; inspect their nested error details. The second returns the deployment correlation ID. An empty first result can mean that the failure occurred before a resource operation was recorded, that you selected the wrong deployment, or that you need to inspect a nested deployment. It does not demonstrate success.

The command syntax is documented under [deployment operation group](https://learn.microsoft.com/en-us/cli/azure/deployment/operation/group?view=azure-cli-latest), and the group registration was checked in [CLI 2.80.0 source](https://github.com/Azure/azure-cli/blob/azure-cli-2.80.0/src/azure-cli/azure/cli/command_modules/resource/commands.py). Treat exported error details as internal operational data and review them before sharing outside the team.

## Inspect what the template actually requested

Compare the final deployment parameters with the intended configuration. A parameter file, pipeline variable, or module default can override the value you were reading in the parent file.

Record this combination together: subscription, region, server SKU name, SKU tier, primary zone, high-availability mode, standby zone, and API version. For a template using `Microsoft.DBforMySQL/flexibleServers@2024-12-30`, the [versioned resource reference](https://learn.microsoft.com/en-us/azure/templates/microsoft.dbformysql/2024-12-30/flexibleservers) defines `sku.name`, `sku.tier`, `properties.availabilityZone`, and the high-availability properties. A VM SKU example from another service is not a substitute for MySQL's supported configuration.

Compile the actual entrypoint with your pinned compiler. For example, with Bicep CLI 0.49.2 installed and your existing entrypoint named `main.bicep`:

```bash
bicep build main.bicep --outfile main.json
```

This generates an ARM template for review, as described in the [Bicep build documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-cli). ARM means Azure Resource Manager, the deployment service. Expressions in the output can still depend on deployment parameters; compilation does not fully resolve every value into a literal.

Keep the compiler version and template revision with the failed request. Do not switch API versions at random to work around a capacity message.

## Compare regional capabilities without assuming a reservation

Use MySQL's service-specific capability command rather than relying on a generic virtual-machine size list. With the same authenticated subscription and the region identifier used by the template:

```bash
LOCATION='REPLACE_WITH_AZURE_REGION_NAME'

az mysql flexible-server list-skus \
  --subscription "$SUBSCRIPTION_ID" \
  --location "$LOCATION" \
  --output json
```

Inspect the returned capabilities for the requested tier and SKU. Keep the full JSON during investigation instead of applying a projection based on an assumed response shape. The command is documented in the [Flexible Server CLI reference](https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server?view=azure-cli-latest); its location argument is also present in [CLI 2.80.0 parameter definitions](https://github.com/Azure/azure-cli/blob/azure-cli-2.80.0/src/azure-cli/azure/cli/command_modules/rdbms/_params.py).

A listed configuration is useful evidence of advertised capability. It is not a reservation or a guarantee that the next create request can allocate capacity. Save the lookup time alongside the failed deployment time.

For a registration message, check the subscription's Resource providers page for `Microsoft.DBforMySQL`. For a quota message, inspect the relevant quota and requested increase. Avoid treating provider registration, quota, and region access as interchangeable fixes.

## Change one architectural choice at a time

If an alternative is needed, evaluate it against the original requirements. A different SKU changes compute characteristics and cost. Another zone can affect the intended failure boundary. Another region changes latency, network dependencies, recovery planning, and data-location requirements.

High availability adds another placement requirement. Disabling it might make a diagnostic experiment succeed, but it does not prove that the intended highly available deployment is viable. Keep such experiments isolated and never describe the reduced configuration as an equivalent production fix.

Use a reviewed alternative parameter set and retain the original. Before a retry against existing resources, inspect the proposed changes with your normal deployment preview. Azure's [what-if operation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-what-if) predicts resource changes without applying them, but an acceptable preview does not reserve regional capacity.

## Avoid destructive retries

A failed deployment can leave successfully created resources behind. Inspect the actual resource state before rerunning or cleaning up. Do not delete an existing database, network, or private DNS zone simply because the enclosing deployment shows Failed.

If no acceptable configuration is available, prepare a support request with the subscription, region, requested SKU and zones, high-availability requirement, UTC failure time, correlation ID, and specific error details. State whether the operation creates a new server or changes an existing one; the operational urgency and safe alternatives differ.

After a retry succeeds, verify the resulting configuration and application connectivity. Deployment success is necessary, but it does not prove that the server landed in the intended zone, retained the required resilience, or is reachable through the expected private network path.
