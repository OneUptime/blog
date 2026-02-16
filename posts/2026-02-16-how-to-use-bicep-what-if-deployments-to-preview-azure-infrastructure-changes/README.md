# How to Use Bicep What-If Deployments to Preview Azure Infrastructure Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, What-If, Deployments, Infrastructure as Code, DevOps, Preview

Description: Use Bicep what-if deployments to preview infrastructure changes before applying them, reducing risk and improving deployment confidence.

---

One of the biggest anxieties in infrastructure management is deploying changes without knowing exactly what will happen. Will this template update modify the storage account or recreate it? Will it delete that subnet that the production VMs are using? Bicep what-if deployments answer these questions before you commit to the change.

The what-if operation evaluates your Bicep template against the current state of your Azure environment and shows you a detailed diff of what would change. It is similar to Terraform's `plan` command, and it should be a mandatory step in every deployment pipeline.

## How What-If Works

When you run a what-if deployment, Azure Resource Manager compares your template's desired state with the current state of the target resource group or subscription. It categorizes each resource into one of several change types:

- **Create** - The resource does not exist and will be created
- **Delete** - The resource exists but is not in the template (only in Complete mode)
- **Modify** - The resource exists and some properties will change
- **NoChange** - The resource exists and matches the template exactly
- **Ignore** - The resource exists but is not managed by this template

No actual changes are made during a what-if evaluation. It is purely a read-only preview.

## Running What-If from the CLI

The simplest way to use what-if is from the Azure CLI.

```bash
# What-if for a resource group deployment
az deployment group what-if \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json
```

The output uses color-coded symbols to show what would change:

```
Resource and property changes are indicated with these symbols:
  + Create
  ~ Modify
  - Delete
  = NoChange

The deployment will update the following scope:

Scope: /subscriptions/xxx/resourceGroups/rg-app-prod

  ~ Microsoft.Web/serverfarms/plan-prod [2023-12-01]
    ~ properties.sku.name: "S1" => "P1v3"
    ~ properties.sku.capacity: 2 => 5

  + Microsoft.Storage/storageAccounts/stlogsprod001 [2023-05-01]

  = Microsoft.Web/sites/app-prod [2023-12-01]
```

In this example, you can see that the App Service Plan will be modified (SKU upgraded and instance count increased), a new storage account will be created, and the web app itself will not change.

## What-If with Different Result Formats

The default output is human-readable, but you can also get JSON or structured results for programmatic processing.

```bash
# Get what-if results in JSON format
az deployment group what-if \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json \
  --result-format FullResourcePayloads \
  --output json > what-if-results.json
```

The `FullResourcePayloads` format includes the complete before and after state of each resource. The `ResourceIdOnly` format shows just the resource IDs and change types - useful for quick assessments.

```bash
# Compact output with just resource IDs
az deployment group what-if \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json \
  --result-format ResourceIdOnly
```

## What-If for Subscription-Level Deployments

For deployments that create resource groups, use the subscription scope.

```bash
# Subscription-level what-if
az deployment sub what-if \
  --location eastus \
  --template-file main.bicep \
  --parameters parameters.prod.json
```

This works for Bicep templates that use `targetScope = 'subscription'` and create resource groups as part of the deployment.

## Integrating What-If into CI/CD Pipelines

What-if is most valuable when it is part of your deployment pipeline. Here is how to add it to a GitHub Actions workflow.

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  pull_request:
    paths:
      - 'infrastructure/**'
  push:
    branches:
      - main
    paths:
      - 'infrastructure/**'

