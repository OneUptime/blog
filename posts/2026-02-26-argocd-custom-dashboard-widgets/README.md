# How to Build Custom ArgoCD Dashboard Widgets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Dashboards, Customization

Description: Learn how to build custom dashboard widgets for ArgoCD to display cost data, deployment metrics, compliance status, and more in the ArgoCD UI.

---

The default ArgoCD dashboard shows application sync status, health, and resource details. But most teams need more context: deployment frequency, error rates, cost metrics, compliance status, or links to related tools. While ArgoCD does not have a first-class "widget" system, you can build custom dashboard experiences using a combination of UI extensions, proxy extensions, and the ArgoCD API.

This guide covers practical approaches to extending the ArgoCD dashboard with custom widgets that provide the information your team actually needs.

## Approaches to Custom Widgets

There are three main ways to add custom widgets to ArgoCD:

1. **UI Extensions** - Build React components that appear as tabs in the application or resource views
2. **Proxy Extensions with IFrames** - Embed external dashboards through ArgoCD's proxy
3. **Custom Web Applications** - Build a separate dashboard that consumes the ArgoCD API

For most teams, a combination of approach 1 and 2 works best. Let us build some practical widgets.

## Widget 1: Deployment Frequency Tracker

This widget shows how often an application has been deployed over time.

### Backend Service

```python
# deployment_tracker.py
from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import requests

app = Flask(__name__)

# ArgoCD API base URL (accessible within the cluster)
ARGOCD_API = "http://argocd-server.argocd.svc.cluster.local"

@app.route('/api/deployments/<app_name>/frequency')
def deployment_frequency(app_name):
    """Calculate deployment frequency for an application."""
    # Get application history from ArgoCD API
    # In production, use a proper token
    headers = {"Authorization": f"Bearer {request.headers.get('X-ArgoCD-Token', '')}"}

    resp = requests.get(
        f"{ARGOCD_API}/api/v1/applications/{app_name}",
        headers=headers,
        verify=False
    )

    if resp.status_code != 200:
        return jsonify({"error": "Failed to fetch app data"}), 500

    app_data = resp.json()
    history = app_data.get("status", {}).get("history", [])

    # Calculate frequency by day
    deploy_dates = {}
    for entry in history:
        deployed_at = entry.get("deployedAt", "")
        if deployed_at:
            date = deployed_at[:10]  # Extract YYYY-MM-DD
            deploy_dates[date] = deploy_dates.get(date, 0) + 1

    # Fill in missing dates for the last 30 days
    today = datetime.now()
    frequency = []
    for i in range(30):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        frequency.append({
            "date": date,
            "count": deploy_dates.get(date, 0)
        })

    frequency.reverse()

    return jsonify({
        "application": app_name,
        "totalDeployments": len(history),
        "last30Days": sum(d["count"] for d in frequency),
        "frequency": frequency
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### React Widget Component

```typescript
// src/DeploymentFrequencyWidget.tsx
import * as React from 'react';

interface FrequencyData {
  application: string;
  totalDeployments: number;
  last30Days: number;
  frequency: Array<{ date: string; count: number }>;
}

interface WidgetProps {
  application: {
    metadata: { name: string };
  };
}

const DeploymentFrequencyWidget: React.FC<WidgetProps> = ({ application }) => {
  const [data, setData] = React.useState<FrequencyData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/extensions/deployments/api/deployments/${application.metadata.name}/frequency`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [application.metadata.name]);

  if (loading) return <div>Loading deployment data...</div>;
  if (!data) return <div>No deployment data available</div>;

  const maxCount = Math.max(...data.frequency.map(d => d.count), 1);

  return (
    <div style={{ padding: '20px' }}>
      <h3>Deployment Frequency</h3>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.totalDeployments}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Deployments</div>
        </div>
        <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.last30Days}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Last 30 Days</div>
        </div>
      </div>
      {/* Simple bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', height: '100px', gap: '2px' }}>
        {data.frequency.map((day, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${(day.count / maxCount) * 100}%`,
              background: day.count > 0 ? '#18be94' : '#eee',
              borderRadius: '2px 2px 0 0',
              minHeight: '2px',
            }}
            title={`${day.date}: ${day.count} deployments`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999' }}>
        <span>{data.frequency[0]?.date}</span>
        <span>{data.frequency[data.frequency.length - 1]?.date}</span>
      </div>
    </div>
  );
};

export default DeploymentFrequencyWidget;
```

## Widget 2: Cost Overview Panel

Show estimated costs per application using data from Kubecost or OpenCost.

```typescript
// src/CostWidget.tsx
import * as React from 'react';

interface CostData {
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  networkCost: number;
  totalMonthlyCost: number;
}

