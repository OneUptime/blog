# How to Build a Power Apps Component Framework Control That Calls Azure REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power Apps, PCF, Azure, REST API, Component Framework, Low-Code, TypeScript

Description: Build a custom Power Apps Component Framework (PCF) control that integrates with Azure REST APIs for rich data visualization and real-time functionality.

---

Power Apps is a low-code platform, but sometimes you hit a wall where the built-in controls cannot do what you need. Maybe you want to display live Azure resource metrics, show real-time data from an Azure API, or build a custom visualization that does not exist in the gallery of standard controls. The Power Apps Component Framework (PCF) lets you build custom controls using TypeScript and React that integrate seamlessly into Power Apps. These controls can make HTTP calls to Azure REST APIs, giving you the full power of Azure services inside a low-code app.

In this guide, I will build a PCF control that calls an Azure REST API, displays the data in a custom visualization, and handles authentication through the Power Platform connector infrastructure.

## What is PCF

The Power Apps Component Framework allows developers to create reusable UI components using web technologies (TypeScript, HTML, CSS, React). These components can be used in both canvas apps and model-driven apps. They have access to the Power Apps context, including the authenticated user, environment variables, and the Web API.

PCF controls run in the browser alongside the Power App. They can make HTTP calls, render custom UI, and bind to Power Apps data sources.

## Setting Up the Development Environment

Install the PCF development tools.

```bash
# Install the Power Apps CLI
npm install -g pac

# Create a new PCF project
pac pcf init \
  --name AzureResourceMonitor \
  --namespace Contoso.Controls \
  --template field \
  --framework react

# Install dependencies
cd AzureResourceMonitor
npm install
```

The `--framework react` flag generates a React-based control. You can also use the default (non-React) template for simpler controls.

## Defining the Control Manifest

The manifest defines the control's properties, including inputs that Power Apps makers can configure.

```xml
<!-- ControlManifest.Input.xml -->
<?xml version="1.0" encoding="utf-8"?>
<manifest>
  <control namespace="Contoso.Controls"
           constructor="AzureResourceMonitor"
           version="1.0.0"
           display-name-key="Azure Resource Monitor"
           description-key="Displays real-time metrics from Azure resources"
           control-type="virtual">

    <!-- Input properties configurable by the app maker -->
    <property name="apiEndpoint"
              display-name-key="API Endpoint"
              description-key="The Azure API endpoint to call"
              of-type="SingleLine.URL"
              usage="input"
              required="true" />

    <property name="resourceId"
              display-name-key="Resource ID"
              description-key="The Azure resource ID to monitor"
              of-type="SingleLine.Text"
              usage="input"
              required="true" />

    <property name="refreshInterval"
              display-name-key="Refresh Interval (seconds)"
              description-key="How often to refresh data"
              of-type="Whole.None"
              usage="input"
              required="false" />

    <property name="metricName"
              display-name-key="Metric Name"
              description-key="The Azure Monitor metric to display"
              of-type="SingleLine.Text"
              usage="input"
              required="true" />

    <!-- Resources -->
    <resources>
      <code path="index.ts" order="1" />
      <platform-library name="React" version="18.2.0" />
      <platform-library name="Fluent" version="9.46.2" />
    </resources>
  </control>
</manifest>
```

## Building the React Component

Create the React component that fetches data from Azure and displays it.

```typescript
// AzureResourceMonitor/components/MetricChart.tsx
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

// Props passed from the PCF control
interface MetricChartProps {
  apiEndpoint: string;
  resourceId: string;
  metricName: string;
  refreshInterval: number;
  // Function to make authenticated API calls through Power Platform
  fetchData: (url: string) => Promise<any>;
}

// Single metric data point
interface MetricDataPoint {
  timestamp: string;
  value: number;
}

const MetricChart: React.FC<MetricChartProps> = ({
  apiEndpoint,
  resourceId,
  metricName,
  refreshInterval,
  fetchData
}) => {
  const [metrics, setMetrics] = useState<MetricDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch metrics from the Azure API
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);

      // Build the Azure Monitor metrics API URL
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 3600000).toISOString(); // Last hour
      const url = `${apiEndpoint}/${resourceId}/providers/Microsoft.Insights/metrics` +
        `?api-version=2023-10-01` +
        `&metricnames=${metricName}` +
        `&timespan=${startTime}/${endTime}` +
        `&interval=PT1M`;

      // Use the authenticated fetch function
      const data = await fetchData(url);

      if (data && data.value && data.value.length > 0) {
        const timeseries = data.value[0].timeseries[0].data;
        const points: MetricDataPoint[] = timeseries.map((point: any) => ({
          timestamp: point.timeStamp,
          value: point.average || point.total || point.maximum || 0
        }));
        setMetrics(points);
        setError(null);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, resourceId, metricName, fetchData]);

  // Load metrics on mount and set up refresh interval
  useEffect(() => {
    loadMetrics();

    if (refreshInterval > 0) {
      const interval = setInterval(loadMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [loadMetrics, refreshInterval]);

  // Calculate statistics from the metrics
  const stats = React.useMemo(() => {
    if (metrics.length === 0) return null;
    const values = metrics.map(m => m.value);
    return {
      current: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  }, [metrics]);

  if (loading && metrics.length === 0) {
    return <div style={styles.container}>Loading metrics...</div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
        <button onClick={loadMetrics} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{metricName}</h3>
        {lastUpdated && (
          <span style={styles.timestamp}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Statistics row */}
      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Current</div>
            <div style={styles.statValue}>{stats.current.toFixed(2)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Average</div>
            <div style={styles.statValue}>{stats.avg.toFixed(2)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Min</div>
            <div style={styles.statValue}>{stats.min.toFixed(2)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Max</div>
            <div style={styles.statValue}>{stats.max.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Simple bar chart visualization */}
      <div style={styles.chartContainer}>
        {metrics.slice(-30).map((point, index) => {
          const maxVal = stats ? stats.max : 1;
          const heightPercent = maxVal > 0
            ? (point.value / maxVal) * 100
            : 0;

          return (
            <div
              key={index}
              style={{
                ...styles.bar,
                height: `${Math.max(heightPercent, 2)}%`
              }}
              title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.value.toFixed(2)}`}
            />
          );
        })}
      </div>
    </div>
  );
};

