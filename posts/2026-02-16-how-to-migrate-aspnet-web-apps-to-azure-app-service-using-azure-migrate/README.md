# How to Migrate ASP.NET Web Apps to Azure App Service Using Azure Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, ASP.NET, Azure App Service, Web Migration, Cloud Migration, IIS, PaaS

Description: Step-by-step guide to migrating ASP.NET web applications from on-premises IIS servers to Azure App Service using Azure Migrate web app assessment and migration tools.

---

Running ASP.NET applications on IIS servers in your data center works fine, but managing the underlying infrastructure is a constant tax on your team. Patching Windows, scaling during traffic spikes, managing SSL certificates, dealing with hardware failures - all of this goes away when you move to Azure App Service. Azure Migrate now includes tooling specifically for discovering, assessing, and migrating web applications, making the process much more structured than it used to be.

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
- The Azure Migrate appliance deployed and discovering servers (the same appliance used for server migration)
- Guest OS credentials configured on the appliance for the IIS servers

## Step 1: Enable Web App Discovery

Azure Migrate discovers web apps as part of its software inventory feature. If you have the appliance already running with guest OS credentials configured, web app discovery happens automatically.

1. Go to your Azure Migrate project
2. Navigate to "Servers, databases and web apps"
3. Under "Web apps," you should see discovered IIS web applications

The appliance connects to each Windows server using WMI and queries IIS configuration to discover:

- Web sites and virtual directories
- Application pools and their .NET CLR versions
- Bindings (ports, hostnames, SSL certificates)
- Physical paths
- Authentication settings

If you do not see any web apps, verify that guest credentials are working. The appliance needs local administrator access to query IIS configuration remotely.

## Step 2: Run a Web App Assessment

Create an assessment specifically for web apps to understand readiness and identify issues.

1. In the Azure Migrate project, click "Assess" and select "Azure App Service"
2. Give the assessment a name
3. Configure properties:
   - **Target location**: Choose your preferred Azure region
   - **Pricing tier**: Select the App Service Plan tier (Standard, Premium, Isolated)
   - **Reserved instances**: Enable for cost comparison
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

**File system writes.** Apps that write to the local file system work in App Service, but the storage is ephemeral. For persistent file storage, switch to Azure Blob Storage or mount an Azure File Share.

**Registry access.** App Service does not allow registry access. If your app reads configuration from the registry, move those settings to App Settings or Azure Key Vault.

**COM components.** Not supported in App Service. You will need to find a managed (.NET) replacement or containerize the app.

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

The assessment provides monthly cost estimates based on the App Service Plan tier you selected. It also recommends the minimum plan size needed based on resource consumption patterns observed during discovery.

## Step 4: Prepare the Application

Before migration, make these changes to ensure a smooth landing on App Service:

**Update connection strings.** Replace hardcoded connection strings with environment variables or Azure Key Vault references. App Service lets you set connection strings in the portal that override values in web.config.

**Review web.config.** Remove any settings specific to your on-premises IIS configuration (machine keys, custom module registrations, etc.). App Service has its own web.config processing.

**Test with 64-bit.** If your app runs as 32-bit on-premises, decide whether to keep it 32-bit or switch to 64-bit in App Service. This is configurable in the platform settings.

**Check .NET version.** Verify that your target .NET Framework version is supported by App Service. All .NET Framework versions from 3.5 through 4.8 are supported, as well as .NET 6, 7, and 8.

## Step 5: Migrate Using Azure Migrate

Azure Migrate supports direct migration of ASP.NET apps to App Service using the Azure App Service Migration Assistant, which integrates with the Migrate project.

1. Download the App Service Migration Assistant from the Azure Migrate portal
2. Run it on the IIS server hosting the application
3. Select the web site to migrate
4. The tool performs a readiness check and flags any issues
5. Sign in with your Azure credentials
6. Select the target subscription, resource group, and App Service Plan
7. Click "Migrate"

The assistant packages the application, creates the App Service in Azure, and deploys the code. For a typical ASP.NET MVC application, the migration takes about 5-10 minutes.

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
