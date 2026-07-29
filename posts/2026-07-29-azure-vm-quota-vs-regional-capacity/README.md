# Azure VM Quota vs Regional Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Quota, Capacity Planning, Cloud Infrastructure

Description: Distinguish Azure subscription vCPU quota from physical regional capacity and troubleshoot deployments that fail despite apparently free cores.

---

Free vCPU quota means your subscription is permitted to request more compute. It does not mean Azure currently has hardware for the requested VM size in the chosen region, zone, and placement scope.

Azure evaluates quota and capacity as separate gates:

```text
deployment succeeds
  = subscription quota permits the request
  AND a compatible SKU is available to the subscription
  AND physical capacity satisfies every placement constraint
```

Passing one gate says nothing conclusive about the others.

## Azure VM quota has two vCPU tiers

For standard pay-as-you-go VMs, Azure Resource Manager enforces at least two relevant vCPU limits per subscription and region:

1. **Total Regional vCPUs**, across standard VM families in that region.
2. **VM-family vCPUs**, such as the D-series family quota in that region.

A new eight-vCPU D-series VM needs eight units available under both limits. Having 40 regional vCPUs free does not help if the D-family limit has only four free.

Spot vCPUs use separate quota. Azure also has other limits, including the total number of VMs in a region and service-specific limits.

Check the actual subscription and region:

```bash
az account show --query "{subscription:id,name:name}" --output table

az vm list-usage \
  --location eastus \
  --output table
```

Quota is regional. A limit in East US does not apply to West Europe, and limits in another subscription do not apply to the current one.

## Deallocated VMs can consume quota

Compute quota accounting includes allocated and deallocated VM cores. A VM in `Stopped (deallocated)` releases physical host capacity and stops its normal compute usage charge, but its configured vCPUs can still count against subscription quota.

That distinction explains an otherwise confusing combination:

- the VM no longer holds a host;
- its managed disks persist;
- its configured cores still contribute to quota usage;
- starting it still needs physical allocation.

Delete unused VM resources, not just deallocate them, when the goal is to free quota. Review delete options so important disks are not accidentally removed.

## Capacity is real hardware at a particular scope

Capacity is Azure's ability to satisfy the requested compute properties now. It can vary across:

- regions and availability zones;
- VM families and exact sizes;
- hardware generations;
- clusters behind an availability set;
- proximity placement groups;
- Dedicated Hosts;
- accelerator, local disk, and networking capabilities;
- Ultra Disk and Premium SSD v2 combinations;
- Spot and pay-as-you-go pools.

Azure normally searches multiple compatible clusters. A zone, partially allocated availability set, proximity placement group, or specialized hardware requirement can narrow the request to a much smaller pool.

Quota cannot widen that pool. A quota increase approves a larger request from the subscription; it does not add servers to a zone.

## Read the error code first

Common categories are:

| Error | What it usually indicates | First action |
|---|---|---|
| `OperationNotAllowed` with quota details | Regional or family quota exhausted | Check usage and request the named quota |
| `AllocationFailed` | Suitable compute capacity not found | Retry later or change size/location |
| `ZonalAllocationFailed` | Suitable capacity not found in one zone | Try a supported size or another deployment zone |
| `OverconstrainedAllocationRequest` | Combined constraints leave no candidate placement | Inventory and relax optional constraints |
| `SkuNotAvailable` | SKU restricted or unavailable for subscription/location/zone | Inspect SKU restrictions and alternatives |

Get the failed deployment operations or the VM Activity log rather than relying on the portal's summary banner:

```bash
az deployment operation group list \
  --resource-group myResourceGroup \
  --name myDeployment \
  --query "[?properties.provisioningState=='Failed'].properties.statusMessage" \
  --output json
```

For a Start or Resize action, inspect the VM resource's Activity log.

## SKU listings are not a capacity promise

Use `az vm list-skus` to find sizes offered in a location and restrictions that apply to the current subscription:

```bash
az vm list-skus \
  --location eastus \
  --size Standard_D \
  --all \
  --query "[?resourceType=='virtualMachines'].{name:name,zones:locationInfo[0].zones,restrictions:restrictions}" \
  --output table
```

`NotAvailableForSubscription` is useful evidence of a restriction. An empty restrictions list means the SKU is generally selectable for the subscription; it does not reserve live inventory. A deployment can still receive an allocation failure moments later.

Likewise, a size visible in the portal is a candidate configuration, not a guarantee that every requested instance can be placed.

## Fix quota failures

In the Azure portal, open **Quotas**, select **Compute**, choose the subscription and region, and inspect both Total Regional vCPUs and the required VM family. Request the smallest limit that covers near-term demand plus an operational buffer.

Quota increases can be automated through the Azure Quota APIs, but requests can require review and are not always approved. Make quota checks part of deployment readiness instead of discovering limits during an incident.

If the family quota increases, verify that Total Regional vCPUs is also sufficient. Treat Spot quota separately.

## Fix capacity failures

For a transient `AllocationFailed`:

1. Retry later with bounded backoff.
2. Use an Azure-recommended alternative VM size if it meets requirements.
3. Try a different zone for a new deployment.
4. Remove optional placement constraints.
5. Deploy or migrate to another region when architecture permits.

For availability sets, a partially deallocated set can remain tied to its original cluster. A coordinated full deallocation may let Azure search other compatible clusters when the set starts again, at the cost of downtime.

For proximity placement groups, start the most restrictive SKU first after full deallocation. Consider whether the latency requirement justifies the reduced placement flexibility.

## Reserve capacity when starts must be predictable

An on-demand Capacity Reservation reserves a quantity of one VM size in a region or zone. The reservation request itself must pass both quota and capacity checks. Once accepted and correctly associated with matching VMs, it provides a capacity guarantee within the documented service terms.

Do not confuse it with:

- **Azure Reservations**, which provide term-based billing discounts;
- **Azure savings plans**, which provide flexible compute discounts;
- **quota**, which grants permission to deploy;
- **availability zones**, which provide failure-domain separation but not unlimited inventory.

A robust critical workload often needs all four concerns addressed independently: quota headroom, reserved or diversified capacity, availability architecture, and cost optimization.

## Build a preflight check

Before a large deployment, record:

- subscription and tenant;
- region and zone;
- exact VM sizes and instance count;
- Total Regional and family quota usage;
- SKU restrictions;
- PPG, availability set, disk, networking, and host constraints;
- whether capacity is reserved;
- tested alternative sizes and locations.

No public query can promise unreserved capacity at deployment time. Design an alternative path rather than interpreting free quota as inventory.

## Official Documentation

- [Check vCPU quotas for Azure VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/quotas)
- [Request a quota increase in the Azure portal](https://learn.microsoft.com/en-us/azure/quotas/quickstart-increase-quota-portal)
- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)
- [Resolve SKU not available errors](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available)
- [On-demand Capacity Reservation overview](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-overview)