// Inline styles for the component
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    fontFamily: 'Segoe UI, sans-serif',
    border: '1px solid #e1e1e1',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600
  },
  timestamp: {
    fontSize: '12px',
    color: '#666'
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  statCard: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    textAlign: 'center' as const
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0078d4'
  },
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '2px',
    height: '120px',
    borderBottom: '1px solid #e1e1e1',
    paddingBottom: '4px'
  },
  bar: {
    flex: 1,
    backgroundColor: '#0078d4',
    borderRadius: '2px 2px 0 0',
    minWidth: '4px',
    transition: 'height 0.3s ease'
  },
  error: {
    color: '#d13438',
    marginBottom: '8px'
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#0078d4',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default MetricChart;
```

## The PCF Control Entry Point

The main PCF control class bridges the Power Apps context with the React component.

```typescript
// index.ts
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import MetricChart from './components/MetricChart';

export class AzureResourceMonitor
  implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
  private context: ComponentFramework.Context<IInputs>;

  constructor() {}

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary
  ): void {
    this.context = context;
    // Request additional space if needed
    context.mode.trackContainerResize(true);
  }

  public updateView(
    context: ComponentFramework.Context<IInputs>
  ): React.ReactElement {
    this.context = context;

    // Create an authenticated fetch function using the Power Platform Web API
    const authenticatedFetch = async (url: string): Promise<any> => {
      // Use the Power Platform's built-in HTTP request capability
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });
      return response.json();
    };

    return React.createElement(MetricChart, {
      apiEndpoint: context.parameters.apiEndpoint.raw || '',
      resourceId: context.parameters.resourceId.raw || '',
      metricName: context.parameters.metricName.raw || 'CpuPercentage',
      refreshInterval: context.parameters.refreshInterval.raw || 30,
      fetchData: authenticatedFetch
    });
  }

  // Get an access token for Azure APIs
  private async getAccessToken(): Promise<string> {
    // In a real implementation, you would use MSAL or
    // a custom connector to get an Azure AD token
    // This is a simplified example
    const tokenEndpoint = this.context.parameters.apiEndpoint.raw || '';
    return '';  // Token handling via custom connector
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {}
}
```

## Building and Deploying the Control

Build the control and create a solution for deployment.

```bash
# Build the control
npm run build

# Test locally with the test harness
npm start watch

# Create a solution project for deployment
pac solution init \
  --publisher-name Contoso \
  --publisher-prefix contoso

# Add the PCF control to the solution
pac solution add-reference --path ./

# Build the solution ZIP
msbuild /t:build /restore /p:configuration=Release

# Deploy to your Power Platform environment
pac auth create --url https://yourorg.crm.dynamics.com
pac pcf push --publisher-prefix contoso
```

## Using the Control in a Canvas App

Once deployed, the control appears in the Insert panel under "Code components" in the Power Apps maker studio. Add it to your canvas and configure the properties.

Set the properties from Power Apps formulas.

```
// In the Power Apps formula bar
AzureResourceMonitor.apiEndpoint: "https://management.azure.com/subscriptions/YOUR-SUB-ID/resourceGroups/YOUR-RG/providers/Microsoft.Web/sites/YOUR-APP"
AzureResourceMonitor.metricName: "CpuPercentage"
AzureResourceMonitor.refreshInterval: 30
```

## Handling Authentication

The trickiest part of calling Azure APIs from PCF is authentication. You have several options.

First, use a custom connector. Create a custom connector in Power Platform that authenticates with Azure AD. The connector handles token acquisition and refresh. Your PCF control calls the connector through the Power Apps context.

Second, use Azure Functions as a proxy. Create an Azure Function with a managed identity that calls the Azure REST API. Your PCF control calls the function, which handles authentication server-side. This is the most secure approach because no tokens are exposed to the client.

```javascript
// Azure Function proxy that calls Azure Monitor API
module.exports = async function (context, req) {
    const { DefaultAzureCredential } = require('@azure/identity');
    const credential = new DefaultAzureCredential();

    // Get token for Azure Management API
    const token = await credential.getToken('https://management.azure.com/.default');

    // Forward the request to Azure
    const response = await fetch(req.query.url, {
        headers: { 'Authorization': `Bearer ${token.token}` }
    });

    context.res = {
        body: await response.json()
    };
};
```

## Testing the Control

PCF provides a test harness that runs locally in your browser.

```bash
# Start the test harness
npm start watch
```

This opens a browser with the control rendered in isolation. You can set property values in the harness UI and see how the control behaves. For API calls, you might need to use mock data or a local proxy during development.

## Wrapping Up

PCF controls bridge the gap between low-code and pro-code development on Power Platform. When the built-in controls are not enough, you can build exactly what you need using TypeScript and React, with full access to Azure REST APIs. The key is handling authentication properly - use Azure Functions as a proxy for the most secure approach. Once deployed, your custom control is available to all Power Apps makers in your organization, giving them access to Azure data and functionality without needing to write any code themselves.
