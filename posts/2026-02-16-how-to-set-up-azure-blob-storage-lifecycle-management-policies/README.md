# How to Set Up Azure Blob Storage Lifecycle Management Policies to Automatically Tier and Delete Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Lifecycle Management, Cloud Storage, Cost Optimization, Azure Storage, Data Management

Description: Learn how to configure Azure Blob Storage lifecycle management policies to automatically move data between tiers and delete old blobs to reduce costs.

---

If you have ever watched your Azure storage bill creep upward month after month, you already know the pain. Data piles up, old logs sit around in hot storage doing nothing, and nobody remembers to clean things up. Azure Blob Storage lifecycle management policies exist precisely for this problem. They let you define rules that automatically transition blobs between access tiers or delete them based on age or other conditions.

In this guide, I will walk through how to set up these policies from scratch, covering the Azure Portal, the CLI, and ARM templates.

## Why Lifecycle Management Matters

Azure Blob Storage offers multiple access tiers - Hot, Cool, Cold, and Archive. Each tier has different storage costs and access costs. Hot storage is the most expensive per gigabyte but cheapest to read from. Archive is the cheapest to store but most expensive (and slowest) to read.

Most data follows a predictable pattern: it gets written, read frequently for a few days or weeks, then rarely accessed, and eventually not needed at all. Lifecycle management policies automate the movement of blobs through these tiers based on rules you define.

Without automation, you would need engineers manually reviewing storage or writing custom scripts. That approach does not scale and inevitably leads to wasted money.

## Prerequisites

Before setting up lifecycle management, make sure you have:

- An Azure subscription with a general-purpose v2 or Blob storage account
- The storage account must have blob access tier support enabled (GPv2 accounts have this by default)
- Azure CLI installed if you plan to use command-line configuration
- Appropriate permissions (Storage Account Contributor or Owner)

## Setting Up a Policy in the Azure Portal

The portal offers the most visual way to create lifecycle policies.

1. Navigate to your storage account in the Azure Portal.
2. Under "Data management" in the left sidebar, click "Lifecycle management."
3. Click "Add a rule."
4. Give your rule a name - something descriptive like "move-logs-to-cool-after-30-days."
5. Choose the rule scope. You can apply it to all blobs or filter by container, prefix, or blob index tags.
6. Define the conditions and actions.

For example, a common rule would be: move blobs to Cool tier after 30 days, move to Archive after 90 days, and delete after 365 days.

## Setting Up a Policy Using Azure CLI

The CLI approach is better for automation and version control. You define your policy in a JSON file and apply it to the storage account.

Here is a policy JSON file that moves blobs through tiers and eventually deletes them:

```json
{
  "rules": [
    {
      "enabled": true,
      "name": "move-and-cleanup-rule",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 30
            },
            "tierToArchive": {
              "daysAfterModificationGreaterThan": 90
            },
            "delete": {
              "daysAfterModificationGreaterThan": 365
            }
          },
          "snapshot": {
            "delete": {
              "daysAfterCreationGreaterThan": 90
            }
          }
        },
        "filters": {
          "blobTypes": [
            "blockBlob"
          ],
          "prefixMatch": [
            "logs/",
            "temp-data/"
          ]
        }
      }
    }
  ]
}
```

Save that file as `lifecycle-policy.json` and then apply it with the CLI:

```bash
# Apply the lifecycle policy to your storage account
az storage account management-policy create \
  --account-name mystorageaccount \
  --resource-group myresourcegroup \
  --policy @lifecycle-policy.json
```

To verify the policy was applied correctly, you can retrieve it:

```bash
# Retrieve and display the current lifecycle policy
az storage account management-policy show \
  --account-name mystorageaccount \
  --resource-group myresourcegroup
```

## Using ARM Templates for Infrastructure as Code

If you manage your infrastructure through ARM templates or Bicep, you can define lifecycle policies inline. Here is a Bicep example:

