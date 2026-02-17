# How to Write Pester Tests for Azure PowerShell Infrastructure Automation Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pester, PowerShell, Azure, Testing, Infrastructure Automation, DevOps, Quality Assurance

Description: Write effective Pester tests for Azure PowerShell infrastructure scripts including unit tests with mocks and integration tests against real Azure resources.

---

If you are using PowerShell to automate Azure infrastructure, you should be testing those scripts with Pester. Pester is the testing framework for PowerShell, and it is built right into Windows and available on all platforms where PowerShell Core runs. It gives you the structure to write unit tests that run in seconds (using mocks instead of real Azure calls) and integration tests that validate your scripts against actual Azure resources.

I have seen too many teams skip testing on their infrastructure scripts because "it is just automation." Then a script change breaks the deployment pipeline at 2 AM and suddenly testing does not seem optional anymore. Pester catches those issues before they escape.

## Pester Basics

If you have not used Pester before, here is the structure. Tests live in `.Tests.ps1` files and use `Describe`, `Context`, and `It` blocks to organize assertions:

```powershell
# Example.Tests.ps1 - Basic Pester test structure
Describe "Math Operations" {
    It "should add two numbers correctly" {
        $result = 2 + 2
        $result | Should -Be 4
    }

    It "should handle negative numbers" {
        $result = -1 + 1
        $result | Should -Be 0
    }
}
```

Install the latest version of Pester:

```powershell
# Install Pester v5 (the latest major version)
Install-Module -Name Pester -Force -SkipPublisherCheck
Import-Module Pester
```

## The Script Under Test

Let me create a realistic PowerShell script that provisions Azure resources, and then we will write tests for it:

```powershell
# Deploy-WebApp.ps1 - Deploy an Azure Web App with supporting resources

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$AppName,

    [Parameter(Mandatory)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter()]
    [string]$Location = 'eastus2',

    [Parameter()]
    [ValidateSet('B1', 'S1', 'P1v3')]
    [string]$SkuName = 'B1'
)

# Build resource names from the inputs
function Get-ResourceNames {
    param(
        [string]$AppName,
        [string]$Environment
    )
    return @{
        ResourceGroup  = "rg-$AppName-$Environment"
        AppServicePlan = "asp-$AppName-$Environment"
        WebApp         = "app-$AppName-$Environment"
        StorageAccount = "st$($AppName.Replace('-',''))$Environment"
    }
}

# Validate that the resource group exists or create it
function Ensure-ResourceGroup {
    param(
        [string]$Name,
        [string]$Location,
        [hashtable]$Tags
    )

    $rg = Get-AzResourceGroup -Name $Name -ErrorAction SilentlyContinue
    if (-not $rg) {
        Write-Verbose "Creating resource group: $Name"
        $rg = New-AzResourceGroup -Name $Name -Location $Location -Tag $Tags
    }
    return $rg
}

# Deploy the App Service Plan
function Deploy-AppServicePlan {
    param(
        [string]$Name,
        [string]$ResourceGroupName,
        [string]$Location,
        [string]$SkuName
    )

    $plan = Get-AzAppServicePlan -Name $Name -ResourceGroupName $ResourceGroupName -ErrorAction SilentlyContinue
    if (-not $plan) {
        Write-Verbose "Creating App Service Plan: $Name with SKU $SkuName"
        $plan = New-AzAppServicePlan `
            -Name $Name `
            -ResourceGroupName $ResourceGroupName `
            -Location $Location `
            -Tier $(if ($SkuName -match '^B') { 'Basic' } elseif ($SkuName -match '^S') { 'Standard' } else { 'PremiumV3' }) `
            -Linux
    }
    return $plan
}