jobs:
  # Run what-if on every PR
  what-if:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Run what-if and capture the output
      - name: Run What-If
        id: whatif
        run: |
          result=$(az deployment group what-if \
            --resource-group rg-app-prod \
            --template-file infrastructure/main.bicep \
            --parameters infrastructure/parameters.prod.json \
            --no-pretty-print 2>&1)
          echo "result<<EOF" >> $GITHUB_OUTPUT
          echo "$result" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      # Post the what-if results as a PR comment
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = `### Bicep What-If Results
            \`\`\`
            ${{ steps.whatif.outputs.result }}
            \`\`\`
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

  # Deploy only on merge to main
  deploy:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Run what-if one more time before the actual deployment
      - name: Final What-If Check
        run: |
          az deployment group what-if \
            --resource-group rg-app-prod \
            --template-file infrastructure/main.bicep \
            --parameters infrastructure/parameters.prod.json

      # Deploy for real
      - name: Deploy
        run: |
          az deployment group create \
            --resource-group rg-app-prod \
            --template-file infrastructure/main.bicep \
            --parameters infrastructure/parameters.prod.json
```

This workflow runs what-if on every pull request and posts the results as a comment, giving reviewers clear visibility into what will change. The actual deployment only happens on merge to main.

## Understanding What-If Limitations

What-if is not perfect. There are some things to be aware of.

Property changes might show up as modifications even when the effective result is the same. For example, if you set a property to its current default value, what-if might report it as a change because the template explicitly sets it while the current state relies on the default.

What-if does not evaluate runtime behavior. If your template uses `listKeys()` or other functions that call Azure APIs, what-if will evaluate them, but the results might differ from what happens during actual deployment if the state changes between the what-if and the deploy.

Some resource types have better what-if support than others. Most commonly used resource types work well, but newer or less common types might have incomplete change detection.

## Using What-If in PowerShell

If you prefer PowerShell, the `New-AzResourceGroupDeployment` cmdlet has a `-WhatIf` flag.

```powershell
# What-if with PowerShell
New-AzResourceGroupDeployment `
  -ResourceGroupName "rg-app-prod" `
  -TemplateFile "main.bicep" `
  -TemplateParameterFile "parameters.prod.json" `
  -WhatIf
```

Or use the dedicated what-if cmdlet for more control.

```powershell
# Get what-if results as an object
$results = Get-AzResourceGroupDeploymentWhatIfResult `
  -ResourceGroupName "rg-app-prod" `
  -TemplateFile "main.bicep" `
  -TemplateParameterFile "parameters.prod.json"

# Filter to just modifications
$results.Changes | Where-Object { $_.ChangeType -eq "Modify" }
```

## Failing Pipelines on Destructive Changes

You can parse the what-if output to fail the pipeline if destructive changes (deletes) are detected.

```bash
#!/bin/bash
# fail-on-deletes.sh
# Fail the pipeline if what-if detects any resource deletions

result=$(az deployment group what-if \
  --resource-group rg-app-prod \
  --template-file main.bicep \
  --parameters parameters.prod.json \
  --result-format ResourceIdOnly \
  --no-pretty-print 2>&1)

echo "$result"

if echo "$result" | grep -q "Delete"; then
  echo "ERROR: What-if detected resource deletions. Manual approval required."
  exit 1
fi

echo "No destructive changes detected. Safe to proceed."
```

## Best Practices

Always run what-if before deploying to production. Even if you are confident in your changes, the preview catches unexpected side effects.

Use what-if in Complete mode sparingly. Complete mode shows resources that would be deleted because they are not in the template, but it can be alarming if you manage only a subset of resources in a resource group.

Review the what-if output carefully in pull requests. The diff tells you not just what will change, but the before and after values of each property.

Pair what-if with deployment validation (`az deployment group validate`) for a thorough pre-deployment check. Validation catches syntax and type errors; what-if catches logical and state-based issues.

## Conclusion

Bicep what-if deployments are the safety net that every Azure deployment pipeline needs. They take the guesswork out of infrastructure changes by showing you exactly what will be created, modified, or deleted before a single resource is touched. Integrating what-if into your CI/CD pipelines - with PR comments and destructive change gates - gives your team the confidence to deploy infrastructure changes frequently and safely.
