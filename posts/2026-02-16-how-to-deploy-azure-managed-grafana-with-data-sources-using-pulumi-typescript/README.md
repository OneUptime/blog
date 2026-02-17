# How to Deploy Azure Managed Grafana with Data Sources Using Pulumi TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Grafana, Pulumi, TypeScript, Monitoring, Infrastructure as Code, Observability

Description: Deploy Azure Managed Grafana with pre-configured data sources for Azure Monitor and Prometheus using Pulumi and TypeScript for observability dashboards.

---

Azure Managed Grafana takes the operational burden out of running Grafana. You get a fully managed instance with automatic updates, built-in Azure AD authentication, and native integration with Azure Monitor and Azure Managed Prometheus. Setting it up through the portal is quick for a one-off, but if you need consistent Grafana deployments across environments with pre-configured data sources and role assignments, infrastructure as code is the way to go.

Pulumi with TypeScript is a strong choice for this because the Grafana API itself is well-typed and you can use regular programming constructs to configure data sources, dashboards, and permissions. This post walks through a complete deployment of Azure Managed Grafana with data sources and RBAC using Pulumi.

## What Azure Managed Grafana Provides

Before diving into code, here is what you get with the managed service:

- Grafana 10.x with automatic minor version updates
- Azure Active Directory integration for authentication (no separate Grafana user database)
- Built-in data source plugins for Azure Monitor, Azure Data Explorer, and Prometheus
- Managed identity for secure access to Azure data sources without storing credentials
- Zone redundancy in the Standard tier

The two available tiers are Essential and Standard. Essential is cheaper but lacks features like zone redundancy, SMTP configuration, and enterprise plugins. For production monitoring, Standard is the right pick.

## Pulumi Project Setup

Start by creating a new Pulumi project or adding to an existing one.

```bash
# Create a new Pulumi project with TypeScript
pulumi new azure-typescript --name grafana-infra

# Install additional packages for Grafana configuration
npm install @pulumi/azuread
```

## Main Infrastructure Code

Here is the complete Pulumi program that creates the Managed Grafana instance with supporting resources.

```typescript
// index.ts - Azure Managed Grafana deployment with Pulumi TypeScript

import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as azuread from "@pulumi/azuread";

// Configuration
const config = new pulumi.Config();
const environment = config.get("environment") || "prod";
const location = config.get("location") || "eastus2";

// Common tags applied to all resources
const tags: Record<string, string> = {
    Environment: environment,
    ManagedBy: "pulumi",
    Service: "observability",
};

// Resource group for all monitoring resources
const resourceGroup = new azure.resources.ResourceGroup("rg-monitoring", {
    resourceGroupName: `rg-monitoring-${environment}`,
    location: location,
    tags: tags,
});
```

## Log Analytics Workspace

Grafana needs a data source to visualize. Azure Monitor Logs (Log Analytics) is one of the most common. Create a workspace that Grafana will connect to.

```typescript
// Log Analytics workspace - a primary data source for Grafana
const logAnalytics = new azure.operationalinsights.Workspace("log-analytics", {
    workspaceName: `log-monitoring-${environment}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: "PerGB2018",
    },
    retentionInDays: 30,
    tags: tags,
});

