# How to Configure Overprovisioning in Azure VM Scale Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VM Scale Sets, Overprovisioning, Performance, Scaling, Resource Management

Description: Understand how overprovisioning works in Azure VM Scale Sets and when to enable or disable it for faster and more reliable scaling.

---

When you tell an Azure VM Scale Set to create 10 instances, it might actually create 12 or 13 behind the scenes. This is overprovisioning - Azure creates more instances than requested, waits for the required number to provision successfully, and then deletes the extras. It sounds wasteful, but it dramatically improves provisioning reliability and speed. You do not get charged for the extra instances because they are deleted within seconds of the target count being reached.

Overprovisioning is enabled by default on scale sets, and most of the time you should leave it that way. But there are situations where it causes problems, and understanding how it works helps you make the right choice for your workload.

## Why Overprovisioning Exists

VM provisioning in Azure is not 100% reliable on any single attempt. An individual VM creation request can fail for a variety of reasons - capacity constraints, transient platform errors, or allocation failures. In a large-scale deployment, if you request 50 instances, there is a real chance that 1-3 of those requests will fail on the first try.

Without overprovisioning, a request for 10 instances might result in 9, and then you wait for the retry to bring up the 10th. With overprovisioning, Azure requests 12 instances, and even if 2 fail, you still get your 10 immediately.

The benefits:

- **Faster provisioning**: The target count is reached sooner because Azure does not need to wait for retries.
- **Higher reliability**: Individual provisioning failures do not delay the overall operation.
- **No extra cost**: Extra instances are deleted as soon as the target count is reached. You are only billed for the instances that remain.

## How It Works Technically

When overprovisioning is enabled:

1. You request N instances (say, 10).
2. Azure creates N + buffer instances (say, 12). The buffer is typically 10-20% extra, adjusted dynamically by Azure.
3. Azure waits for N instances to reach a "Creating" or "Succeeded" state.
4. The excess instances are immediately deleted.
5. Your scale set ends up with exactly N healthy instances.

The entire process happens transparently. You do not see the extra instances in your billing, and they exist for such a short time that they typically do not even show up in monitoring.

## Checking the Overprovisioning Setting

```bash
# Check if overprovisioning is enabled on your scale set
az vmss show \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --query "overprovision" -o tsv
```

The default is `true` for scale sets created through the CLI, ARM templates, and the portal.

## Disabling Overprovisioning

There are specific scenarios where overprovisioning should be disabled:

### Scenario 1: Per-Instance Configuration

If your application assigns unique identities or configurations to each instance (for example, each instance registers itself with a specific shard assignment), the extra instances created by overprovisioning will also register and then be deleted. This can leave orphaned registrations in your system.

```bash
# Disable overprovisioning
az vmss update \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --set overprovision=false

# Or during creation
az vmss create \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D2s_v5 \
  --instance-count 5 \
  --disable-overprovision \
  --admin-username azureuser \
  --generate-ssh-keys
```

### Scenario 2: Custom Script Extensions with Side Effects

If your Custom Script Extension does something that should only happen once per "real" instance (like registering with a license server, creating DNS records, or sending notifications), overprovisioning can trigger those side effects for instances that are immediately deleted.

### Scenario 3: Limited Quota

If your subscription has tight vCPU quota, overprovisioning might push you over the limit. For example, if you have quota for exactly 20 vCPUs and request a scale set with 10 instances of 2-vCPU VMs (20 vCPUs), overprovisioning will try to create 12 instances (24 vCPUs) and fail.

### Scenario 4: Static IP Assignment

When using Azure IP configurations that assign specific IPs from a pool, overprovisioned instances consume IP addresses from the pool. If the pool is small, this can cause allocation failures.

## Enabling Overprovisioning

If overprovisioning was disabled and you want to turn it back on:

```bash
# Enable overprovisioning
az vmss update \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --set overprovision=true
```

## Overprovisioning with Different Upgrade Policies

Overprovisioning interacts differently with each upgrade policy:

### With Manual Upgrade Policy

Overprovisioned instances are created with the latest scale set model and then deleted. No manual intervention is needed.

