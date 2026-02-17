# How to Configure Azure VM Scale Sets with Application Health Probes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VM Scale Sets, Health Probes, Application Monitoring, Auto Repair, Reliability

Description: Learn how to configure application health probes on Azure VM Scale Sets for automatic instance repair and rolling upgrade safety.

---

Health probes are how your VM Scale Set knows whether instances are actually working, not just running. An instance can be powered on, fully booted, and passing basic health checks while the application inside is completely broken. Application health probes solve this by checking the application itself - hitting an HTTP endpoint, verifying TCP connectivity, or running a custom health check - and reporting that status back to the scale set.

Without health probes, you are flying blind. The scale set has no way to detect application failures, cannot perform automatic repairs, and rolling upgrades have no signal to determine if newly updated instances are healthy. In my experience, health probes are the single most important configuration for production scale sets.

## Types of Health Probes

Azure VM Scale Sets support two mechanisms for health monitoring:

### Load Balancer Health Probes

If your scale set uses an Azure Load Balancer or Application Gateway, the load balancer's health probe doubles as the scale set's health signal. When an instance fails the load balancer probe, it is marked as unhealthy in the scale set too.

### Application Health Extension

The Application Health Extension is an in-guest VM extension that directly monitors your application from within the instance. It periodically sends HTTP, HTTPS, or TCP requests to a local endpoint and reports the result to the Azure platform.

You can use either mechanism, and for maximum reliability, I recommend the Application Health Extension because it works independently of the load balancer and provides health data even for instances not yet added to the load balancer backend pool.

## Setting Up Load Balancer Health Probes

If you are already using a load balancer with your scale set, configure a health probe that tests your application:

```bash
# Create a health probe on the load balancer
az network lb probe create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name appHealthProbe \
  --protocol Http \
  --port 80 \
  --path /health \
  --interval 15 \
  --threshold 3

# Create a load balancing rule that uses the health probe
az network lb rule create \
  --resource-group myResourceGroup \
  --lb-name myLoadBalancer \
  --name httpRule \
  --protocol Tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name myFrontendIP \
  --backend-pool-name myBackendPool \
  --probe-name appHealthProbe
```

The probe parameters:

- **interval**: How often the probe checks (in seconds). 15 seconds is a good default.
- **threshold**: How many consecutive failures before marking the instance as unhealthy. 3 failures at 15-second intervals means an instance is marked unhealthy after 45 seconds of failures.
- **path**: The HTTP path to check. Use a dedicated health endpoint, not your application's root URL.

## Setting Up the Application Health Extension

The Application Health Extension is more flexible and works even without a load balancer. Here is how to add it to a scale set.

### For Linux Scale Sets

```bash
# Add the Application Health Extension for Linux
az vmss extension set \
  --resource-group myResourceGroup \
  --vmss-name myScaleSet \
  --name ApplicationHealthLinux \
  --publisher Microsoft.ManagedServices \
  --version 1.0 \
  --settings '{
    "protocol": "http",
    "port": 8080,
    "requestPath": "/health",
    "intervalInSeconds": 5,
    "numberOfProbes": 1,
    "gracePeriod": 600
  }'
```

### For Windows Scale Sets

```bash
# Add the Application Health Extension for Windows
az vmss extension set \
  --resource-group myResourceGroup \
  --vmss-name myScaleSet \
  --name ApplicationHealthWindows \
  --publisher Microsoft.ManagedServices \
  --version 1.0 \
  --settings '{
    "protocol": "http",
    "port": 80,
    "requestPath": "/health",
    "intervalInSeconds": 5,
    "numberOfProbes": 1,
    "gracePeriod": 600
  }'
```

The parameters:

- **protocol**: http, https, or tcp. HTTP and HTTPS expect a 200 response code for healthy status.
- **port**: The local port where your application listens.
- **requestPath**: The health check endpoint path (only for HTTP/HTTPS).
- **intervalInSeconds**: How frequently to probe (minimum 5 seconds).
- **numberOfProbes**: Number of consecutive failures before marking unhealthy.
- **gracePeriod**: Time in seconds to wait after instance creation before starting health checks. This gives your application time to start up.

## Building a Good Health Endpoint

The health endpoint is the most important piece of this configuration. A poorly designed health check can cause either false positives (unhealthy instances reported as healthy) or false negatives (healthy instances reported as unhealthy).

Here is what a good health endpoint looks like in Node.js:

```javascript
// health.js - Application health check endpoint
const express = require('express');
const app = express();

// Track application readiness
let isReady = false;

// Startup logic - set ready when app is initialized
async function initialize() {
  // Wait for database connection
  await connectToDatabase();
  // Wait for cache to warm up
  await warmCache();
  // Mark as ready
  isReady = true;
}

// Health check endpoint
// Returns 200 when healthy, 503 when unhealthy
app.get('/health', async (req, res) => {
  if (!isReady) {
    // Application is still starting up
    return res.status(503).json({ status: 'starting' });
  }

  try {
    // Check critical dependencies
    await checkDatabaseConnection();
    await checkCacheConnection();

    // All checks passed
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // A dependency is down
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

initialize();
app.listen(8080);
```

Key principles for health endpoints:

**Check critical dependencies**: If your app needs a database to function, the health check should verify the database connection is alive.

**Be fast**: Health probes run frequently. The endpoint should respond in under a second. Do not run expensive queries or operations.

**Do not check non-critical dependencies**: If a logging service is down but the app still works, do not fail the health check. Only check dependencies that would make the instance unable to serve requests.

**Return appropriate status codes**: 200 means healthy. Anything else (503, 500, timeout) means unhealthy.

## Enabling Automatic Instance Repair

Health probes become truly powerful when combined with automatic repair. When an instance is detected as unhealthy, the scale set automatically deletes it and creates a replacement.

```bash
# Enable automatic repairs with a grace period
az vmss update \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --set automaticRepairsPolicy.enabled=true \
  --set automaticRepairsPolicy.gracePeriod=PT30M \
  --set automaticRepairsPolicy.repairAction=Replace
```

The **gracePeriod** is crucial. It defines how long after instance creation the health checks start being enforced. Set this to longer than your application's maximum startup time. If your app takes 10 minutes to fully start, set the grace period to 15 or 20 minutes to avoid false positives.

The **repairAction** can be:

- **Replace**: Delete the unhealthy instance and create a new one (default and recommended).
- **Restart**: Restart the unhealthy instance without replacing it.
- **Reimage**: Reimage the instance back to the model image.

## Viewing Instance Health Status

Monitor the health status of your instances:

```bash
# Get health status for all instances
az vmss get-instance-view \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --instance-id "*" \
  --query "[].{InstanceId:instanceId, HealthState:vmHealth.status.code}" \
  -o table
```

Possible health states:

- **Healthy**: The health probe is returning successful responses.
- **Unhealthy**: The health probe is failing.
- **Unknown**: Health status has not been determined yet (instance might still be in the grace period).

## Health Probes with Rolling Upgrades

Health probes are required for rolling upgrades to work properly. During a rolling upgrade, after each batch of instances is updated, the scale set waits for them to pass health checks before proceeding to the next batch.

```bash
# Configure rolling upgrade with health-based progression
az vmss update \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --set upgradePolicy.mode=Rolling \
  --set upgradePolicy.rollingUpgradePolicy.maxBatchInstancePercent=20 \
  --set upgradePolicy.rollingUpgradePolicy.maxUnhealthyInstancePercent=20 \
  --set upgradePolicy.rollingUpgradePolicy.maxUnhealthyUpgradedInstancePercent=20 \
  --set upgradePolicy.rollingUpgradePolicy.pauseTimeBetweenBatches=PT30S
```

If updated instances fail health checks, the rolling upgrade pauses. This prevents a bad update from affecting all instances.

## Common Pitfalls

**Grace period too short**: The most common issue. If the grace period is shorter than your application's startup time, newly created instances will be marked unhealthy and replaced before they finish starting. This creates an endless cycle of instance replacement.

**Health endpoint too strict**: If your health check requires all external services to be responsive, a temporary issue with a non-critical dependency can cause all instances to report unhealthy simultaneously.

**Health endpoint too lenient**: If the health check only verifies that the web server is running (a simple 200 response on any path), it will not detect application-level failures like stuck worker threads, deadlocks, or database connection pool exhaustion.

**No health endpoint at all**: If your application does not have a health endpoint, you will need to use TCP probes, which only check that a port is open. This is better than nothing but cannot detect application-level issues.

## Monitoring Health Probe Results

Track health probe metrics over time to catch trends:

```bash
# Query health state changes from Azure Monitor
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachineScaleSets/myScaleSet" \
  --metric "HealthProbeStatus" \
  --interval PT5M \
  --aggregation Average \
  --start-time 2026-02-16T00:00:00Z \
  --end-time 2026-02-16T23:59:59Z
```

Feed these metrics into OneUptime to get alerts when instances become unhealthy and to track the frequency of automatic repairs. A sudden increase in repair events usually indicates a systemic issue like a bad deployment or a dependency outage.

## Wrapping Up

Application health probes transform a VM Scale Set from a collection of VMs into a self-healing system. Use the Application Health Extension for the most reliable monitoring, build health endpoints that check critical dependencies without being overly strict, set appropriate grace periods for application startup, and enable automatic repairs to replace failed instances without human intervention. This combination gives you a scale set that recovers from failures automatically and keeps your application available even when individual instances go down.
