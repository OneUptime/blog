# How to Set Up Azure DevOps Migration from On-Premises Team Foundation Server to Azure DevOps Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, TFS Migration, Team Foundation Server, Cloud Migration, DevOps, Azure DevOps Services, Migration

Description: Learn how to plan and execute a migration from on-premises Team Foundation Server to Azure DevOps Services while preserving work items, repos, and build history.

---

Migrating from on-premises Team Foundation Server (TFS) to Azure DevOps Services is one of those projects that teams put off for years. The existing TFS installation works, everyone knows how to use it, and migration sounds risky. But TFS is end-of-life, it does not get new features, and maintaining the on-premises infrastructure is an ongoing cost. The migration is inevitable, and the longer you wait, the more data you accumulate and the harder it gets.

The good news is that Microsoft provides a well-documented migration path with dedicated tools. The process preserves your work items, source code, build history, and project structure. It is not trivial, but it is a known quantity with predictable steps.

## Migration Approaches

There are two main approaches to migrating from TFS to Azure DevOps Services.

### High-Fidelity Migration (Data Migration Tool)

This is the official Microsoft approach. It uses the Azure DevOps Data Migration Tool to move your entire TFS collection to Azure DevOps Services with full fidelity. Work item IDs are preserved, changeset history is intact, and the migration is atomic.

This approach is best when you need to preserve every detail - work item IDs, links, attachments, changeset numbers, and complete history. It requires your TFS instance to be on a supported version (TFS 2018 Update 2 or later).

### Selective Migration

For teams that do not need complete fidelity, selective migration involves moving specific pieces manually or with third-party tools. You might import Git repositories directly, re-create work items using CSV import or the REST API, and set up new build pipelines from scratch.

This approach works when you want a fresh start but need to carry over some historical data. It is also the only option if your TFS version is too old for the Data Migration Tool.

## Pre-Migration Planning

Before touching any tools, plan the migration thoroughly.

### Inventory Your TFS Collections

```bash
# Connect to your TFS instance and list all project collections
# Use the TFS Power Tools or REST API
curl -u "domain\username:password" \
  "http://tfs-server:8080/tfs/_apis/projectcollections?api-version=4.1" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for collection in data['value']:
    print(f\"Collection: {collection['name']}, State: {collection['state']}\")
"
```

Document what you have:
- Number of project collections
- Number of team projects per collection
- Repository types (TFVC, Git, or both)
- Total data size (including attachments and build artifacts)
- Active versus archived projects

### Check TFS Version Compatibility

The Data Migration Tool requires TFS 2018 Update 2 or later. If you are on an older version, you need to upgrade TFS before migrating.

```
Supported source versions:
  TFS 2018 Update 2+
  TFS 2018 Update 3+
  Azure DevOps Server 2019
  Azure DevOps Server 2020
  Azure DevOps Server 2022
```

If you are on TFS 2015 or earlier, the upgrade path is: upgrade to TFS 2018 or later first, then migrate to Azure DevOps Services.

### Clean Up Before Migration

Migration is a chance to clean house. Delete old test projects, remove large binaries from version control (if moving from TFVC), archive projects that are no longer active, and resolve any data integrity issues.

```sql
-- Check for common data issues before migration (run on TFS database)
-- Find work items with broken links
SELECT wi.System_Id, wi.System_Title
FROM dbo.WorkItemsLatestUsed wi
LEFT JOIN dbo.LinksLatestUsed l ON wi.System_Id = l.SourceID
WHERE l.SourceID IS NULL AND wi.System_WorkItemType = 'Bug'

-- Find oversized attachments (over 100MB)
SELECT a.AttachmentId, a.Length / 1048576.0 AS SizeMB, a.OriginalName
FROM dbo.tbl_Attachment a
WHERE a.Length > 104857600
ORDER BY a.Length DESC
```

## Performing the High-Fidelity Migration

### Step 1: Upgrade TFS to a Supported Version

If your TFS is below 2018 Update 2, upgrade it first. Follow the standard TFS upgrade process - backup, run the installer, and configure.

### Step 2: Download and Configure the Migration Tool

Download the Azure DevOps Data Migration Tool from the Microsoft website. It includes a CLI tool called `Migrator.exe`.

```powershell
# Download and extract the migration tool
# Run the preparation step to analyze your collection

# First, prepare the collection for migration
Migrator.exe prepare /collection:http://tfs-server:8080/tfs/DefaultCollection /tenantdomainname:yourtenant.onmicrosoft.com /region:CUS
```

The prepare step validates your collection and generates a migration specification file. Review this file carefully - it lists any issues that need to be resolved before migration.

### Step 3: Validate the Collection

```powershell
# Run validation to check for migration blockers
Migrator.exe validate /collection:http://tfs-server:8080/tfs/DefaultCollection

# Common validation issues:
# - Process template customizations not supported in cloud
# - Large binary files exceeding size limits
# - Identity mapping issues (on-prem AD to Azure AD)
```

