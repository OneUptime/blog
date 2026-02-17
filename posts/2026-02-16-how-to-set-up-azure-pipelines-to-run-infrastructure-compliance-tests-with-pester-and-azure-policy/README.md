# How to Set Up Azure Pipelines to Run Infrastructure Compliance Tests with Pester and Azure Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Pester, Azure Policy, Compliance Testing, Infrastructure as Code, PowerShell, DevOps

Description: Learn how to integrate Pester tests and Azure Policy compliance checks into your Azure Pipelines to catch infrastructure violations before they reach production.

---

Deploying infrastructure without compliance testing is like shipping code without unit tests. It might work today, but eventually something will violate a policy, and you will find out in the worst possible way - a security audit, a production outage, or a billing surprise. Azure Policy enforces rules at the platform level, but catching violations before deployment is much better than remediating them after.

Pester is the testing framework for PowerShell, and it pairs naturally with Azure infrastructure validation. You write tests that verify your deployed resources match your compliance requirements, run them in an Azure Pipeline, and block deployments that fail. Combined with Azure Policy compliance data, you get a comprehensive compliance gate in your CI/CD pipeline.

## Why Pester for Infrastructure Testing?

Pester gives you a familiar testing syntax if you have worked with any xUnit-style framework. You write Describe blocks for test suites, It blocks for individual assertions, and Should for expectations. The difference is that instead of testing application code, you are testing Azure resource configurations.

The big advantage over just relying on Azure Policy is timing. Azure Policy evaluates resources after they exist. Pester tests in a pipeline can validate templates before deployment and verify resource state immediately after deployment, giving you a faster feedback loop.

## Setting Up the Pester Test Project

Create a directory structure for your infrastructure tests alongside your IaC templates.

```
infrastructure/
  templates/
    main.bicep
    modules/
  tests/
    Compliance.Tests.ps1
    NetworkSecurity.Tests.ps1
    TagPolicy.Tests.ps1
  azure-pipelines.yml
```

Here is a basic Pester test file that checks resource tagging compliance.

```powershell
# TagPolicy.Tests.ps1
# Validates that all resources in the target resource group have required tags

param(
    [Parameter(Mandatory)]
    [string]$ResourceGroupName
)

Describe "Tag Compliance for Resource Group: $ResourceGroupName" {

    # Get all resources before running tests
    BeforeAll {
        $resources = Get-AzResource -ResourceGroupName $ResourceGroupName
    }

    It "Should have at least one resource in the resource group" {
        $resources.Count | Should -BeGreaterThan 0
    }

    Context "Required Tags" {
        foreach ($resource in $resources) {
            It "Resource '$($resource.Name)' should have an 'Environment' tag" {
                $resource.Tags.Keys | Should -Contain 'Environment'
            }

            It "Resource '$($resource.Name)' should have a 'CostCenter' tag" {
                $resource.Tags.Keys | Should -Contain 'CostCenter'
            }

            It "Resource '$($resource.Name)' should have an 'Owner' tag" {
                $resource.Tags.Keys | Should -Contain 'Owner'
            }
        }
    }

    Context "Tag Values" {
        $validEnvironments = @('dev', 'staging', 'production')

        foreach ($resource in $resources) {
            It "Resource '$($resource.Name)' should have a valid Environment tag value" {
                $resource.Tags['Environment'] | Should -BeIn $validEnvironments
            }
        }
    }
}
```

## Network Security Compliance Tests

Network security is one of the most common compliance requirements. Here is a Pester test that validates NSG rules and public access settings.

