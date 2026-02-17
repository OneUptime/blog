# How to Create Azure Log Analytics Workspace with Custom Tables Using Bicep

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Log Analytics, Monitoring, Infrastructure as Code, Observability, Logging

Description: Create Azure Log Analytics workspaces with custom log tables and data collection rules using Bicep for structured observability infrastructure.

---

Azure Log Analytics is the central hub for log data on Azure. It collects logs from VMs, containers, applications, and Azure services, then lets you query them with KQL. The built-in tables cover common scenarios, but most organizations eventually need custom tables for application-specific data that does not fit the standard schema.

Bicep makes it straightforward to define your Log Analytics workspace, custom tables, and data collection rules as code. This post walks through the full setup.

## Creating the Workspace

The workspace is where all your log data lands. Start with the workspace configuration.

```bicep
// main.bicep
// Creates a Log Analytics workspace with retention and access settings

@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the Log Analytics workspace')
param workspaceName string = 'law-monitoring-prod'

@description('Data retention period in days')
@minValue(30)
@maxValue(730)
param retentionDays int = 90

@description('Daily data ingestion cap in GB. -1 for unlimited')
param dailyCapGb int = 10

// Log Analytics workspace
resource workspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'  // Pay-per-GB pricing tier
    }
    retentionInDays: retentionDays

    // Daily ingestion cap to prevent cost surprises
    workspaceCapping: {
      dailyQuotaGb: dailyCapGb
    }

    // Network access settings
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'

    features: {
      // Enable search-based log analytics
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
  tags: {
    environment: 'production'
    team: 'platform'
  }
}

output workspaceId string = workspace.id
output workspaceName string = workspace.name
output customerId string = workspace.properties.customerId
```

The `PerGB2018` SKU is the standard pay-per-GB pricing. For high-volume workloads, look into commitment tiers which give discounts for guaranteed daily ingestion volumes. The daily cap is a safety net - if something starts flooding logs, you will not get an unexpected bill.

## Defining Custom Tables

Custom tables let you ingest structured data that follows your own schema. Since the Custom Logs v2 API, you define table schemas explicitly.

```bicep
// custom-tables.bicep
// Defines custom log tables for application-specific data

@description('The workspace resource ID')
param workspaceId string

@description('The workspace name')
param workspaceName string

// Custom table for application performance metrics
resource perfMetricsTable 'Microsoft.OperationalInsights/workspaces/tables@2022-10-01' = {
  name: '${workspaceName}/AppPerformanceMetrics_CL'
  properties: {
    // Analytics plan for full KQL query support
    plan: 'Analytics'
    retentionInDays: 90
    totalRetentionInDays: 180  // Archive tier after retention period

    schema: {
      name: 'AppPerformanceMetrics_CL'
      columns: [
        {
          name: 'TimeGenerated'
          type: 'datetime'
          description: 'Timestamp when the metric was recorded'
        }
        {
          name: 'ServiceName'
          type: 'string'
          description: 'Name of the application service'
        }
        {
          name: 'OperationName'
          type: 'string'
          description: 'The API operation or endpoint name'
        }
        {
          name: 'DurationMs'
          type: 'real'
          description: 'Duration of the operation in milliseconds'
        }
        {
          name: 'StatusCode'
          type: 'int'
          description: 'HTTP status code of the response'
        }
        {
          name: 'RequestSize'
          type: 'long'
          description: 'Size of the request payload in bytes'
        }
        {
          name: 'ResponseSize'
          type: 'long'
          description: 'Size of the response payload in bytes'
        }
        {
          name: 'Region'
          type: 'string'
          description: 'Azure region where the request was handled'
        }
        {
          name: 'CorrelationId'
          type: 'string'
          description: 'Unique identifier for tracing requests across services'
        }
        {
          name: 'ErrorMessage'
          type: 'string'
          description: 'Error message if the operation failed'
        }
      ]
    }
  }
}

// Custom table for deployment tracking
resource deploymentsTable 'Microsoft.OperationalInsights/workspaces/tables@2022-10-01' = {
  name: '${workspaceName}/DeploymentEvents_CL'
  properties: {
    plan: 'Analytics'
    retentionInDays: 365  // Keep deployment history for a year

    schema: {
      name: 'DeploymentEvents_CL'
      columns: [
        {
          name: 'TimeGenerated'
          type: 'datetime'
        }
        {
          name: 'DeploymentId'
          type: 'string'
        }
        {
          name: 'ServiceName'
          type: 'string'
        }
        {
          name: 'Version'
          type: 'string'
        }
        {
          name: 'Environment'
          type: 'string'
        }
        {
          name: 'Status'
          type: 'string'
        }
        {
          name: 'DeployedBy'
          type: 'string'
        }
        {
          name: 'CommitSha'
          type: 'string'
        }
        {
          name: 'DurationSeconds'
          type: 'int'
        }
        {
          name: 'RollbackOf'
          type: 'string'
        }
      ]
    }
  }
}

// Custom table with Basic plan for high-volume, low-query data
resource auditLogsTable 'Microsoft.OperationalInsights/workspaces/tables@2022-10-01' = {
  name: '${workspaceName}/DetailedAuditLogs_CL'
  properties: {
    // Basic plan costs less but has limited query capabilities
    plan: 'Basic'
    retentionInDays: 30

    schema: {
      name: 'DetailedAuditLogs_CL'
      columns: [
        {
          name: 'TimeGenerated'
          type: 'datetime'
        }
        {
          name: 'ActorId'
          type: 'string'
        }
        {
          name: 'Action'
          type: 'string'
        }
        {
          name: 'ResourceId'
          type: 'string'
        }
        {
          name: 'Details'
          type: 'string'
        }
        {
          name: 'SourceIp'
          type: 'string'
        }
      ]
    }
  }
}
```