const CostWidget: React.FC<{ application: any }> = ({ application }) => {
  const [cost, setCost] = React.useState<CostData | null>(null);

  React.useEffect(() => {
    const ns = application.spec.destination.namespace;
    // Query Kubecost through proxy extension
    fetch(`/api/extensions/kubecost/model/allocation?window=30d&namespace=${ns}`)
      .then(res => res.json())
      .then(data => {
        // Transform Kubecost response
        const allocation = data?.data?.[0]?.[ns] || {};
        setCost({
          cpuCost: allocation.cpuCost || 0,
          memoryCost: allocation.ramCost || 0,
          storageCost: allocation.pvCost || 0,
          networkCost: allocation.networkCost || 0,
          totalMonthlyCost: allocation.totalCost || 0,
        });
      })
      .catch(console.error);
  }, [application]);

  if (!cost) return <div>Loading cost data...</div>;

  const formatCost = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div style={{ padding: '20px' }}>
      <h3>Monthly Cost Estimate</h3>
      <div style={{
        fontSize: '32px',
        fontWeight: 'bold',
        color: cost.totalMonthlyCost > 100 ? '#e74c3c' : '#18be94',
        marginBottom: '16px'
      }}>
        {formatCost(cost.totalMonthlyCost)}/month
      </div>
      <table style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td>CPU</td>
            <td style={{ textAlign: 'right' }}>{formatCost(cost.cpuCost)}</td>
          </tr>
          <tr>
            <td>Memory</td>
            <td style={{ textAlign: 'right' }}>{formatCost(cost.memoryCost)}</td>
          </tr>
          <tr>
            <td>Storage</td>
            <td style={{ textAlign: 'right' }}>{formatCost(cost.storageCost)}</td>
          </tr>
          <tr>
            <td>Network</td>
            <td style={{ textAlign: 'right' }}>{formatCost(cost.networkCost)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CostWidget;
```

## Widget 3: Compliance Status Badge

Show whether an application meets your organization's compliance policies.

```typescript
// src/ComplianceWidget.tsx
import * as React from 'react';

interface PolicyResult {
  policy: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const ComplianceWidget: React.FC<{ application: any }> = ({ application }) => {
  const [results, setResults] = React.useState<PolicyResult[]>([]);

  React.useEffect(() => {
    const ns = application.spec.destination.namespace;
    // Query policy engine through proxy extension
    fetch(`/api/extensions/compliance/api/check?namespace=${ns}&app=${application.metadata.name}`)
      .then(res => res.json())
      .then(data => setResults(data.results || []))
      .catch(console.error);
  }, [application]);

  const statusColors = {
    pass: '#18be94',
    fail: '#e74c3c',
    warning: '#f39c12',
  };

  const statusIcons = {
    pass: 'check-circle',
    fail: 'times-circle',
    warning: 'exclamation-triangle',
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  return (
    <div style={{ padding: '20px' }}>
      <h3>Compliance Status</h3>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <span style={{ color: statusColors.pass }}>
          {passCount} Passed
        </span>
        <span style={{ color: statusColors.fail }}>
          {failCount} Failed
        </span>
      </div>
      {results.map((result, i) => (
        <div
          key={i}
          style={{
            padding: '8px 12px',
            margin: '4px 0',
            borderLeft: `3px solid ${statusColors[result.status]}`,
            background: '#f9f9f9',
          }}
        >
          <strong>{result.policy}</strong>
          <span style={{
            float: 'right',
            color: statusColors[result.status],
            fontWeight: 'bold',
          }}>
            {result.status.toUpperCase()}
          </span>
          <div style={{ fontSize: '12px', color: '#666' }}>{result.message}</div>
        </div>
      ))}
    </div>
  );
};

export default ComplianceWidget;
```

## Combining Widgets into a Dashboard Tab

Bundle multiple widgets into a single application tab extension.

```typescript
// src/DashboardExtension.tsx
import * as React from 'react';
import DeploymentFrequencyWidget from './DeploymentFrequencyWidget';
import CostWidget from './CostWidget';
import ComplianceWidget from './ComplianceWidget';

const DashboardExtension: React.FC<{ application: any }> = ({ application }) => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
      }}>
        <DeploymentFrequencyWidget application={application} />
        <CostWidget application={application} />
        <ComplianceWidget application={application} />
      </div>
    </div>
  );
};

// Register as application tab extension
((window: any) => {
  window.extensions = window.extensions || {};
  window.extensions.applications = window.extensions.applications || {};
  window.extensions.applications['dashboard'] = DashboardExtension;
})(window);
```

## Deployment Configuration

```yaml
# Configure ArgoCD to load the dashboard extension
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  extension.config: |
    extensions:
      - name: deployments
        backend:
          services:
            - url: http://deployment-tracker.argocd.svc.cluster.local:8080
      - name: kubecost
        backend:
          services:
            - url: http://kubecost-cost-analyzer.kubecost.svc.cluster.local:9090
      - name: compliance
        backend:
          services:
            - url: http://compliance-checker.argocd.svc.cluster.local:8080
```

## Testing Your Widgets

Before deploying, test your widgets locally.

```bash
# Build the extension bundle
npx webpack --mode development --watch

# Serve the bundle locally
npx http-server dist/ --port 9090

# In another terminal, port-forward ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

You can test the proxy extensions directly with curl.

```bash
# Test the deployment frequency endpoint
curl -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://localhost:8080/api/extensions/deployments/api/deployments/my-app/frequency"
```

## Conclusion

Building custom dashboard widgets for ArgoCD transforms it from a deployment tool into a platform that provides the context your team needs to make decisions. By combining UI extensions for the frontend with proxy extensions for secure backend access, you can display cost data, deployment metrics, compliance status, and anything else that matters to your workflow. The investment in building these widgets pays off quickly as your team spends less time switching between tools and more time shipping software.
