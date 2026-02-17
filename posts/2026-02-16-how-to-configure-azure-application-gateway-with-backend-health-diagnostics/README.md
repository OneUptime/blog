# How to Configure Azure Application Gateway with Backend Health Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Application Gateway, Health Diagnostics, Monitoring, Load Balancing, Troubleshooting

Description: Learn how to configure and use Azure Application Gateway backend health diagnostics to monitor backend server health and troubleshoot connectivity issues.

---

Azure Application Gateway routes traffic to backend pools, but when something goes wrong with a backend server, you need to figure out why the gateway marked it as unhealthy. Backend health diagnostics gives you visibility into how the Application Gateway perceives each backend server - whether it is healthy, unhealthy, or unknown, and the specific reason behind its status.

Getting backend health diagnostics configured properly saves you hours of troubleshooting when deployments go sideways or backend servers start failing intermittently. This guide walks through setting up health probes, enabling diagnostic logging, interpreting the results, and fixing the most common issues.

## How Backend Health Works

Application Gateway uses health probes to periodically check the status of each server in the backend pool. There are two types of probes:

**Default probes**: If you do not configure a custom probe, Application Gateway creates a default probe that sends requests to the root path (`/`) using the same protocol and port as the backend HTTP setting. It considers a response healthy if the status code is between 200 and 399.

**Custom probes**: You define the path, host header, interval, timeout, unhealthy threshold, and the criteria for what counts as a healthy response.

When a backend server fails the probe, the gateway marks it as unhealthy and stops sending traffic to it. Once the server starts passing probes again, it is re-added to the rotation.

## Prerequisites

- An existing Azure Application Gateway (v2 preferred)
- Backend pool configured with at least one target (VMs, VMSS, App Service, or IP addresses)
- A Log Analytics workspace for diagnostic logs
- Azure CLI installed

## Step 1: Configure Custom Health Probes

Default probes are fine for basic setups, but custom probes give you much more control over health detection.

```bash
# Create a custom health probe with specific path and settings
az network application-gateway probe create \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --name customHealthProbe \
  --protocol Https \
  --host-name-from-http-settings true \
  --path "/health" \
  --interval 30 \
  --timeout 30 \
  --threshold 3 \
  --min-servers 0 \
  --match-status-codes "200-299"
```

Key parameters explained:

- **path "/health"**: Use a dedicated health endpoint in your application rather than the root path. A `/health` endpoint can check database connectivity, cache availability, and other dependencies.
- **interval 30**: Check every 30 seconds. Lower intervals detect failures faster but generate more probe traffic.
- **timeout 30**: Wait up to 30 seconds for a response. If your health endpoint checks downstream dependencies, it might need more time.
- **threshold 3**: Mark a server as unhealthy after 3 consecutive failures. This prevents a single timeout from pulling a server out of rotation.
- **host-name-from-http-settings**: Uses the host header from the associated HTTP settings, which is important when your backend validates the Host header.

## Step 2: Associate the Probe with HTTP Settings

The health probe needs to be linked to an HTTP settings object:

```bash
# Update HTTP settings to use the custom probe
az network application-gateway http-settings update \
  --gateway-name myAppGateway \
  --resource-group myResourceGroup \
  --name myHttpSettings \
  --probe customHealthProbe
```

## Step 3: Enable Diagnostic Logging

Backend health diagnostics rely on Application Gateway diagnostic logs. Enable them to get full visibility:

```bash
# Enable all diagnostic log categories
az monitor diagnostic-settings create \
  --name "appgw-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/applicationGateways/myAppGateway" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {"category": "ApplicationGatewayAccessLog", "enabled": true},
    {"category": "ApplicationGatewayPerformanceLog", "enabled": true},
    {"category": "ApplicationGatewayFirewallLog", "enabled": true}
  ]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

The key metrics for backend health monitoring are:

- **HealthyHostCount**: Number of healthy backends per pool
- **UnhealthyHostCount**: Number of unhealthy backends per pool
- **BackendResponseStatus**: Response status codes from backends

## Step 4: Query Backend Health Status

You can check the current backend health status using the CLI or REST API:

```bash
# Get the current backend health for all pools
az network application-gateway show-backend-health \
  --name myAppGateway \
  --resource-group myResourceGroup \
  --output table
```

This command returns the health status of every server in every backend pool. Each server will be marked as one of:

- **Healthy**: The probe succeeded and the server is receiving traffic
- **Unhealthy**: The probe failed and the server is not receiving traffic
- **Draining**: The server is being gracefully removed from the pool
- **Unknown**: The gateway has not yet completed a probe cycle

For more detail, use the JSON output:

```bash
# Get detailed backend health including the reason for unhealthy status
az network application-gateway show-backend-health \
  --name myAppGateway \
  --resource-group myResourceGroup \
  --output json | jq '.backendAddressPools[].backendHttpSettingsCollection[].servers[]'
