# How to Use Azure CLI Batch Commands and JMESPath Queries for Efficient Resource Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure CLI, JMESPath, Resource Management, Automation, Azure, Scripting, Cloud Management

Description: Learn how to use Azure CLI batch operations and JMESPath query expressions to efficiently manage, filter, and transform Azure resource data at scale.

---

The Azure CLI is most people's first interaction with Azure outside the portal. Simple commands like `az vm list` or `az group create` are straightforward. But once you manage more than a handful of resources, you need to work in bulk - querying across subscriptions, filtering resources by properties, extracting specific fields, and piping results into other commands. This is where JMESPath queries and batch patterns turn the Azure CLI from a one-resource-at-a-time tool into an efficient management interface.

JMESPath is the query language built into the Azure CLI. Every `--query` parameter you pass uses JMESPath syntax. Learning it well dramatically reduces the number of commands you need to run and the amount of output you need to parse manually.

## JMESPath Fundamentals

Every Azure CLI command that returns JSON data supports the `--query` parameter. Here are the core JMESPath patterns.

### Selecting Fields

```bash
# List all VMs but only show name and location
az vm list --query "[].{Name:name, Location:location}" --output table

# Output:
# Name        Location
# ----------  ----------
# web-vm-1    eastus
# db-vm-1     eastus
# worker-vm   westus2
```

The `[]` means "for each item in the array." The `{Name:name, Location:location}` creates a new object with renamed fields.

### Filtering with Conditions

```bash
# Find all VMs in a specific location
az vm list --query "[?location=='eastus'].name" --output tsv

# Find VMs that are currently running
az vm list -d --query "[?powerState=='VM running'].{Name:name, Size:hardwareProfile.vmSize}" --output table

# Find storage accounts larger than a specific size
az storage account list --query "[?sku.tier=='Premium'].{Name:name, SKU:sku.name, Kind:kind}" --output table
```

The `?` character starts a filter expression. You can use comparison operators like `==`, `!=`, `>`, `<`, and logical operators like `&&` and `||`.

### Nested Property Access

```bash
# Access nested properties with dot notation
az vm list --query "[].{Name:name, VMSize:hardwareProfile.vmSize, OSDisk:storageProfile.osDisk.osType}" --output table

# Access array elements
az network nsg list --query "[].{Name:name, RuleCount:length(securityRules)}" --output table
```

### String Functions

JMESPath includes several string functions that are useful for filtering.

```bash
# Find resources whose name starts with 'prod-'
az resource list --query "[?starts_with(name, 'prod-')].{Name:name, Type:type}" --output table

# Find resources whose name contains 'cache'
az resource list --query "[?contains(name, 'cache')].{Name:name, Type:type, RG:resourceGroup}" --output table

# Find resources with names ending in a specific suffix
az resource list --query "[?ends_with(name, '-v2')].name" --output tsv
```

## Practical Batch Operations

### Stopping All VMs in a Resource Group

```bash
# Get all VM names in a resource group and stop them
# The --query extracts just the names, --output tsv gives clean text for xargs
az vm list \
  --resource-group "dev-rg" \
  --query "[].name" \
  --output tsv | \
  xargs -I {} az vm deallocate \
    --resource-group "dev-rg" \
    --name {} \
    --no-wait

echo "Deallocation commands sent for all VMs in dev-rg"
```

The `--no-wait` flag is critical for batch operations. Without it, each command blocks until the VM is fully deallocated (which can take minutes). With it, all deallocation commands fire immediately and run in parallel.

### Tagging All Resources in a Subscription

```bash
# Add a tag to all resources that are missing the 'Environment' tag
az resource list \
  --query "[?tags.Environment==null].id" \
  --output tsv | \
  while read -r RESOURCE_ID; do
    echo "Tagging: $RESOURCE_ID"
    az resource tag \
      --ids "$RESOURCE_ID" \
      --tags Environment=unknown \
      --is-incremental \
      --output none
  done
```

### Finding Unused Resources

```bash
# Find unattached managed disks (not associated with any VM)
az disk list \
  --query "[?managedBy==null].{Name:name, Size:diskSizeGb, SKU:sku.name, RG:resourceGroup}" \
  --output table

# Find public IPs that are not associated with any resource
az network public-ip list \
  --query "[?ipConfiguration==null].{Name:name, IP:ipAddress, RG:resourceGroup}" \
  --output table

# Find empty Network Security Groups (no associated NICs or subnets)
az network nsg list \
  --query "[?length(networkInterfaces)==\`0\` && length(subnets)==\`0\`].{Name:name, RG:resourceGroup}" \
  --output table
```

### Cross-Subscription Queries