# Deploy the Web App
function Deploy-WebApp {
    param(
        [string]$Name,
        [string]$ResourceGroupName,
        [string]$AppServicePlanId,
        [string]$Environment
    )

    $app = Get-AzWebApp -Name $Name -ResourceGroupName $ResourceGroupName -ErrorAction SilentlyContinue
    if (-not $app) {
        Write-Verbose "Creating Web App: $Name"
        $app = New-AzWebApp `
            -Name $Name `
            -ResourceGroupName $ResourceGroupName `
            -AppServicePlan $AppServicePlanId
    }

    # Configure app settings
    $settings = @{
        "ENVIRONMENT" = $Environment
        "WEBSITE_RUN_FROM_PACKAGE" = "1"
    }
    Set-AzWebApp -Name $Name -ResourceGroupName $ResourceGroupName -AppSettings $settings

    return $app
}

# Main execution
$names = Get-ResourceNames -AppName $AppName -Environment $Environment

$tags = @{
    Environment = $Environment
    Application = $AppName
    ManagedBy   = "PowerShell"
}

$rg = Ensure-ResourceGroup -Name $names.ResourceGroup -Location $Location -Tags $tags
$plan = Deploy-AppServicePlan -Name $names.AppServicePlan -ResourceGroupName $names.ResourceGroup -Location $Location -SkuName $SkuName
$app = Deploy-WebApp -Name $names.WebApp -ResourceGroupName $names.ResourceGroup -AppServicePlanId $plan.Id -Environment $Environment

Write-Output "Deployment complete: $($app.DefaultHostName)"
```

## Writing Unit Tests with Mocks

Unit tests should run fast without touching Azure. We achieve this by mocking the Azure PowerShell cmdlets:

```powershell
# Deploy-WebApp.Tests.ps1 - Pester tests for the deployment script

BeforeAll {
    # Dot-source the script to make its functions available
    . $PSScriptRoot/Deploy-WebApp.ps1 -AppName "test" -Environment "dev" -ErrorAction SilentlyContinue
}

Describe "Get-ResourceNames" {
    It "should generate correct resource group name" {
        $names = Get-ResourceNames -AppName "myapp" -Environment "prod"
        $names.ResourceGroup | Should -Be "rg-myapp-prod"
    }

    It "should generate correct App Service Plan name" {
        $names = Get-ResourceNames -AppName "myapp" -Environment "staging"
        $names.AppServicePlan | Should -Be "asp-myapp-staging"
    }

    It "should generate storage account name without hyphens" {
        $names = Get-ResourceNames -AppName "my-app" -Environment "dev"
        $names.StorageAccount | Should -Be "stmyappdev"
    }

    It "should handle different environments correctly" {
        $devNames = Get-ResourceNames -AppName "api" -Environment "dev"
        $prodNames = Get-ResourceNames -AppName "api" -Environment "prod"

        $devNames.ResourceGroup | Should -Not -Be $prodNames.ResourceGroup
        $devNames.WebApp | Should -Not -Be $prodNames.WebApp
    }
}

Describe "Ensure-ResourceGroup" {
    Context "when resource group already exists" {
        BeforeAll {
            # Mock Get-AzResourceGroup to return an existing RG
            Mock Get-AzResourceGroup {
                return @{
                    ResourceGroupName = "rg-myapp-dev"
                    Location          = "eastus2"
                    Tags              = @{ Environment = "dev" }
                }
            }

            # Mock New-AzResourceGroup - should NOT be called
            Mock New-AzResourceGroup
        }

        It "should return the existing resource group" {
            $result = Ensure-ResourceGroup -Name "rg-myapp-dev" -Location "eastus2" -Tags @{}
            $result.ResourceGroupName | Should -Be "rg-myapp-dev"
        }

        It "should not create a new resource group" {
            Ensure-ResourceGroup -Name "rg-myapp-dev" -Location "eastus2" -Tags @{}
            Should -Invoke New-AzResourceGroup -Times 0
        }
    }

    Context "when resource group does not exist" {
        BeforeAll {
            # Mock Get-AzResourceGroup to return nothing (RG does not exist)
            Mock Get-AzResourceGroup { return $null }

            # Mock New-AzResourceGroup to return a new RG
            Mock New-AzResourceGroup {
                return @{
                    ResourceGroupName = $Name
                    Location          = $Location
                    Tags              = $Tag
                }
            }
        }

        It "should create a new resource group" {
            Ensure-ResourceGroup -Name "rg-myapp-dev" -Location "eastus2" -Tags @{ Environment = "dev" }
            Should -Invoke New-AzResourceGroup -Times 1 -ParameterFilter {
                $Name -eq "rg-myapp-dev" -and $Location -eq "eastus2"
            }
        }

        It "should pass tags to the new resource group" {
            $tags = @{ Environment = "prod"; Owner = "team@company.com" }
            Ensure-ResourceGroup -Name "rg-myapp-prod" -Location "westus2" -Tags $tags
            Should -Invoke New-AzResourceGroup -ParameterFilter {
                $Tag.Environment -eq "prod"
            }
        }
    }
}

Describe "Deploy-AppServicePlan" {
    Context "when the plan does not exist" {
        BeforeAll {
            Mock Get-AzAppServicePlan { return $null }
            Mock New-AzAppServicePlan {
                return @{
                    Name = $Name
                    Id   = "/subscriptions/xxx/resourceGroups/$ResourceGroupName/providers/Microsoft.Web/serverfarms/$Name"
                }
            }
        }

        It "should create a new plan with the Basic tier for B-series SKUs" {
            Deploy-AppServicePlan -Name "asp-test-dev" -ResourceGroupName "rg-test" -Location "eastus2" -SkuName "B1"
            Should -Invoke New-AzAppServicePlan -ParameterFilter {
                $Tier -eq "Basic"
            }
        }

        It "should create a plan with Standard tier for S-series SKUs" {
            Deploy-AppServicePlan -Name "asp-test-stg" -ResourceGroupName "rg-test" -Location "eastus2" -SkuName "S1"
            Should -Invoke New-AzAppServicePlan -ParameterFilter {
                $Tier -eq "Standard"
            }
        }

        It "should create a plan with PremiumV3 tier for P-series SKUs" {
            Deploy-AppServicePlan -Name "asp-test-prod" -ResourceGroupName "rg-test" -Location "eastus2" -SkuName "P1v3"
            Should -Invoke New-AzAppServicePlan -ParameterFilter {
                $Tier -eq "PremiumV3"
            }
        }
    }
}

Describe "Deploy-WebApp" {
    Context "when creating a new web app" {
        BeforeAll {
            Mock Get-AzWebApp { return $null }
            Mock New-AzWebApp {
                return @{
                    Name            = $Name
                    DefaultHostName = "$Name.azurewebsites.net"
                }
            }
            Mock Set-AzWebApp { return $null }
        }

        It "should create the web app" {
            Deploy-WebApp -Name "app-test-dev" -ResourceGroupName "rg-test" -AppServicePlanId "/sub/rg/plan" -Environment "dev"
            Should -Invoke New-AzWebApp -Times 1
        }

        It "should configure environment-specific app settings" {
            Deploy-WebApp -Name "app-test-prod" -ResourceGroupName "rg-test" -AppServicePlanId "/sub/rg/plan" -Environment "prod"
            Should -Invoke Set-AzWebApp -ParameterFilter {
                $AppSettings.ENVIRONMENT -eq "prod"
            }
        }
    }
}
```

## Running the Tests

```powershell
# Run all tests in the current directory
Invoke-Pester -Path ./Deploy-WebApp.Tests.ps1 -Output Detailed

# Run with code coverage reporting
$config = New-PesterConfiguration
$config.Run.Path = "./Deploy-WebApp.Tests.ps1"
$config.CodeCoverage.Enabled = $true
$config.CodeCoverage.Path = "./Deploy-WebApp.ps1"
$config.Output.Verbosity = "Detailed"
Invoke-Pester -Configuration $config
```

## Writing Integration Tests

Integration tests deploy real resources and validate them. They are slower and cost money, but they catch issues that unit tests cannot:

```powershell
# Deploy-WebApp.Integration.Tests.ps1 - Integration tests against real Azure

BeforeAll {
    # Generate unique names to avoid conflicts
    $script:testId = Get-Random -Maximum 9999
    $script:appName = "pestertest$($script:testId)"
    $script:environment = "test"
    $script:resourceGroup = "rg-$($script:appName)-$($script:environment)"
    $script:location = "eastus2"
}

Describe "Azure Web App Deployment - Integration" -Tag "Integration" {
    It "should deploy successfully" {
        # Run the actual deployment script
        $result = & ./Deploy-WebApp.ps1 `
            -AppName $script:appName `
            -Environment $script:environment `
            -Location $script:location `
            -SkuName "B1" `
            -Verbose

        $result | Should -Not -BeNullOrEmpty
    }

    It "should create the resource group" {
        $rg = Get-AzResourceGroup -Name $script:resourceGroup -ErrorAction SilentlyContinue
        $rg | Should -Not -BeNullOrEmpty
        $rg.Location | Should -Be $script:location
    }

    It "should create the resource group with correct tags" {
        $rg = Get-AzResourceGroup -Name $script:resourceGroup
        $rg.Tags["Environment"] | Should -Be $script:environment
        $rg.Tags["ManagedBy"] | Should -Be "PowerShell"
    }

    It "should create the web app with HTTPS enforced" {
        $app = Get-AzWebApp -Name "app-$($script:appName)-$($script:environment)" `
            -ResourceGroupName $script:resourceGroup
        $app | Should -Not -BeNullOrEmpty
        $app.HttpsOnly | Should -Be $true
    }

    It "should have the correct app settings" {
        $app = Get-AzWebApp -Name "app-$($script:appName)-$($script:environment)" `
            -ResourceGroupName $script:resourceGroup
        $settings = $app.SiteConfig.AppSettings | Where-Object { $_.Name -eq "ENVIRONMENT" }
        $settings.Value | Should -Be $script:environment
    }
}