```powershell
# NetworkSecurity.Tests.ps1
# Validates network security group rules and public endpoint configurations

param(
    [Parameter(Mandatory)]
    [string]$ResourceGroupName
)

Describe "Network Security Compliance for: $ResourceGroupName" {

    Context "Network Security Groups" {
        BeforeAll {
            $nsgs = Get-AzNetworkSecurityGroup -ResourceGroupName $ResourceGroupName
        }

        foreach ($nsg in $nsgs) {
            It "NSG '$($nsg.Name)' should not allow inbound SSH from any source" {
                # Check that no rule allows SSH (port 22) from 0.0.0.0/0
                $sshRules = $nsg.SecurityRules | Where-Object {
                    $_.DestinationPortRange -eq '22' -and
                    $_.SourceAddressPrefix -eq '*' -and
                    $_.Access -eq 'Allow' -and
                    $_.Direction -eq 'Inbound'
                }
                $sshRules | Should -BeNullOrEmpty
            }

            It "NSG '$($nsg.Name)' should not allow inbound RDP from any source" {
                $rdpRules = $nsg.SecurityRules | Where-Object {
                    $_.DestinationPortRange -eq '3389' -and
                    $_.SourceAddressPrefix -eq '*' -and
                    $_.Access -eq 'Allow' -and
                    $_.Direction -eq 'Inbound'
                }
                $rdpRules | Should -BeNullOrEmpty
            }
        }
    }

    Context "Storage Account Public Access" {
        BeforeAll {
            $storageAccounts = Get-AzStorageAccount -ResourceGroupName $ResourceGroupName
        }

        foreach ($sa in $storageAccounts) {
            It "Storage account '$($sa.StorageAccountName)' should have public blob access disabled" {
                $sa.AllowBlobPublicAccess | Should -BeFalse
            }

            It "Storage account '$($sa.StorageAccountName)' should require HTTPS" {
                $sa.EnableHttpsTrafficOnly | Should -BeTrue
            }

            It "Storage account '$($sa.StorageAccountName)' should use TLS 1.2 minimum" {
                $sa.MinimumTlsVersion | Should -Be 'TLS1_2'
            }
        }
    }
}
```

## Integrating Azure Policy Compliance Checks

Beyond custom Pester tests, you can query Azure Policy compliance state directly. This lets you validate that resources comply with all assigned policies.