```bash
# List all subscriptions and their IDs
az account list --query "[].{Name:name, ID:id, State:state}" --output table

# Find all VMs across all subscriptions
for SUB_ID in $(az account list --query "[?state=='Enabled'].id" --output tsv); do
  echo "Scanning subscription: $SUB_ID"
  az vm list \
    --subscription "$SUB_ID" \
    --query "[].{Name:name, RG:resourceGroup, Location:location, Sub:'$SUB_ID'}" \
    --output table
done
```

## Advanced JMESPath Techniques

### Sorting Results

```bash
# Sort VMs by name
az vm list --query "sort_by([], &name)[].{Name:name, Location:location}" --output table

# Sort storage accounts by creation date (descending)
az storage account list \
  --query "reverse(sort_by([], &creationTime))[].{Name:name, Created:creationTime}" \
  --output table
```

### Aggregations

```bash
# Count resources by type
az resource list --query "length([?type=='Microsoft.Compute/virtualMachines'])" --output tsv

# Count resources per resource group
for RG in $(az group list --query "[].name" --output tsv); do
  COUNT=$(az resource list --resource-group "$RG" --query "length([])" --output tsv)
  echo "$RG: $COUNT resources"
done
```

### Combining Multiple Filters

```bash
# Find VMs that are running AND in eastus AND have more than 4 cores
az vm list -d \
  --query "[?powerState=='VM running' && location=='eastus' && hardwareProfile.vmSize!='Standard_B2s'].{Name:name, Size:hardwareProfile.vmSize}" \
  --output table

# Find storage accounts that use Standard tier AND allow blob public access
az storage account list \
  --query "[?sku.tier=='Standard' && allowBlobPublicAccess==\`true\`].{Name:name, PublicAccess:allowBlobPublicAccess}" \
  --output table
```

### Flattening Nested Arrays

```bash
# Get all NSG rules across all NSGs (flatten the nested arrays)
az network nsg list \
  --query "[].{NSG:name, Rules:securityRules[].{Rule:name, Priority:priority, Access:access, Direction:direction}}" \
  --output json
```

## Building Reusable Scripts

Combine JMESPath queries with shell scripting for reusable management tools.

```bash
#!/bin/bash
# resource-audit.sh - Audit Azure resources for common issues

echo "=== Azure Resource Audit ==="
echo ""

# Check 1: VMs without tags
echo "--- VMs Missing Required Tags ---"
az vm list \
  --query "[?tags.Owner==null || tags.Environment==null].{Name:name, RG:resourceGroup, MissingTags:'Owner or Environment'}" \
  --output table
echo ""

# Check 2: Unencrypted storage accounts
echo "--- Storage Accounts Without Infrastructure Encryption ---"
az storage account list \
  --query "[?encryption.requireInfrastructureEncryption!=\`true\`].{Name:name, RG:resourceGroup}" \
  --output table
echo ""

# Check 3: Databases without long-term retention
echo "--- SQL Databases (check retention manually) ---"
az sql db list \
  --server "my-sql-server" \
  --resource-group "my-rg" \
  --query "[].{Name:name, Status:status, SKU:currentSku.name}" \
  --output table
echo ""

# Check 4: Resources without locks
echo "--- Resource Groups Without Delete Locks ---"
for RG in $(az group list --query "[].name" --output tsv); do
  LOCK_COUNT=$(az lock list --resource-group "$RG" --query "length([?level=='CanNotDelete'])" --output tsv)
  if [ "$LOCK_COUNT" -eq "0" ]; then
    echo "  No delete lock: $RG"
  fi
done

echo ""
echo "=== Audit Complete ==="
```

## Performance Tips

When running batch operations, a few techniques make a significant difference.

Use `--output none` for write operations where you do not need the response body. This reduces bandwidth and speeds up scripting.

Use `--no-wait` for long-running operations (VM start/stop, disk creation, etc.) to fire them all in parallel instead of sequentially.

Use `--query` to reduce the response payload. Fetching only the fields you need is faster than fetching everything and filtering locally.

Consider using `az rest` for operations that the CLI does not support natively. It lets you call any Azure REST API endpoint directly.

```bash
# Use az rest for custom API calls
az rest \
  --method GET \
  --url "https://management.azure.com/subscriptions/{sub-id}/resources?api-version=2021-04-01" \
  --query "value[?type=='Microsoft.Compute/virtualMachines'].name"
```

Mastering JMESPath and batch patterns transforms the Azure CLI from a simple tool for individual resource operations into a powerful management interface for entire environments. The query language alone saves hours of manual filtering and the batch patterns let you apply changes across hundreds of resources in minutes instead of hours.