// Azure Monitor workspace for Prometheus metrics
const prometheusWorkspace = new azure.monitor.AzureMonitorWorkspace("prometheus", {
    azureMonitorWorkspaceName: `prom-monitoring-${environment}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    tags: tags,
});
```

## Managed Grafana Instance

The Grafana resource itself is created through the `azure-native` dashboard provider. The API version for Managed Grafana has stabilized, making it straightforward to deploy.

```typescript
// Azure Managed Grafana instance
const grafana = new azure.dashboard.GrafanaResource("grafana", {
    workspaceName: `grafana-${environment}`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,

    // Standard tier for production features
    sku: {
        name: "Standard",
    },

    // Managed identity for accessing Azure data sources
    identity: {
        type: "SystemAssigned",
    },

    properties: {
        // Zone redundancy for high availability
        zoneRedundancy: "Enabled",

        // API key creation - useful for automation
        apiKey: "Enabled",

        // Deterministic outbound IP for firewall rules
        deterministicOutboundIP: "Enabled",

        // Public network access - disable for private-only setups
        publicNetworkAccess: "Enabled",

        // Azure Monitor integration settings
        grafanaIntegrations: {
            azureMonitorWorkspaceIntegrations: [
                {
                    azureMonitorWorkspaceResourceId: prometheusWorkspace.id,
                },
            ],
        },
    },

    tags: tags,
});
```

## RBAC Role Assignments

Azure Managed Grafana uses Azure AD for authentication and has three built-in roles:

- **Grafana Admin** - Full access to manage the Grafana instance, users, and dashboards
- **Grafana Editor** - Can create and edit dashboards
- **Grafana Viewer** - Read-only access to dashboards

You also need to grant the Grafana managed identity access to your data sources.

```typescript
// Get the current Azure AD client configuration
const currentClient = azure.authorization.getClientConfigOutput();

// Grant the deployer Grafana Admin role
const grafanaAdminRole = new azure.authorization.RoleAssignment("grafana-admin", {
    scope: grafana.id,
    roleDefinitionId: pulumi.interpolate`/subscriptions/${currentClient.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/22926164-76b3-42b3-bc55-97df8dab3e41`,
    principalId: currentClient.objectId,
    principalType: "User",
});

// Grant Grafana's managed identity Monitoring Reader on the subscription
// This lets Grafana read Azure Monitor metrics and logs
const monitoringReaderRole = new azure.authorization.RoleAssignment("grafana-monitoring-reader", {
    scope: pulumi.interpolate`/subscriptions/${currentClient.subscriptionId}`,
    roleDefinitionId: pulumi.interpolate`/subscriptions/${currentClient.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/43d0d8ad-25c7-4714-9337-8ba259a9fe05`,
    principalId: grafana.identity.apply(id => id?.principalId || ""),
    principalType: "ServicePrincipal",
});

// Grant Grafana's managed identity Log Analytics Reader on the workspace
const logAnalyticsReaderRole = new azure.authorization.RoleAssignment("grafana-log-reader", {
    scope: logAnalytics.id,
    roleDefinitionId: pulumi.interpolate`/subscriptions/${currentClient.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/73c42c96-874c-492b-b04d-ab87d138a893`,
    principalId: grafana.identity.apply(id => id?.principalId || ""),
    principalType: "ServicePrincipal",
});
```

## Setting Up Team Access

In a real organization, you want to give different teams appropriate levels of access. Here is how to assign Grafana roles to Azure AD groups.

```typescript
// Look up Azure AD groups for role assignments
const opsTeamGroup = azuread.getGroupOutput({
    displayName: "Platform-Ops-Team",
});

const devTeamGroup = azuread.getGroupOutput({
    displayName: "Development-Team",
});

// Ops team gets Editor access
const opsEditorRole = new azure.authorization.RoleAssignment("ops-grafana-editor", {
    scope: grafana.id,
    // Grafana Editor role definition ID
    roleDefinitionId: pulumi.interpolate`/subscriptions/${currentClient.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/a79a5197-3a5c-4973-a920-486035ffd60f`,
    principalId: opsTeamGroup.objectId,
    principalType: "Group",
});

// Dev team gets Viewer access
const devViewerRole = new azure.authorization.RoleAssignment("dev-grafana-viewer", {
    scope: grafana.id,
    // Grafana Viewer role definition ID
    roleDefinitionId: pulumi.interpolate`/subscriptions/${currentClient.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/60921a7e-fef1-4a43-9b16-a26c52ad4769`,
    principalId: devTeamGroup.objectId,
    principalType: "Group",
});
```

## Configuring Data Sources Programmatically

While Azure Managed Grafana automatically discovers Azure Monitor as a data source, you may want to add additional data sources like external Prometheus servers or other databases. You can do this through the Grafana API after the instance is deployed.

```typescript
// Helper function to configure Grafana data sources via the API
// This runs after the Grafana instance is fully provisioned
const configureDataSources = new azure.resources.DeploymentScript("configure-grafana-ds", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    kind: "AzureCLI",
    identity: {
        type: "UserAssigned",
        userAssignedIdentities: {
            // Reference a user-assigned managed identity with Grafana Admin role
        },
    },
    properties: {
        azCliVersion: "2.50.0",
        retentionInterval: "PT1H",
        scriptContent: pulumi.interpolate`
            # Get the Grafana endpoint
            GRAFANA_URL=$(az grafana show \
                --name grafana-${environment} \
                --resource-group rg-monitoring-${environment} \
                --query "properties.endpoint" -o tsv)

            # Configure Azure Monitor Logs data source
            az grafana data-source create \
                --name grafana-${environment} \
                --resource-group rg-monitoring-${environment} \
                --definition '{
                    "name": "Azure Monitor Logs",
                    "type": "grafana-azure-monitor-datasource",
                    "access": "proxy",
                    "jsonData": {
                        "azureAuthType": "msi",
                        "subscriptionId": "${currentClient.subscriptionId}",
                        "logAnalyticsDefaultWorkspace": "${logAnalytics.id}"
                    }
                }'

            echo "Data sources configured successfully"
        `,
    },
    tags: tags,
}, { dependsOn: [grafana, logAnalyticsReaderRole] });
```

## Dashboard Provisioning

You can also deploy dashboards as code. Export a dashboard from Grafana as JSON and deploy it through the CLI.

```typescript
// Deploy a pre-built dashboard
const deployDashboard = new azure.resources.DeploymentScript("deploy-dashboard", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    kind: "AzureCLI",
    identity: {
        type: "UserAssigned",
        userAssignedIdentities: {},
    },
    properties: {
        azCliVersion: "2.50.0",
        retentionInterval: "PT1H",
        scriptContent: pulumi.interpolate`
            # Import a dashboard from a JSON file
            az grafana dashboard import \
                --name grafana-${environment} \
                --resource-group rg-monitoring-${environment} \
                --definition @dashboards/azure-vm-overview.json \
                --overwrite true

            # Import the Kubernetes monitoring dashboard from Grafana.com
            az grafana dashboard import \
                --name grafana-${environment} \
                --resource-group rg-monitoring-${environment} \
                --definition 15757 \
                --overwrite true
        `,
    },
    tags: tags,
}, { dependsOn: [configureDataSources] });
```

## Outputs

Export the important values from the deployment.

```typescript
// Stack outputs
export const grafanaEndpoint = grafana.properties.apply(p => p?.endpoint);
export const grafanaId = grafana.id;
export const grafanaPrincipalId = grafana.identity.apply(id => id?.principalId);
export const logAnalyticsWorkspaceId = logAnalytics.id;
export const prometheusEndpoint = prometheusWorkspace.properties.apply(p => p?.metrics?.prometheusQueryEndpoint);
```

## Deploying

Run the Pulumi deployment.

```bash
# Preview the changes
pulumi preview

# Deploy the stack
pulumi up

# Get the Grafana URL
pulumi stack output grafanaEndpoint
```

## Wrapping Up

Azure Managed Grafana with Pulumi TypeScript gives you a fully managed observability platform deployed as code. The key pieces are the Grafana resource itself, RBAC assignments for teams, managed identity permissions for data sources, and optionally deploying dashboards and data source configurations through deployment scripts. Pulumi's TypeScript SDK makes the Azure resource definitions feel natural, and you can use standard programming patterns for things like conditional resource creation and dynamic role assignment loops.