The `_CL` suffix is required for custom log tables. The `plan` parameter is important for cost management. `Analytics` tables support full KQL queries but cost more for ingestion. `Basic` tables are cheaper to ingest but have limited query capabilities and only 8 days of interactive query retention.

## Data Collection Rules

Data Collection Rules (DCRs) define how data gets into your custom tables. They act as the pipeline between data sources and the workspace.

```bicep
// dcr.bicep
// Data collection rules for routing logs to custom tables

@description('Location for the data collection resources')
param location string = resourceGroup().location

@description('Log Analytics workspace ID')
param workspaceId string

// Data Collection Endpoint - the ingestion point for custom logs
resource dce 'Microsoft.Insights/dataCollectionEndpoints@2022-06-01' = {
  name: 'dce-custom-logs'
  location: location
  properties: {
    networkAcls: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// Data Collection Rule for performance metrics
resource dcrPerfMetrics 'Microsoft.Insights/dataCollectionRules@2022-06-01' = {
  name: 'dcr-app-performance-metrics'
  location: location
  properties: {
    dataCollectionEndpointId: dce.id

    // Define the stream that incoming data uses
    streamDeclarations: {
      'Custom-AppPerformanceMetrics_CL': {
        columns: [
          { name: 'TimeGenerated', type: 'datetime' }
          { name: 'ServiceName', type: 'string' }
          { name: 'OperationName', type: 'string' }
          { name: 'DurationMs', type: 'real' }
          { name: 'StatusCode', type: 'int' }
          { name: 'RequestSize', type: 'long' }
          { name: 'ResponseSize', type: 'long' }
          { name: 'Region', type: 'string' }
          { name: 'CorrelationId', type: 'string' }
          { name: 'ErrorMessage', type: 'string' }
        ]
      }
    }

    // Where data goes
    destinations: {
      logAnalytics: [
        {
          workspaceResourceId: workspaceId
          name: 'law-destination'
        }
      ]
    }

    // How data flows from streams to destinations
    dataFlows: [
      {
        streams: ['Custom-AppPerformanceMetrics_CL']
        destinations: ['law-destination']
        transformKql: 'source'  // No transformation, pass through as-is
        outputStream: 'Custom-AppPerformanceMetrics_CL'
      }
    ]
  }
}

// DCR with transformation - filter and enrich data before storing
resource dcrWithTransform 'Microsoft.Insights/dataCollectionRules@2022-06-01' = {
  name: 'dcr-deployment-events'
  location: location
  properties: {
    dataCollectionEndpointId: dce.id

    streamDeclarations: {
      'Custom-DeploymentEvents_CL': {
        columns: [
          { name: 'TimeGenerated', type: 'datetime' }
          { name: 'DeploymentId', type: 'string' }
          { name: 'ServiceName', type: 'string' }
          { name: 'Version', type: 'string' }
          { name: 'Environment', type: 'string' }
          { name: 'Status', type: 'string' }
          { name: 'DeployedBy', type: 'string' }
          { name: 'CommitSha', type: 'string' }
          { name: 'DurationSeconds', type: 'int' }
          { name: 'RollbackOf', type: 'string' }
        ]
      }
    }

    destinations: {
      logAnalytics: [
        {
          workspaceResourceId: workspaceId
          name: 'law-destination'
        }
      ]
    }

    dataFlows: [
      {
        streams: ['Custom-DeploymentEvents_CL']
        destinations: ['law-destination']
        // KQL transformation: only keep production deployments
        transformKql: 'source | where Environment == "production"'
        outputStream: 'Custom-DeploymentEvents_CL'
      }
    ]
  }
}

output dceEndpoint string = dce.properties.logsIngestion.endpoint
output dcrPerfMetricsId string = dcrPerfMetrics.id
output dcrDeploymentEventsId string = dcrWithTransform.id
```

