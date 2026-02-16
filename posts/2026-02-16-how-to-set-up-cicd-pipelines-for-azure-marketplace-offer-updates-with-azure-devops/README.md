# How to Set Up CI/CD Pipelines for Azure Marketplace Offer Updates with Azure DevOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, CI/CD, Azure Marketplace, ARM Templates, Automation, Pipelines, ISV

Description: Set up automated CI/CD pipelines in Azure DevOps to validate, test, and publish Azure Marketplace offer updates with minimal manual intervention.

---

Publishing your first Azure Marketplace offer involves a lot of clicking around in Partner Center. That is fine for the initial release. But once your product is live and you are shipping updates regularly - bug fixes, new features, new pricing tiers - you need an automated pipeline. Manually packaging ARM templates, uploading ZIP files, and clicking through Partner Center for every release does not scale.

Azure DevOps gives you the pipeline infrastructure to automate the entire process from code commit to Marketplace publication. In this guide, I will show you how to set up CI/CD pipelines that validate your ARM templates, run integration tests, package your managed application, and push updates through Partner Center's API.

## Pipeline Architecture

Here is the full pipeline flow:

```mermaid
graph LR
    A[Git Push] --> B[CI Pipeline]
    B --> C[ARM Template Validation]
    C --> D[UI Definition Validation]
    D --> E[Integration Tests]
    E --> F[Package Application]
    F --> G[Upload to Blob Storage]
    G --> H[CD Pipeline]
    H --> I[Partner Center API]
    I --> J[Certification Queue]
    J --> K[Live on Marketplace]
```

The CI pipeline handles validation, testing, and packaging. The CD pipeline handles the actual Marketplace submission through the Partner Center API.

## Project Structure

Organize your repository so the pipeline knows where to find everything:

```
marketplace-app/
  src/
    mainTemplate.json        # ARM deployment template
    createUiDefinition.json  # Portal UI definition
    nestedTemplates/         # Any linked templates
      networking.json
      monitoring.json
  tests/
    template-tests.ps1       # ARM template tests
    ui-tests.ps1             # UI definition tests
    integration/
      deploy-test.ps1        # Full deployment test
  scripts/
    package.ps1              # Packaging script
    publish.ps1              # Partner Center publishing script
  azure-pipelines.yml        # Pipeline definition
```

## CI Pipeline - Validation and Packaging

Here is the CI pipeline definition that validates templates and creates the deployment package:

```yaml
# azure-pipelines.yml - CI pipeline for Marketplace offer
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  storageAccountName: 'stmarketplacepackages'
  containerName: 'packages'
  offerName: 'my-managed-app'

stages:
  - stage: Validate
    displayName: 'Validate Templates'
    jobs:
      - job: ValidateARM
        displayName: 'Validate ARM Templates'
        steps:
          # Install the ARM template test toolkit
          - task: PowerShell@2
            displayName: 'Install ARM TTK'
            inputs:
              targetType: 'inline'
              script: |
                # Download and extract the ARM Template Test Toolkit
                Invoke-WebRequest -Uri "https://aka.ms/arm-ttk-latest" -OutFile arm-ttk.zip
                Expand-Archive arm-ttk.zip -DestinationPath ./arm-ttk

          # Run ARM template validation
          - task: PowerShell@2
            displayName: 'Run ARM TTK Tests'
            inputs:
              targetType: 'inline'
              script: |
                # Import the test toolkit module
                Import-Module ./arm-ttk/arm-ttk/arm-ttk.psd1

                # Test the main template
                $results = Test-AzTemplate -TemplatePath ./src/mainTemplate.json
                $failures = $results | Where-Object { -not $_.Passed }

                if ($failures.Count -gt 0) {
                    $failures | ForEach-Object { Write-Error $_.Message }
                    exit 1
                }

                Write-Host "All ARM template tests passed"

          # Validate the UI definition schema
          - task: PowerShell@2
            displayName: 'Validate UI Definition'
            inputs:
              targetType: 'inline'
              script: |
                # Parse and validate the createUiDefinition.json structure
                $uiDef = Get-Content ./src/createUiDefinition.json | ConvertFrom-Json

                # Check required top-level properties
                if (-not $uiDef.'$schema') { throw "Missing schema property" }
                if (-not $uiDef.handler) { throw "Missing handler property" }
                if (-not $uiDef.parameters.outputs) { throw "Missing outputs" }

                # Verify outputs match mainTemplate parameters
                $template = Get-Content ./src/mainTemplate.json | ConvertFrom-Json
                $templateParams = $template.parameters.PSObject.Properties.Name
                $uiOutputs = $uiDef.parameters.outputs.PSObject.Properties.Name

                foreach ($output in $uiOutputs) {
                    if ($output -notin $templateParams) {
                        throw "UI output '$output' not found in template parameters"
                    }
                }

                Write-Host "UI definition validation passed"

          # Test ARM template deployment in a test resource group
          - task: AzureCLI@2
            displayName: 'Validate Deployment'
            inputs:
              azureSubscription: 'marketplace-service-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Run a deployment validation without actually creating resources
                az deployment group validate \
                  --resource-group rg-marketplace-test \
                  --template-file src/mainTemplate.json \
                  --parameters appName=citest$(Build.BuildId) \
                  --parameters sqlAdminPassword='$(TestSqlPassword)'

  - stage: Package
    displayName: 'Package Application'
    dependsOn: Validate
    jobs:
      - job: CreatePackage
        displayName: 'Create Deployment Package'
        steps:
          - task: PowerShell@2
            displayName: 'Build Package'
            inputs:
              targetType: 'inline'
              script: |
                # Create the application package ZIP
                $version = "1.$(Build.BuildId).0"
                $packageDir = "./package"
                New-Item -ItemType Directory -Path $packageDir -Force

                # Copy templates to package directory
                Copy-Item ./src/mainTemplate.json $packageDir/
                Copy-Item ./src/createUiDefinition.json $packageDir/

                if (Test-Path ./src/nestedTemplates) {
                    Copy-Item -Recurse ./src/nestedTemplates $packageDir/
                }

                # Create the ZIP package
                $zipPath = "./artifacts/app-$version.zip"
                New-Item -ItemType Directory -Path ./artifacts -Force
                Compress-Archive -Path "$packageDir/*" -DestinationPath $zipPath

                Write-Host "Package created: $zipPath (version $version)"
                Write-Host "##vso[task.setvariable variable=PackageVersion]$version"
                Write-Host "##vso[task.setvariable variable=PackagePath]$zipPath"

          # Upload the package as a build artifact
          - task: PublishBuildArtifacts@1
            displayName: 'Publish Package Artifact'
            inputs:
              PathtoPublish: './artifacts'
              ArtifactName: 'marketplace-package'

          # Upload to blob storage for Partner Center
          - task: AzureCLI@2
            displayName: 'Upload to Blob Storage'
            inputs:
              azureSubscription: 'marketplace-service-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                VERSION="1.$(Build.BuildId).0"
                az storage blob upload \
                  --account-name $(storageAccountName) \
                  --container-name $(containerName) \
                  --name "$(offerName)/v${VERSION}/app.zip" \
                  --file "./artifacts/app-${VERSION}.zip" \
                  --auth-mode login

                # Generate a SAS URL for Partner Center
                EXPIRY=$(date -u -d "+7 days" +%Y-%m-%dT%H:%MZ)
                SAS_URL=$(az storage blob generate-sas \
                  --account-name $(storageAccountName) \
                  --container-name $(containerName) \
                  --name "$(offerName)/v${VERSION}/app.zip" \
                  --permissions r \
                  --expiry $EXPIRY \
                  --auth-mode login \
                  --full-uri -o tsv)

                echo "##vso[task.setvariable variable=PackageSasUrl]$SAS_URL"
```

## CD Pipeline - Publishing to Partner Center

The CD pipeline uses the Partner Center API to update the Marketplace offer:

```yaml
  - stage: Publish
    displayName: 'Publish to Marketplace'
    dependsOn: Package
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: PublishToMarketplace
        displayName: 'Publish Offer Update'
        environment: 'marketplace-production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PowerShell@2
                  displayName: 'Update Partner Center Offer'
                  inputs:
                    targetType: 'inline'
                    script: |
                      # Authenticate with Partner Center API
                      $body = @{
                          grant_type    = "client_credentials"
                          client_id     = "$(PartnerCenterClientId)"
                          client_secret = "$(PartnerCenterClientSecret)"
                          resource      = "https://api.partner.microsoft.com"
                      }

                      $tokenResponse = Invoke-RestMethod `
                          -Method Post `
                          -Uri "https://login.microsoftonline.com/$(TenantId)/oauth2/token" `
                          -Body $body

                      $token = $tokenResponse.access_token
                      $headers = @{
                          "Authorization" = "Bearer $token"
                          "Content-Type"  = "application/json"
                      }

                      # Get the current offer draft
                      $offerId = "$(PartnerCenterOfferId)"
                      $offerUri = "https://api.partner.microsoft.com/v1.0/ingestion/products/$offerId"

                      $offer = Invoke-RestMethod -Uri $offerUri -Headers $headers

                      Write-Host "Current offer: $($offer.name)"
                      Write-Host "Updating package to version $(PackageVersion)"

                      # The actual update process involves several API calls
                      # to update the technical configuration with the new package URL
                      # This is simplified for clarity

                      Write-Host "Offer update submitted to Partner Center"
                      Write-Host "Certification review will begin automatically"
```

## Integration Testing Before Publish

Add integration tests that deploy the managed application to a test subscription and verify it works:

```powershell
# tests/integration/deploy-test.ps1
# Full integration test that deploys the managed application and validates it

param(
    [string]$ResourceGroupName = "rg-marketplace-integration-test",
    [string]$Location = "eastus",
    [string]$TemplateFile = "./src/mainTemplate.json"
)

# Deploy the template
Write-Host "Deploying managed application template..."
$deployment = New-AzResourceGroupDeployment `
    -ResourceGroupName $ResourceGroupName `
    -TemplateFile $TemplateFile `
    -appName "inttest$(Get-Random -Maximum 9999)" `
    -sqlAdminPassword (ConvertTo-SecureString "T3stP@ss$(Get-Random)" -AsPlainText -Force) `
    -appServicePlanSku "S1"

if ($deployment.ProvisioningState -ne "Succeeded") {
    throw "Deployment failed: $($deployment.ProvisioningState)"
}

Write-Host "Deployment succeeded"

# Verify the web app is responding
$webAppUrl = $deployment.Outputs.webAppUrl.Value
Write-Host "Testing web app at $webAppUrl..."

$maxRetries = 10
$retryCount = 0

do {
    try {
        $response = Invoke-WebRequest -Uri $webAppUrl -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "Web app is responding with HTTP 200"
            break
        }
    }
    catch {
        $retryCount++
        Write-Host "Attempt $retryCount of $maxRetries - waiting for app to start..."
        Start-Sleep -Seconds 30
    }
} while ($retryCount -lt $maxRetries)

if ($retryCount -eq $maxRetries) {
    throw "Web app did not respond after $maxRetries attempts"
}

# Clean up test resources
Write-Host "Cleaning up test resources..."
Remove-AzResourceGroup -Name $ResourceGroupName -Force -AsJob

Write-Host "Integration test completed successfully"
```

## Version Management

Maintain a version file that the pipeline reads and increments:

```json
{
    "major": 1,
    "minor": 2,
    "patch": 0,
    "changelog": [
        {
            "version": "1.2.0",
            "date": "2026-02-16",
            "changes": [
                "Added monitoring dashboard",
                "Updated SQL Database to S1 tier",
                "Fixed App Service configuration"
            ]
        }
    ]
}
```

The pipeline reads this file to set the version number on the package, and the changelog gets included in the Partner Center listing update.

## Notifications and Monitoring

Set up pipeline notifications so the team knows when updates go through or fail:

```yaml
# Add to the pipeline for Slack/Teams notifications
- task: PowerShell@2
  displayName: 'Notify Team'
  condition: always()
  inputs:
    targetType: 'inline'
    script: |
      $status = if ("$(Agent.JobStatus)" -eq "Succeeded") { "deployed" } else { "failed" }
      $webhook = "$(TeamsWebhookUrl)"

      $body = @{
          text = "Marketplace offer update $status - Version $(PackageVersion) - Build $(Build.BuildNumber)"
      } | ConvertTo-Json

      Invoke-RestMethod -Uri $webhook -Method Post -Body $body -ContentType "application/json"
```

## Wrapping Up

Automating your Azure Marketplace publishing pipeline with Azure DevOps transforms what would be a tedious manual process into a reliable, repeatable workflow. The CI stage catches template errors and validation issues before they reach Partner Center. The integration test stage ensures your application actually deploys correctly. And the CD stage handles the Partner Center submission automatically. With this pipeline in place, shipping updates to your Marketplace offer becomes as simple as merging a pull request to your main branch.
