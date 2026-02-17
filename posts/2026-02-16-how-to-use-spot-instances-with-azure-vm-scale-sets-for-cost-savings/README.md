# How to Use Spot Instances with Azure VM Scale Sets for Cost Savings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VM Scale Sets, Spot Instances, Cost Optimization, Cloud Savings, Eviction Policies

Description: Learn how to use Azure Spot VMs with VM Scale Sets to reduce compute costs by up to 90% while handling eviction gracefully.

---

Azure Spot VMs let you use unused Azure compute capacity at massive discounts - up to 90% off the regular pay-as-you-go price. The trade-off is that Azure can take back (evict) these VMs at any time when it needs the capacity for regular-priced customers. For workloads that can tolerate interruptions, Spot VMs with VM Scale Sets offer a compelling way to run large-scale compute at a fraction of the cost.

I use Spot instances extensively for batch processing, CI/CD build agents, development environments, and non-critical data processing pipelines. One of our batch processing jobs that costs about $2,400 per month on regular VMs runs for under $400 on Spot instances.

## How Azure Spot VMs Work

Spot VMs are regular VMs that use Azure's surplus capacity. The key differences from regular VMs:

- **Pricing**: Spot VMs have variable pricing based on supply and demand. The current spot price for a VM size in a region can be checked and you can set a maximum price you are willing to pay.
- **Eviction**: When Azure needs the capacity back or the spot price exceeds your maximum price, your VM is evicted. You get a 30-second warning before eviction.
- **No SLA**: Spot VMs do not have an availability SLA. They can be evicted at any time.
- **Availability**: Not all VM sizes have spot availability in all regions. Capacity varies over time.

## Creating a Spot VM Scale Set

Here is how to create a scale set that uses Spot instances:

```bash
# Create a Spot VM Scale Set
az vmss create \
  --resource-group myResourceGroup \
  --name mySpotScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D4s_v5 \
  --instance-count 5 \
  --priority Spot \
  --eviction-policy Deallocate \
  --max-price -1 \
  --upgrade-policy-mode Manual \
  --admin-username azureuser \
  --generate-ssh-keys \
  --lb myLoadBalancer
```

Let me explain the Spot-specific parameters:

**--priority Spot**: Marks the scale set as using Spot VMs.

**--eviction-policy**: What happens when an instance is evicted.
- `Deallocate`: The VM is stopped and deallocated. The OS disk is preserved, and you can restart the VM later when capacity is available. You stop paying for compute but continue paying for disk storage.
- `Delete`: The VM and its disks are completely deleted. No ongoing costs, but the data is gone.

**--max-price -1**: The maximum price you are willing to pay per hour. Setting it to -1 means "pay up to the regular pay-as-you-go price, never more." This gives you the best chance of not being evicted due to price, though you can still be evicted due to capacity.

You can also set a specific maximum price:

```bash
# Set a specific maximum price (e.g., $0.05 per hour)
az vmss create \
  --resource-group myResourceGroup \
  --name mySpotScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D4s_v5 \
  --instance-count 5 \
  --priority Spot \
  --eviction-policy Delete \
  --max-price 0.05 \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Checking Spot Pricing

Before choosing a VM size and region, check the current spot pricing:

```bash
# Check spot pricing history for a VM size in a region
az vm list-skus \
  --location eastus \
  --size Standard_D4s_v5 \
  --query "[].{Name:name, Location:locationInfo[0].location, Restrictions:restrictions}" \
  -o table
```

The Azure portal has a dedicated Spot pricing page that shows current and historical prices for each VM size and region. Look for VM sizes with consistently low spot prices and low eviction rates.

## Handling Evictions

The most important aspect of running Spot VMs is handling evictions gracefully. Azure sends a notification 30 seconds before eviction through the Azure Metadata Service.

### Monitoring for Eviction Inside the VM

Your application should poll the metadata service and react when eviction is scheduled:

```bash
#!/bin/bash
# eviction-monitor.sh - Monitor for scheduled evictions
# Run this as a systemd service on each instance

while true; do
  # Query the scheduled events endpoint
  RESPONSE=$(curl -s -H "Metadata: true" \
    "http://169.254.169.254/metadata/scheduledevents?api-version=2020-07-01")

  # Check if an eviction event is scheduled
  if echo "$RESPONSE" | grep -q "Preempt"; then
    echo "Eviction detected at $(date)" >> /var/log/eviction.log

    # Gracefully stop the application
    systemctl stop myapp

    # Drain connections from the load balancer
    # Signal the health check to return unhealthy
    touch /tmp/eviction-pending

    # Flush any pending data to external storage
    /opt/myapp/flush-data.sh

    # Acknowledge the event so Azure can proceed
    curl -s -H "Metadata: true" -X POST \
      -d '{"StartRequests": [{"EventId": "'"$(echo $RESPONSE | jq -r '.Events[0].EventId')"'"}]}' \
      "http://169.254.169.254/metadata/scheduledevents?api-version=2020-07-01"

    break
  fi

  # Poll every 5 seconds
  sleep 5
