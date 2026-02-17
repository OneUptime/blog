# How to Deploy Azure Spot Virtual Machines to Reduce Compute Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Spot VMs, Virtual Machine, Cost Optimization, Cloud Computing, Azure CLI, Budget

Description: Learn how to deploy Azure Spot Virtual Machines to save up to 90% on compute costs, with strategies for handling evictions gracefully.

---

Azure Spot Virtual Machines let you use unused Azure compute capacity at heavily discounted prices - we are talking up to 90% off compared to pay-as-you-go rates. The catch is that Azure can evict your VM at any time when it needs the capacity back. This makes Spot VMs ideal for workloads that can tolerate interruptions, like batch processing, CI/CD pipelines, dev/test environments, and stateless web workers.

In this post, I will show you how to deploy Spot VMs, configure eviction policies, set maximum prices, and build resilient architectures that handle evictions gracefully.

## How Spot VMs Work

Azure Spot VMs take advantage of surplus capacity in Azure datacenters. When demand is low, plenty of capacity is available and your Spot VM runs happily at a steep discount. When demand spikes and Azure needs that capacity for pay-as-you-go or reserved customers, your Spot VM gets evicted.

The pricing is dynamic. The current spot price for a given VM size in a given region fluctuates based on supply and demand. You can set a maximum price you are willing to pay. If the spot price goes above your max, the VM gets evicted.

## Checking Spot Prices

Before deploying, check the current and historical spot prices:

```bash
# Check the current spot price for a specific VM size and region
az rest --method post \
  --uri "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.Compute/locations/eastus/spotPriceHistory?api-version=2024-07-01" \
  --body '{"vmSizes": ["Standard_D4s_v5"]}'
```

You can also check pricing in the Azure portal under "Pricing" when creating a VM and selecting the Spot option. The portal shows the current spot price, the pay-as-you-go price, and the savings percentage.

## Creating a Spot VM

Creating a Spot VM is almost identical to creating a regular VM, with a couple of extra flags:

```bash
# Create an Azure Spot VM with a maximum price and eviction policy
az vm create \
  --resource-group myResourceGroup \
  --name mySpotVM \
  --image Ubuntu2204 \
  --size Standard_D4s_v5 \
  --priority Spot \
  --max-price 0.08 \
  --eviction-policy Deallocate \
  --admin-username azureuser \
  --generate-ssh-keys
```

Let me explain the Spot-specific parameters:

- `--priority Spot`: This is what makes it a Spot VM instead of a regular VM.
- `--max-price`: The maximum hourly price you are willing to pay in USD. Set this to `-1` to accept any price up to the pay-as-you-go rate (recommended for most cases).
- `--eviction-policy`: What happens when the VM is evicted. Options are `Deallocate` (VM is stopped but disks are preserved) or `Delete` (VM and disks are deleted).

## Eviction Policies Explained

**Deallocate**: The VM is stopped and deallocated. The disks, NICs, and public IPs are preserved. You can restart the VM later when capacity becomes available. You still pay for disk storage while deallocated but not for compute. This is the right choice when you want to preserve state and restart later.

**Delete**: The VM and all its resources are deleted. This is cleaner for ephemeral workloads where the VM is completely disposable. Pair this with automation that recreates VMs as needed.

For most scenarios, I recommend `Deallocate` because it gives you the option to manually restart the VM or have automation do it.

## Setting the Maximum Price

The max price parameter gives you control over your spending:

```bash
# Set max price to -1 to accept up to the pay-as-go rate (maximum savings window)
az vm create \
  --resource-group myResourceGroup \
  --name mySpotVM \
  --image Ubuntu2204 \
  --size Standard_D4s_v5 \
  --priority Spot \
  --max-price -1 \
  --eviction-policy Deallocate \
  --admin-username azureuser \
  --generate-ssh-keys
```

Setting `--max-price -1` means you will pay whatever the current spot price is, up to the full pay-as-you-go rate. Your VM will only be evicted for capacity reasons, not price reasons. This maximizes the time your VM stays running.

Setting a specific price like `--max-price 0.05` means you will be evicted if the spot price rises above $0.05/hour, even if Azure does not need the capacity back. Use this when you have a strict budget.

## Handling Eviction Notifications

Azure sends a 30-second warning before evicting a Spot VM. Your application can check for this notification through the Azure Instance Metadata Service (IMDS):

```bash
# Query the scheduled events endpoint to check for pending evictions
curl -H "Metadata:true" \
  "http://169.254.169.254/metadata/scheduledevents?api-version=2020-07-01"
```

You can run this check in a background process on your VM. Here is a simple polling script:

```bash
#!/bin/bash
# Poll for Spot VM eviction notifications every 5 seconds

while true; do
  # Query the scheduled events endpoint
  RESPONSE=$(curl -s -H "Metadata:true" \
    "http://169.254.169.254/metadata/scheduledevents?api-version=2020-07-01")

  # Check if there is a Preempt event
  if echo "$RESPONSE" | grep -q "Preempt"; then
    echo "Eviction notice received! Saving state..."

    # Perform your graceful shutdown tasks here
    # - Save application state to external storage
    # - Drain connections from the load balancer
    # - Flush any in-memory caches
    # - Send a notification to your team

    /opt/myapp/graceful-shutdown.sh

    echo "Shutdown complete. VM will be evicted shortly."
    break
  fi

  sleep 5
done
```

Thirty seconds is not a lot of time, so your shutdown procedure needs to be fast. Focus on saving the most critical state.

## Using Spot VMs with VM Scale Sets

Spot VMs are most powerful when used with Virtual Machine Scale Sets (VMSS). A scale set can automatically replace evicted Spot VMs:

```bash
# Create a VM Scale Set with Spot VMs
az vmss create \
  --resource-group myResourceGroup \
  --name mySpotScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D4s_v5 \
  --instance-count 5 \
  --priority Spot \
  --max-price -1 \
  --eviction-policy Delete \
  --single-placement-group false \
  --admin-username azureuser \
  --generate-ssh-keys
```

With the `Delete` eviction policy, evicted instances are removed from the scale set. The scale set then tries to create new instances to maintain the desired count. If capacity is available, replacements spin up automatically.

You can also mix Spot and regular VMs in the same scale set:

```bash
# Create a scale set that uses a mix of regular and Spot VMs
az vmss create \
  --resource-group myResourceGroup \
  --name myMixedScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D4s_v5 \
  --instance-count 10 \
  --regular-priority-count 2 \
  --regular-priority-percentage 20 \
  --priority Spot \
  --max-price -1 \
  --eviction-policy Delete \
  --admin-username azureuser \
  --generate-ssh-keys
```

This creates a scale set where 20% of instances are regular (always-on) VMs and 80% are Spot. The regular VMs ensure a minimum baseline of capacity, while Spot VMs handle the bulk of the workload at reduced cost.

## Workloads That Work Well with Spot VMs

**Batch processing**: Jobs that can be split into small, independent units. If a VM is evicted, only the current unit is lost and can be retried.

**CI/CD build agents**: Build servers that run jobs on demand. An eviction just means the current build fails and gets retried.

**Dev/test environments**: Development and testing environments where an occasional interruption is acceptable.

**Stateless web workers**: Web servers behind a load balancer that do not hold any local state. The load balancer detects the eviction and routes traffic to other instances.

**Big data processing**: Spark, Hadoop, or similar frameworks that can handle node failures and redistribute work.

## Workloads to Avoid on Spot VMs

**Databases**: Do not run primary database instances on Spot VMs. The eviction risk is too high for stateful, write-heavy workloads.

**Single-instance applications**: If you only have one instance and it gets evicted, your application is down.

**Long-running jobs without checkpointing**: If your job takes 12 hours and cannot save progress, an eviction at hour 11 means starting over.

## Cost Comparison Example

Here is a rough comparison for Standard_D4s_v5 in East US:

| Pricing Model | Hourly Rate | Monthly Estimate (730 hrs) | Savings |
|---------------|-------------|---------------------------|---------|
| Pay-as-you-go | ~$0.192 | ~$140 | Baseline |
| 1-year Reserved | ~$0.121 | ~$88 | ~37% |
| 3-year Reserved | ~$0.077 | ~$56 | ~60% |
| Spot (typical) | ~$0.020-0.040 | ~$15-29 | ~80-90% |

The actual Spot price varies by region, time of day, and overall Azure demand. But even in the worst case, Spot VMs are significantly cheaper than pay-as-you-go.

## Monitoring Eviction Rates

Azure publishes eviction rate data by VM size and region. You can use this data to choose sizes and regions with lower eviction rates:

```bash
# Get the eviction rate profile for a region
az rest --method get \
  --uri "https://management.azure.com/subscriptions/{sub-id}/providers/Microsoft.Compute/locations/eastus/spotEvictionRates?api-version=2024-07-01"
```

Choose VM sizes that have lower eviction rates if your workload is sensitive to interruptions. Newer VM sizes and less popular regions tend to have more available capacity.

## Wrapping Up

Azure Spot VMs are one of the most effective ways to reduce compute costs on Azure. The key to using them successfully is designing for eviction. Use them for workloads that can handle interruptions, implement graceful shutdown procedures, and combine them with VM Scale Sets for automatic replacement. The savings are substantial - often 80% or more - and with the right architecture, the reliability trade-off is well worth it.