### With Automatic Upgrade Policy

Overprovisioned instances are treated like regular instances during the brief time they exist. They receive the latest model configuration.

### With Rolling Upgrade Policy

During a rolling upgrade, overprovisioning is not used for the upgrade batches themselves. It only applies during initial provisioning and scale-out events.

## Overprovisioning and Load Balancers

When overprovisioning is enabled with a load balancer, the extra instances are briefly added to the load balancer's backend pool. However, because they are deleted so quickly (usually within seconds), they rarely receive any actual traffic.

If your load balancer uses connection draining with a long timeout, the extra instances might hold connections open during deletion. This is usually not an issue in practice, but it is worth knowing.

## ARM Template Configuration

Here is how to configure overprovisioning in an ARM template:

```json
{
  "type": "Microsoft.Compute/virtualMachineScaleSets",
  "apiVersion": "2023-07-01",
  "name": "myScaleSet",
  "location": "eastus",
  "properties": {
    "overprovision": true,
    "upgradePolicy": {
      "mode": "Rolling"
    },
    "virtualMachineProfile": {
      "storageProfile": {
        "imageReference": {
          "publisher": "Canonical",
          "offer": "0001-com-ubuntu-server-jammy",
          "sku": "22_04-lts-gen2",
          "version": "latest"
        }
      }
    }
  },
  "sku": {
    "name": "Standard_D2s_v5",
    "tier": "Standard",
    "capacity": 5
  }
}
```

## Measuring the Impact

To understand how overprovisioning affects your provisioning times, compare the time it takes to provision instances with and without overprovisioning.

```bash
# Time a scale-out operation with overprovisioning enabled
time az vmss scale \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --new-capacity 10

# Disable overprovisioning and time the same operation
az vmss update \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --set overprovision=false

time az vmss scale \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --new-capacity 20
```

In my experience, overprovisioning reduces provisioning time by 15-30% for large scale-out operations (10+ instances). For small operations (1-2 instances), the difference is minimal.

## Overprovisioning with Spot Instances

If your scale set uses Spot VMs (for cost savings), overprovisioning is particularly valuable. Spot VM allocation is more likely to fail than regular VMs because of capacity constraints. Overprovisioning compensates for this by requesting extra instances.

```bash
# Create a spot scale set with overprovisioning (default)
az vmss create \
  --resource-group myResourceGroup \
  --name mySpotScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D2s_v5 \
  --instance-count 10 \
  --priority Spot \
  --eviction-policy Deallocate \
  --max-price -1 \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Common Misconceptions

**"Overprovisioning costs money."** It does not. Extra instances exist for seconds and are not billed.

**"Overprovisioning creates more instances than I asked for."** It creates more temporarily during provisioning, but your scale set always ends up with exactly the count you specified.

**"Overprovisioning doubles my instances."** The overprovision buffer is typically 10-20%, not 100%.

**"I should always enable overprovisioning."** Almost always, but not if your instances have side effects during creation that should only happen for permanent instances.

## Monitoring Overprovisioning Behavior

While Azure does not expose overprovision-specific metrics, you can infer its behavior from the activity log:

```bash
# Look for create and delete events during scale-out
az monitor activity-log list \
  --resource-group myResourceGroup \
  --offset 1h \
  --query "[?contains(operationName.value, 'virtualMachineScaleSets')].{Time:eventTimestamp, Operation:operationName.localizedValue, Status:status.localizedValue}" \
  -o table
```

You will see create events followed quickly by delete events for the overprovisioned instances.

Using OneUptime to track scale-out duration and instance count over time helps you verify that overprovisioning is delivering faster provisioning without any negative side effects.

## Wrapping Up

Overprovisioning is a simple but effective optimization for VM Scale Sets. It improves provisioning speed and reliability at no extra cost, and it is enabled by default for good reason. Disable it only when your instances have creation side effects that should not happen for temporary instances, when you have tight quota constraints, or when you need deterministic instance identity assignment. For the vast majority of stateless, scale-out workloads, leave it on and enjoy faster, more reliable scaling.