## Ingesting Data

With the DCR and custom tables in place, applications can send data using the Logs Ingestion API.

```bash
# Example: send data to the custom table via the Logs Ingestion API
# First, get an access token
TOKEN=$(az account get-access-token --resource "https://monitor.azure.com" --query accessToken -o tsv)

# Send a log entry
curl -X POST "${DCE_ENDPOINT}/dataCollectionRules/${DCR_ID}/streams/Custom-AppPerformanceMetrics_CL?api-version=2023-01-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{
    "TimeGenerated": "2026-02-16T10:30:00Z",
    "ServiceName": "orders-api",
    "OperationName": "GET /api/orders",
    "DurationMs": 45.2,
    "StatusCode": 200,
    "RequestSize": 0,
    "ResponseSize": 4096,
    "Region": "eastus",
    "CorrelationId": "abc-123-def",
    "ErrorMessage": ""
  }]'
```

## Deploying the Full Stack

Use a main Bicep file to orchestrate all the modules.

```bicep
// deploy.bicep
// Orchestrates workspace, tables, and data collection rules

param location string = resourceGroup().location

// Create the workspace
module workspace 'modules/workspace.bicep' = {
  name: 'deploy-workspace'
  params: {
    location: location
    workspaceName: 'law-monitoring-prod'
    retentionDays: 90
    dailyCapGb: 10
  }
}

// Create custom tables
module customTables 'modules/custom-tables.bicep' = {
  name: 'deploy-custom-tables'
  params: {
    workspaceId: workspace.outputs.workspaceId
    workspaceName: workspace.outputs.workspaceName
  }
}

// Create data collection rules
module dcr 'modules/dcr.bicep' = {
  name: 'deploy-dcr'
  params: {
    location: location
    workspaceId: workspace.outputs.workspaceId
  }
  dependsOn: [customTables]
}
```

## Summary

Bicep gives you a clean way to define your entire Log Analytics infrastructure: the workspace with proper retention and cost controls, custom tables with explicit schemas, and data collection rules that route and transform data. Custom tables with the `_CL` suffix let you ingest any structured data, and the choice between Analytics and Basic plans gives you cost flexibility. Data collection rules with KQL transformations let you filter and enrich data at ingestion time, reducing storage costs and improving query performance. With everything in Bicep, your observability infrastructure is just as reproducible and reviewable as your application infrastructure.