```powershell
# PolicyCompliance.Tests.ps1
# Checks Azure Policy compliance state for the resource group

param(
    [Parameter(Mandatory)]
    [string]$ResourceGroupName,
    [Parameter()]
    [string]$SubscriptionId
)

Describe "Azure Policy Compliance for: $ResourceGroupName" {

    BeforeAll {
        # Get the resource group scope for policy compliance query
        $rgScope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName"

        # Get all non-compliant policy states
        $nonCompliant = Get-AzPolicyState `
            -ResourceGroupName $ResourceGroupName `
            -Filter "ComplianceState eq 'NonCompliant'" `
            -Top 100
    }

    It "Should have zero non-compliant resources" {
        $nonCompliant.Count | Should -Be 0 -Because "all resources must comply with assigned policies"
    }

    Context "Non-Compliant Details" {
        if ($nonCompliant.Count -gt 0) {
            foreach ($state in $nonCompliant) {
                It "Resource '$($state.ResourceId)' violates policy '$($state.PolicyDefinitionName)'" {
                    # This test is designed to fail and show the violation details
                    $false | Should -BeTrue -Because `
                        "Policy: $($state.PolicyDefinitionName), Effect: $($state.PolicyDefinitionAction)"
                }
            }
        }
    }
}
```

## The Azure Pipeline Configuration

Now tie everything together in an Azure Pipeline that deploys infrastructure and then runs the compliance tests.

```yaml
# azure-pipelines.yml - Deploy infrastructure and run compliance tests
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  resourceGroupName: 'my-app-rg'
  location: 'eastus'
  azureSubscription: 'Azure-Production-Connection'

stages:
  # Stage 1: Deploy the infrastructure
  - stage: Deploy
    displayName: 'Deploy Infrastructure'
    jobs:
      - job: DeployBicep
        steps:
          - task: AzureCLI@2
            displayName: 'Deploy Bicep Template'
            inputs:
              azureSubscription: $(azureSubscription)
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Deploy the infrastructure template
                az deployment group create \
                  --resource-group $(resourceGroupName) \
                  --template-file infrastructure/templates/main.bicep \
                  --parameters environment=staging

  # Stage 2: Run compliance tests
  - stage: ComplianceTests
    displayName: 'Infrastructure Compliance Tests'
    dependsOn: Deploy
    jobs:
      - job: RunPesterTests
        steps:
          # Install Pester if not already available
          - task: PowerShell@2
            displayName: 'Install Pester Module'
            inputs:
              targetType: 'inline'
              script: |
                # Install the latest version of Pester
                Install-Module -Name Pester -Force -Scope CurrentUser -MinimumVersion 5.0
                Import-Module Pester

          - task: AzurePowerShell@5
            displayName: 'Run Tag Compliance Tests'
            inputs:
              azureSubscription: $(azureSubscription)
              ScriptType: 'InlineScript'
              Inline: |
                # Import Pester and run tag compliance tests
                Import-Module Pester

                $config = New-PesterConfiguration
                $config.Run.Path = "$(Build.SourcesDirectory)/infrastructure/tests/TagPolicy.Tests.ps1"
                $config.Run.PassThru = $true
                $config.TestResult.Enabled = $true
                $config.TestResult.OutputPath = "$(Build.SourcesDirectory)/tag-results.xml"
                $config.TestResult.OutputFormat = 'NUnitXml'
                $config.Output.Verbosity = 'Detailed'

                # Pass parameters to the test script
                $container = New-PesterContainer `
                  -Path "$(Build.SourcesDirectory)/infrastructure/tests/TagPolicy.Tests.ps1" `
                  -Data @{ ResourceGroupName = '$(resourceGroupName)' }
                $config.Run.Container = $container

                $results = Invoke-Pester -Configuration $config

                # Fail the pipeline if any tests failed
                if ($results.FailedCount -gt 0) {
                    Write-Error "Tag compliance tests failed: $($results.FailedCount) failures"
                    exit 1
                }
              azurePowerShellVersion: 'LatestVersion'

          # Publish test results to Azure DevOps
          - task: PublishTestResults@2
            displayName: 'Publish Compliance Test Results'
            inputs:
              testResultsFormat: 'NUnit'
              testResultsFiles: '**/*-results.xml'
              mergeTestResults: true
              testRunTitle: 'Infrastructure Compliance Tests'
            condition: always()

  # Stage 3: Only proceed if compliance passes
  - stage: Production
    displayName: 'Production Deployment'
    dependsOn: ComplianceTests
    condition: succeeded()
    jobs:
      - deployment: DeployProd
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to production..."
```

## Handling Test Failures

When compliance tests fail, the pipeline stops and the test results appear in the Azure DevOps test tab. Each failed test shows exactly which resource violated which rule, making remediation straightforward.

For teams that need more flexibility, you can configure certain tests as warnings rather than failures. Use Pester tags to categorize tests by severity.

```powershell
# Use tags to categorize test severity
Describe "Encryption Compliance" -Tag "Critical" {
    It "SQL Server should have TDE enabled" -Tag "Critical" {
        # Critical tests block deployment
    }
}

Describe "Naming Convention" -Tag "Warning" {
    It "Resources should follow naming convention" -Tag "Warning" {
        # Warning tests generate alerts but do not block
    }
}
```

Then in your pipeline, run critical and warning tests separately with different failure behavior.

## Running Pre-Deployment Template Validation

You can also run Pester tests against your ARM/Bicep templates before deployment to catch issues early. This validates the template structure and parameter values without touching any Azure resources.

```powershell
# TemplateValidation.Tests.ps1
# Validates Bicep template structure before deployment

Describe "Template Pre-Deployment Validation" {
    It "Bicep template should compile without errors" {
        $result = az bicep build --file infrastructure/templates/main.bicep 2>&1
        $LASTEXITCODE | Should -Be 0
    }

    It "Template should pass Azure validation" {
        $result = az deployment group validate `
            --resource-group "my-app-rg" `
            --template-file infrastructure/templates/main.bicep `
            --parameters environment=staging 2>&1
        $LASTEXITCODE | Should -Be 0
    }
}
```

Combining Pester tests with Azure Policy compliance checks in your pipeline creates a layered defense against infrastructure drift and policy violations. Pester catches issues at deployment time, Azure Policy catches ongoing drift, and together they keep your infrastructure in a known-good state. The pipeline becomes your compliance gate, and passing it means your infrastructure meets every standard your organization has defined.