```bicep
// Define a lifecycle management policy resource for the storage account
resource lifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  name: '${storageAccount.name}/default'
  properties: {
    policy: {
      rules: [
        {
          name: 'auto-tier-rule'
          enabled: true
          type: 'Lifecycle'
          definition: {
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 30
                }
                tierToArchive: {
                  daysAfterModificationGreaterThan: 90
                }
                delete: {
                  daysAfterModificationGreaterThan: 365
                }
              }
            }
            filters: {
              blobTypes: [
                'blockBlob'
              ]
            }
          }
        }
      ]
    }
  }
}
```

## Filtering Blobs with Prefix and Tags

You do not have to apply lifecycle rules to every blob in your account. Filters let you target specific subsets of data.

**Prefix matching** lets you target blobs in specific containers or paths. For example, `logs/2024/` would only affect blobs under that path.

**Blob index tags** provide even more granular control. You can tag blobs with key-value pairs when you upload them, then write lifecycle rules that match on those tags.

Here is how you would use blob index tags in a policy:

```json
{
  "filters": {
    "blobTypes": ["blockBlob"],
    "blobIndexMatch": [
      {
        "name": "retention",
        "op": "==",
        "value": "short-term"
      }
    ]
  }
}
```

This is powerful when different teams or applications share the same storage account but need different retention policies.

## Handling Snapshots and Versions

Lifecycle policies can also manage blob snapshots and versions, not just base blobs. This is important because snapshots and versions can accumulate and eat into your storage budget without you realizing it.

You can define separate actions for snapshots and versions:

- `snapshot.delete` - Deletes snapshots older than a specified number of days
- `version.tierToCool` - Moves old versions to cool tier
- `version.tierToArchive` - Moves old versions to archive tier
- `version.delete` - Deletes old versions

## Policy Execution Timing

One thing that catches people off guard is that lifecycle management policies do not run in real time. Azure runs these policies once per day, and it can take up to 24 hours after you create or modify a policy before the first run happens. After that, it may take up to 24 hours for actions to complete on all matching blobs.

For large storage accounts with millions of blobs, the process can take even longer. Do not expect instant results. Plan accordingly, especially if you are trying to reduce costs before a billing cycle ends.

## Monitoring Policy Execution

You can track what lifecycle management is doing through Azure Monitor. Enable diagnostic logging on your storage account and look for the `BlobTierChanged` and `BlobDeleted` events.

You can also check the `LastAccessTime` tracking property if you want to build rules based on when a blob was last read rather than when it was last modified. To use this, you need to enable last access time tracking on the storage account:

```bash
# Enable last access time tracking on the storage account
az storage account blob-service-properties update \
  --account-name mystorageaccount \
  --resource-group myresourcegroup \
  --enable-last-access-tracking true
```

Then you can write rules using `daysAfterLastAccessTimeGreaterThan` instead of `daysAfterModificationGreaterThan`.

## Common Pitfalls

**Forgetting about early deletion fees.** If you move a blob to Cool tier and then a lifecycle policy moves it to Archive before the minimum retention period (30 days for Cool), you get charged an early deletion fee. Design your tier transitions with minimum retention periods in mind.

**Not testing with a small prefix first.** Before rolling out a policy across your entire account, test it on a specific container or prefix to make sure it behaves the way you expect.

**Overlapping rules.** If two rules match the same blob but specify different actions, the cheaper action wins. For example, if one rule says delete and another says tier to Archive, the delete action takes precedence because it is cheaper.

## A Real-World Example

Say you run an application that generates daily log files and weekly reports. You might set up a policy like this:

- Log files (prefix `logs/`): Move to Cool after 7 days, Archive after 30 days, delete after 90 days
- Reports (prefix `reports/`): Move to Cool after 30 days, Archive after 180 days, delete after 730 days (2 years)
- Temp uploads (prefix `temp/`): Delete after 7 days

This kind of tiered approach keeps your hot storage lean while preserving important data in cheaper tiers for as long as compliance or business needs require.

## Wrapping Up

Azure Blob Storage lifecycle management is one of those features that takes 15 minutes to set up but can save you thousands of dollars per year. Define your rules thoughtfully, test them on a small scope first, and monitor the results. Once you have a good policy in place, you can largely forget about manual storage cleanup and let Azure handle it for you.