AfterAll {
    # Clean up all test resources
    Write-Verbose "Cleaning up resource group: $($script:resourceGroup)"
    Remove-AzResourceGroup -Name $script:resourceGroup -Force -AsJob
}
```

Run integration tests separately from unit tests using tags:

```powershell
# Run only unit tests (fast, no Azure required)
Invoke-Pester -Path ./ -ExcludeTag "Integration" -Output Detailed

# Run only integration tests (slow, requires Azure auth)
Invoke-Pester -Path ./ -Tag "Integration" -Output Detailed
```

## CI/CD Integration

Add Pester tests to your Azure DevOps or GitHub Actions pipeline:

```yaml
# .github/workflows/test-scripts.yml
name: Test PowerShell Scripts

on:
  pull_request:
    paths:
      - '**/*.ps1'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Pester Unit Tests
        shell: pwsh
        run: |
          $config = New-PesterConfiguration
          $config.Run.Path = "./tests"
          $config.Run.Exit = $true
          $config.Filter.ExcludeTag = @("Integration")
          $config.Output.Verbosity = "Detailed"
          $config.TestResult.Enabled = $true
          $config.TestResult.OutputFormat = "JUnitXml"
          $config.TestResult.OutputPath = "test-results.xml"
          $config.CodeCoverage.Enabled = $true
          $config.CodeCoverage.Path = @("./scripts/*.ps1")
          Invoke-Pester -Configuration $config

      - name: Publish Test Results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Pester Tests
          path: test-results.xml
          reporter: java-junit
```

## Testing Tips

A few things I have learned from testing PowerShell Azure scripts:

Always mock Azure cmdlets in unit tests. Real API calls make tests slow, flaky, and expensive. Save real calls for integration tests.

Use `BeforeAll` and `AfterAll` for setup and cleanup. `BeforeEach` and `AfterEach` exist too but are less common for infrastructure tests.

Test error handling explicitly. Azure operations fail for many reasons - throttling, permissions, name conflicts. Verify your scripts handle these:

```powershell
Describe "Error Handling" {
    It "should throw a meaningful error when resource group creation fails" {
        Mock New-AzResourceGroup { throw "Forbidden" }
        Mock Get-AzResourceGroup { return $null }

        { Ensure-ResourceGroup -Name "rg-test" -Location "eastus2" -Tags @{} } |
            Should -Throw "*Forbidden*"
    }
}
```

## Wrapping Up

Pester testing for Azure PowerShell scripts is an investment that pays off quickly. Unit tests with mocks run in seconds and catch logic errors. Integration tests against real Azure resources catch API and permission issues. Together, they give you confidence that your automation scripts work correctly before they run in production. Start with unit tests for your core functions, add integration tests for critical paths, and run everything in your CI/CD pipeline on every pull request.