done
```

Set this up as a systemd service:

```ini
# /etc/systemd/system/eviction-monitor.service
[Unit]
Description=Azure Spot VM Eviction Monitor
After=network.target

[Service]
Type=simple
ExecStart=/opt/scripts/eviction-monitor.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Health Check Integration

Modify your health check to return unhealthy when eviction is pending:

```javascript
// health.js - Health endpoint that considers eviction status
const fs = require('fs');
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  // Check if eviction is pending
  if (fs.existsSync('/tmp/eviction-pending')) {
    return res.status(503).json({ status: 'eviction-pending' });
  }

  // Normal health checks
  res.status(200).json({ status: 'healthy' });
});

app.listen(8080);
```

## Mixing Spot and Regular Instances

For workloads that need a baseline of guaranteed capacity with the option to burst cheaply, combine regular and Spot instances. Create two scale sets - one with regular VMs for the baseline and one with Spot VMs for the burst capacity - both behind the same load balancer.

```bash
# Create the baseline scale set with regular VMs
az vmss create \
  --resource-group myResourceGroup \
  --name baseline-vmss \
  --image Ubuntu2204 \
  --vm-sku Standard_D2s_v5 \
  --instance-count 3 \
  --priority Regular \
  --lb myLoadBalancer \
  --backend-pool-name myBackendPool \
  --admin-username azureuser \
  --generate-ssh-keys

# Create the burst scale set with Spot VMs
az vmss create \
  --resource-group myResourceGroup \
  --name burst-vmss \
  --image Ubuntu2204 \
  --vm-sku Standard_D2s_v5 \
  --instance-count 0 \
  --priority Spot \
  --eviction-policy Delete \
  --max-price -1 \
  --lb myLoadBalancer \
  --backend-pool-name myBackendPool \
  --admin-username azureuser \
  --generate-ssh-keys
```

Then configure autoscale on the Spot scale set to expand during high load:

```bash
# Autoscale the Spot scale set based on the baseline's CPU
az monitor autoscale create \
  --resource-group myResourceGroup \
  --resource burst-vmss \
  --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name burst-autoscale \
  --min-count 0 \
  --max-count 20 \
  --count 0

az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name burst-autoscale \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 2

az monitor autoscale rule create \
  --resource-group myResourceGroup \
  --autoscale-name burst-autoscale \
  --condition "Percentage CPU < 30 avg 10m" \
  --scale in 2
```

## Choosing Between Eviction Policies

**Deallocate** is better when:
- Your workload has significant startup time and you want to restart quickly when capacity returns.
- The OS disk has valuable state (though for scale sets, this should be rare).
- You want to preserve the instance identity.

**Delete** is better when:
- You want to minimize costs (no ongoing disk charges for evicted instances).
- Your instances are truly stateless and can be recreated from scratch.
- You are using autoscale to replace evicted instances with new ones.

For most scale set use cases, `Delete` is the right choice because scale set instances should be stateless and replaceable.

## Best Practices for Spot Scale Sets

### Use Multiple VM Sizes

Azure may not have spot capacity for one specific VM size, but similar sizes might be available. Use the Flexible orchestration mode to specify multiple acceptable VM sizes:

```json
{
  "type": "Microsoft.Compute/virtualMachineScaleSets",
  "properties": {
    "orchestrationMode": "Flexible",
    "platformFaultDomainCount": 1,
    "virtualMachineProfile": {
      "priority": "Spot",
      "evictionPolicy": "Delete",
      "billingProfile": {
        "maxPrice": -1
      }
    }
  }
}
```

### Spread Across Regions

If your workload is region-flexible, deploy Spot scale sets in multiple regions. When one region has evictions, the others likely will not.

### Checkpoint Your Work

For batch processing, save checkpoints to external storage frequently. When an instance is evicted, another instance can pick up from the last checkpoint instead of starting over.

### Set Up Eviction Alerts

```bash
# Create a metric alert for eviction events
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "spot-eviction-alert" \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachineScaleSets/mySpotScaleSet" \
  --condition "count VmAvailabilityMetric < 1" \
  --description "Spot VM evictions detected" \
  --action-group myActionGroup
```

## Cost Analysis

Track your savings by comparing Spot pricing to regular pricing:

```bash
# View current instance count and compute costs
az vmss list-instances \
  --resource-group myResourceGroup \
  --name mySpotScaleSet \
  --query "[].{InstanceId:instanceId, State:provisioningState}" -o table
```

Use Azure Cost Management to compare Spot VM costs against what the same usage would cost on regular VMs. The savings are typically 60-90% depending on the VM size, region, and time of day.

Integrate cost monitoring with OneUptime to track both the operational health and cost efficiency of your Spot-based workloads. An unexpected spike in evictions often correlates with a capacity crunch that might also affect your regular workloads.

## Wrapping Up

Spot instances with VM Scale Sets are a powerful cost optimization tool. The key is designing for interruption - assume any instance can disappear at any moment and build your application accordingly. Use eviction monitoring to gracefully shut down, checkpoint work to external storage, mix Spot and regular instances for guaranteed baseline capacity, and spread across multiple VM sizes and regions. The cost savings are substantial, and with proper architecture, the reliability trade-off is manageable.
