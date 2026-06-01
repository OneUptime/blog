# How to Migrate ASP.NET Web Apps to Azure App Service Using Azure Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, ASP.NET, Azure App Service, Web Migration, Cloud Migration, IIS, PaaS

Description: Step-by-step guide to migrating ASP.NET web applications from on-premises IIS servers to Azure App Service using Azure Migrate web app assessment and migration tools.

---

Running ASP.NET applications on IIS servers in your data center works fine, but managing the underlying infrastructure is a constant tax on your team. Patching Windows, scaling during traffic spikes, managing SSL certificates, dealing with hardware failures - much of this goes away when you move to Azure App Service. Azure Migrate now includes tooling specifically for discovering, assessing, and migrating web applications, making the process much more structured than it used to be.

This guide walks through how to use Azure Migrate to move ASP.NET web apps from on-premises IIS to Azure App Service.

## Why Azure App Service

App Service is a fully managed PaaS offering for hosting web applications. Compared to running IIS on VMs (even Azure VMs), you get:

- Automatic OS patching and runtime updates
- Built-in autoscaling based on metrics or schedules
- Integrated CI/CD with GitHub, Azure DevOps, or Bitbucket
- Managed SSL certificates with auto-renewal
- Built-in authentication and authorization
- Deployment slots for zero-downtime releases
- Per-app scaling within App Service Plans

The trade-off is less control over the underlying OS. If your app requires custom Windows components, COM objects, or GAC assemblies, you may need to containerize it or stick with VMs.

## Prerequisites

Before starting, ensure you have:

- ASP.NET applications running on IIS (Windows Server 2008 R2 or later)
- .NET Framework 3.5 or later (or .NET Core/.NET 5+)
- An Azure subscription
- An Azure Migrate project
- The Azure Migrate appliance deployed or upgraded and discovering servers (the same appliance used for server discovery and assessment)
- Guest OS credentials configured on the appliance for the IIS servers

## Step 1: Enable Web App Discovery

Azure Migrate discovers web apps as part of its software inventory feature. If you have the appliance already running with guest OS credentials configured, web app discovery happens automatically.

1. Go to your Azure Migrate project
2. Navigate to "Servers, databases and web apps"
3. Under "Web apps," you should see discovered IIS web applications

The appliance connects to each Windows server using WinRM and PowerShell remoting, then reads IIS configuration to discover:

- Web sites and virtual directories
- Application pools and their .NET CLR versions
- Bindings (ports, hostnames, SSL certificates)
- Physical paths
- Authentication settings

If you do not see any web apps, verify that guest credentials are working. Microsoft documents local administrator access as supported, and the least-privileged option requires membership in Remote Management Users and IIS_IUSRS plus read permissions on the IIS configuration files.

## Step 2: Run a Web App Assessment

Create an assessment specifically for web apps to understand readiness and identify issues.

1. In the Azure Migrate project, click "Assess" and select "Azure App Service"
2. Give the assessment a name
3. Configure properties:
   - **Target location**: Choose your preferred Azure region
   - **Isolation required**: Choose whether the apps need a private, dedicated App Service Environment
   - **Savings options**: Choose pay-as-you-go, reservations, or an Azure savings plan for cost comparison
4. Select the web apps to include
5. Run the assessment

The assessment evaluates each web app against App Service capabilities and flags potential issues.

## Step 3: Review Assessment Results

The assessment report for each web app shows:

### Readiness Status

- **Ready** - The app can move to App Service as-is
- **Conditionally ready** - Minor changes needed
- **Not ready** - Significant issues that require remediation
- **Unknown** - Insufficient data

### Common Issues and How to Fix Them

**Custom IIS modules or ISAPI filters.** App Service supports some native IIS modules but not custom ones. Check whether the module has an equivalent NuGet package or middleware for ASP.NET Core.

**Windows Authentication with Kerberos.** App Service supports Azure AD authentication, but Kerberos delegation to back-end resources requires additional configuration. Consider using Azure AD with Application Proxy.

**File system writes.** Apps can write to the App Service content directory under `%HOME%`, which is backed by Azure Storage and persists across restarts. Temporary local storage under `%SystemDrive%\local` is not persistent across restarts and is not shared across instances. For larger or application-owned file storage, switch to Azure Blob Storage or mount an Azure File Share.

**Registry access.** App Service allows read-only access to much of the registry, but write access is blocked and apps cannot rely on registry state for configuration. If your app reads configuration from the registry, move those settings to App Settings or Azure Key Vault.

**COM components.** App Service can call some in-process COM components that are already registered on the Windows image, but you cannot install and register arbitrary custom COM components on the worker. You will need to find a managed (.NET) replacement or containerize the app.

Here is an example of how to refactor a file-system-dependent configuration to use App Settings:

```csharp
// Before: Reading configuration from a local file or registry
// var configPath = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\MyApp", "ConfigPath", "");
// var settings = File.ReadAllText(configPath);

// After: Reading configuration from Azure App Service App Settings
// Access environment variables set in the App Service Configuration blade
public class AppConfig
{
    // Azure App Service injects App Settings as environment variables
    public static string DatabaseConnection =>
        Environment.GetEnvironmentVariable("SQLAZURECONNSTR_DefaultConnection")
        ?? "Server=localhost;Database=MyApp;Trusted_Connection=True;";

    public static string StorageConnection =>
        Environment.GetEnvironmentVariable("CUSTOMCONNSTR_StorageAccount")
        ?? "UseDevelopmentStorage=true";

    public static string ApiKey =>
        Environment.GetEnvironmentVariable("APPSETTING_ExternalApiKey")
        ?? "dev-key";
}
```

### Cost Estimates

The assessment provides monthly cost estimates based on the recommended App Service SKU and the savings option you selected. The Azure App Service assessment is configuration-based; Azure Migrate does not collect web app performance data for this assessment.

## Step 4: Prepare the Application

Before migration, make these changes to ensure a smooth landing on App Service:

**Update connection strings.** Replace hardcoded connection strings with environment variables or Azure Key Vault references. App Service lets you set connection strings in the portal that override values in web.config.

**Review web.config.** Remove any settings specific to your on-premises IIS configuration (machine keys, custom module registrations, etc.). App Service has its own web.config processing.

**Test with 64-bit.** If your app runs as 32-bit on-premises, decide whether to keep it 32-bit or switch to 64-bit in App Service. This is configurable in the platform settings.

**Check .NET version.** Verify that your target runtime is supported by App Service in your region. App Service uses CLR 2 for .NET Framework 3.5 and CLR 4 for .NET Framework 4.x, and newer .NET versions are supported according to the current App Service runtime stack list. If the runtime your application requires is not supported, deploy it with a custom container.

## Step 5: Migrate Using Azure Migrate

Azure Migrate supports direct migration of assessed ASP.NET apps to App Service using the integrated migration flow in the Azure Migrate project.

1. In the Azure Migrate project, go to **Execute > Migration** and select **Replicate**
2. For the migration intent, select **ASP.NET web apps**
3. Select **Azure App Service native** as the target
4. Choose the assessment you want to use for migration
5. Select the subscription, resource group, region, and intermediate storage account
6. Review the web apps, App Service Plans, and pricing tiers that will be created
7. Validate the settings and click **Migrate**

The integrated flow packages the application, creates the App Service resources in Azure, and deploys the code. Microsoft documents some current limits: apps must be assessed before migration, the flow does not support selecting existing App Service Plans, and each migrated web app can be up to 2 GB including content stored in mapped virtual directories.

Alternatively, for more control over the process, you can use Azure DevOps or GitHub Actions to deploy:

```yaml
# GitHub Actions workflow for deploying ASP.NET app to Azure App Service

# This workflow builds the project and deploys it on every push to main
name: Deploy to Azure App Service

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: windows-latest
    steps:
      # Check out the repository code
      - uses: actions/checkout@v4

      # Set up .NET SDK
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      # Build the application in Release configuration
      - name: Build
        run: dotnet publish -c Release -o ./publish

      # Deploy to Azure App Service using publish profile
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'my-migrated-app'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./publish
```

## Step 6: Configure App Service Settings

After deployment, configure the App Service to match your production requirements:

**Custom domain and SSL.** Add your domain name and configure SSL. App Service supports free managed certificates or you can upload your own.

**Application settings.** Migrate environment-specific settings from your on-premises web.config to App Service Configuration. These are injected as environment variables at runtime.

**Scaling rules.** Set up autoscaling based on CPU, memory, or request count:

```json
{
    "rules": [
        {
            "metricTrigger": {
                "metricName": "CpuPercentage",
                "operator": "GreaterThan",
                "threshold": 70,
                "timeAggregation": "Average",
                "timeWindow": "PT5M"
            },
            "scaleAction": {
                "direction": "Increase",
                "type": "ChangeCount",
                "value": "1",
                "cooldown": "PT10M"
            }
        }
    ]
}
```

**Health check.** Enable the health check feature and point it to a health endpoint in your application. App Service uses this to detect unhealthy instances and route traffic away from them.

**Deployment slots.** Create a staging slot for zero-downtime deployments. Deploy to staging, verify, then swap to production.

## Step 7: Validate and Monitor

After migration, validate that everything works:

1. Test all application functionality through the App Service URL
2. Verify database connectivity from App Service to Azure SQL (if databases were also migrated)
3. Check Application Insights for errors or performance anomalies
4. Run load tests to validate scaling behavior
5. Verify that custom domains and SSL certificates are working

Enable Application Insights for ongoing monitoring. It gives you request rates, response times, failure rates, and dependency tracking out of the box.

## Wrapping Up

Migrating ASP.NET apps from IIS to Azure App Service eliminates infrastructure management overhead and gives you a modern hosting platform with built-in scaling, monitoring, and deployment capabilities. The Azure Migrate assessment tells you upfront what will work and what needs fixing, so there are no surprises during migration. Take the time to address compatibility issues before migrating, configure App Service settings properly after deployment, and you will end up with a more maintainable and scalable application setup than what you had on-premises.