Validation produces a log file that categorizes issues as errors (must fix before migration) or warnings (can proceed but should review).

### Step 4: Identity Mapping

Map your on-premises Active Directory identities to Azure AD identities. This is often the most time-consuming part of the migration.

Create an identity map file that maps each TFS user to their Azure AD equivalent.

```json
{
  "identityMappings": [
    {
      "source": "DOMAIN\\jsmith",
      "target": "jsmith@yourcompany.com"
    },
    {
      "source": "DOMAIN\\mjones",
      "target": "mjones@yourcompany.com"
    },
    {
      "source": "DOMAIN\\BuildService",
      "target": "build-service@yourcompany.com"
    }
  ]
}
```

For users who have left the organization, you can map them to a placeholder identity or leave them unmapped (they will show as "Previous user" in Azure DevOps).

### Step 5: Perform the Migration

Schedule the migration during a maintenance window. The collection is read-only during migration, so communicate downtime to all users.

```powershell
# Import the collection to Azure DevOps Services
Migrator.exe import /collection:http://tfs-server:8080/tfs/DefaultCollection /tenantdomainname:yourtenant.onmicrosoft.com /region:CUS

# The import process:
# 1. Detaches the collection from TFS
# 2. Creates a backup
# 3. Uploads to Azure DevOps Services
# 4. Restores in the cloud environment
# 5. Runs data transformations
```

Migration time depends on data size. Small collections (under 10 GB) might complete in a few hours. Large collections (100+ GB) can take a day or more.

### Step 6: Post-Migration Validation

After migration completes, verify the data.

```bash
# Verify work items migrated correctly
# Use the Azure DevOps CLI to spot-check
az devops configure --defaults organization=https://dev.azure.com/your-org project=YourProject

# Count work items
az boards query --wiql "SELECT [System.Id] FROM workitems WHERE [System.TeamProject] = 'YourProject'" --query "length([])" --output tsv

# Check repository migration
az repos list --output table

# Verify recent build definitions
az pipelines list --output table
```

## Handling TFVC to Git Conversion

If you are moving from TFVC (Team Foundation Version Control) to Git, you need to convert your repositories. The migration tool preserves TFVC repositories as-is, but most teams want to convert to Git during or after migration.

```bash
# Use git-tfs to convert TFVC repository to Git
# Install git-tfs first: choco install gittfs (Windows)

# Clone a TFVC branch as a Git repository
git tfs clone http://tfs-server:8080/tfs/DefaultCollection $/ProjectName/Main --branches=all

# Push the converted repository to Azure DevOps
cd ProjectName
git remote add azure https://dev.azure.com/your-org/your-project/_git/your-repo
git push azure --all
git push azure --tags
```

For large TFVC repositories, consider converting only the main branch and recent history (last 2-3 years) rather than the entire history.

## Build Pipeline Migration

Classic build definitions from TFS are migrated by the Data Migration Tool, but they often need updates to work in the cloud. Common changes include:

- Replacing on-premises build agents with Microsoft-hosted agents
- Updating paths that referenced on-premises network shares
- Converting classic build definitions to YAML pipelines (optional but recommended)
- Updating service connections for cloud deployments

```yaml
# Example: Converted YAML pipeline from a classic TFS build definition
# Original used an on-prem build agent and UNC paths

trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'windows-latest'  # Changed from on-prem agent pool

steps:
  - task: NuGetToolInstaller@1
    displayName: 'Install NuGet'

  - task: NuGetCommand@2
    displayName: 'Restore NuGet Packages'
    inputs:
      restoreSolution: '**/*.sln'
      feedsToUse: 'select'
      vstsFeed: 'your-feed'  # Changed from on-prem NuGet server

  - task: VSBuild@1
    displayName: 'Build Solution'
    inputs:
      solution: '**/*.sln'
      msbuildArgs: '/p:DeployOnBuild=true /p:WebPublishMethod=Package'
      platform: 'Any CPU'
      configuration: 'Release'
```

## Communication and Cutover Plan

Create a communication plan that covers:

1. Announcement (2-4 weeks before): Inform all users about the migration timeline
2. Freeze period (1 week before): Stop creating new projects or major restructuring
3. Migration window: Communicate exact downtime
4. Cutover: Redirect users to the new Azure DevOps Services URLs
5. Support period (2 weeks after): Provide extra support as users adapt

After migration, update all bookmarks, scripts, and CI/CD integrations that reference the old TFS URLs. The new URLs will follow the pattern `https://dev.azure.com/your-org/`.

Migrating from TFS to Azure DevOps Services is a significant undertaking, but the result is a modern, managed platform that receives continuous updates and eliminates on-premises maintenance. Plan thoroughly, clean up before you migrate, validate after, and give your team time to adjust to the new environment.