```

The output includes a `health` field and a `healthProbeLog` field that tells you exactly why a server is marked unhealthy.

## Step 5: Set Up Backend Health Alerts

Create alerts that fire when backend servers become unhealthy:

```bash
# Create an action group for notifications
az monitor action-group create \
  --name AppGwHealthAlerts \
  --resource-group myResourceGroup \
  --short-name AppGwAlert \
  --action email ops-team ops-team@company.com

# Alert when unhealthy host count exceeds zero
az monitor metrics alert create \
  --name "Unhealthy Backend Detected" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/applicationGateways/myAppGateway" \
  --condition "avg UnhealthyHostCount > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action AppGwHealthAlerts \
  --severity 2 \
  --description "One or more backend servers are unhealthy"

# Alert when ALL backends in a pool are unhealthy (critical)
az monitor metrics alert create \
  --name "All Backends Unhealthy" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/applicationGateways/myAppGateway" \
  --condition "avg HealthyHostCount < 1" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action AppGwHealthAlerts \
  --severity 0 \
  --description "All backend servers are unhealthy - service outage likely"
```

## Step 6: Query Diagnostic Logs for Troubleshooting

When a backend is unhealthy, use Log Analytics to dig into the details:

```
// KQL query to find backend health probe failures
AzureDiagnostics
| where ResourceType == "APPLICATIONGATEWAYS"
| where Category == "ApplicationGatewayAccessLog"
| where httpStatus_d >= 500
| project TimeGenerated, serverRouted_s, httpStatus_d, serverStatus_s, host_s, requestUri_s
| order by TimeGenerated desc
| take 50
```

For a summary of backend health over time:

```
// Backend health summary over the past 24 hours
AzureMetrics
| where ResourceProvider == "MICROSOFT.NETWORK"
| where MetricName in ("HealthyHostCount", "UnhealthyHostCount")
| where TimeGenerated > ago(24h)
| summarize AvgCount = avg(Average) by bin(TimeGenerated, 15m), MetricName
| render timechart
```

## Common Backend Health Issues and Fixes

**NSG blocking probe traffic**: Application Gateway health probes originate from the GatewayManager service tag on ports 65503-65534 (v1) or any port (v2). Make sure the NSG on the backend subnet allows this traffic.

```bash
# Add NSG rule to allow Application Gateway health probes
az network nsg rule create \
  --nsg-name backendNSG \
  --resource-group myResourceGroup \
  --name AllowAppGwProbes \
  --priority 100 \
  --source-address-prefixes GatewayManager \
  --destination-port-ranges "*" \
  --access Allow \
  --protocol Tcp \
  --direction Inbound
```

**SSL certificate mismatch**: If you are using HTTPS probes, the backend server's certificate must be trusted by the Application Gateway. For v2, upload the root certificate of the backend's certificate chain as a trusted root certificate.

**Host header mismatch**: If your backend application validates the Host header, make sure the probe sends the correct host. Either set `host-name-from-http-settings` to true or specify a fixed host in the probe configuration.

**Health endpoint returning non-200 status**: Your `/health` endpoint might be returning a 503 because a dependency is down. Check the application logs on the backend server to see what the health endpoint is checking and what is failing.

**Timeout on health endpoint**: If your health endpoint checks multiple dependencies synchronously, it might exceed the probe timeout. Make the health checks asynchronous or increase the probe timeout value.

## Building a Good Health Endpoint

A well-designed health endpoint makes troubleshooting much easier. Here is an example pattern:

```python
# Example health endpoint for a Python web application
# Returns detailed health status for diagnostics

@app.route('/health')
def health_check():
    checks = {}
    overall_healthy = True

    # Check database connectivity
    try:
        db.session.execute('SELECT 1')
        checks['database'] = 'healthy'
    except Exception as e:
        checks['database'] = f'unhealthy: {str(e)}'
        overall_healthy = False

    # Check cache connectivity
    try:
        redis_client.ping()
        checks['cache'] = 'healthy'
    except Exception as e:
        checks['cache'] = f'unhealthy: {str(e)}'
        overall_healthy = False

    status_code = 200 if overall_healthy else 503
    return jsonify(checks), status_code
```

This gives the health probe a clear pass/fail signal and gives operators detailed information about what is broken when they check the endpoint manually.

## Wrapping Up

Backend health diagnostics in Azure Application Gateway are your first tool for understanding why traffic is not reaching your servers. Configure custom health probes with appropriate paths, intervals, and thresholds. Enable diagnostic logging to a Log Analytics workspace. Set up alerts on unhealthy host counts. And build health endpoints in your applications that provide actionable information. When something goes wrong, the combination of probe results, diagnostic logs, and health endpoint responses will point you to the root cause much faster than guessing.
