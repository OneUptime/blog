# Fix Azure VM OverconstrainedAllocationRequest Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Capacity Planning, Troubleshooting, Cloud Infrastructure

Description: Diagnose Azure overconstrained allocation errors by identifying the size, zone, networking, placement, ephemeral disk, and storage constraints involved.

---

`OverconstrainedAllocationRequest` means Azure could not find compute capacity that satisfies the complete combination of requirements in a VM create, start, resize, or scale request. It is not simply a vCPU quota message.

Microsoft lists common contributing constraints including VM size, accelerated networking, availability zone, ephemeral disk, proximity placement group, Ultra Disk, and Premium SSD v2. Each requirement reduces the hardware pools Azure may consider. A valid combination can still be unavailable at a particular time.

## Preserve the exact failure

Start with the deployment operation or Activity log. Record:

- error code and full message;
- correlation ID and operation ID;
- UTC timestamp;
- subscription, region, and zone;
- requested VM size and count;
- whether the operation was Create, Start, Resize, Redeploy, or scale-out.

For a resource-group deployment:

```bash
az deployment operation group list \
  --resource-group myResourceGroup \
  --name myDeployment \
  --query "[?properties.provisioningState=='Failed'].{resource:properties.targetResource.resourceName,message:properties.statusMessage}" \
  --output json
```

For an existing VM, use **Activity log** on the VM resource or query failed events with `az monitor activity-log list`.

Before changing the model, rule out a named quota failure:

```bash
az vm list-usage --location eastus --output table
```

Quota and physical allocation are separate. Free quota does not disprove this error.

## Inventory every placement constraint

Export the effective VM model:

```bash
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "{
    size:hardwareProfile.vmSize,
    zones:zones,
    ppg:proximityPlacementGroup.id,
    host:host.id,
    capacityReservation:capacityReservation.capacityReservationGroup.id,
    osDisk:storageProfile.osDisk,
    dataDisks:storageProfile.dataDisks,
    nics:networkProfile.networkInterfaces
  }" \
  --output json
```

Then inspect NIC accelerated-networking settings and disk SKUs separately:

```bash
az network nic show \
  --resource-group myResourceGroup \
  --name myNic \
  --query "{acceleratedNetworking:enableAcceleratedNetworking,ipConfigurations:ipConfigurations[].privateIPAddress}" \
  --output json
```

For a failed create, inspect the Bicep, ARM template, Terraform plan, or deployment payload because no VM resource may exist yet.

## Test one dimension at a time

Changing several properties at once can make a retry succeed without revealing which constraint mattered. For repeatable operations, create a small matrix:

| Test | Size | Zone | Accelerated networking | PPG | Specialized disk |
|---|---|---|---|---|---|
| Baseline | Original | Original | Original | Original | Original |
| A | Compatible alternative | Original | Original | Original | Original |
| B | Original | Other/new deployment | Original | Original | Original |
| C | Original | Original | Off if supported | Original | Original |
| D | Original | Original | Original | None | Original |

Not every property can be edited in place. A zonal VM cannot normally be moved to another zone by changing a field. Ephemeral OS disk placement and some disk capabilities are creation-time architectural choices. Test those alternatives with a cloned disk or replacement deployment.

## Size and hardware generation

An exact size maps to compatible hardware. A nearby size in the same family may use different capacity, and a newer generation may be easier to allocate than a legacy family.

List candidate SKUs and subscription restrictions:

```bash
az vm list-skus \
  --location eastus \
  --size Standard_D \
  --all \
  --output table
```

Choose alternatives based on application requirements, not only vCPU count. Compare memory, local temporary storage, data-disk count, uncached and cached disk limits, networking, architecture, encryption features, and accelerator support.

For an in-place resize, the current cluster also matters. Deallocating first can expose more sizes, but it does not guarantee capacity and creates downtime.

## Zone constraints

A zonal request can use only compatible hardware in that zone. If another zone works for the workload, deploy a replacement VM there using a copied OS disk or supported migration workflow.

Do not remove a zone merely to make a command pass without revisiting availability design. A regional VM and a zonal VM have different failure-domain behavior.

## Proximity placement groups

PPGs reduce network latency by collocating resources, but they can bind the request to a datacenter that lacks a particular SKU.

For a fully deallocated PPG, Microsoft recommends starting the most restrictive size first. If the PPG is optional, remove the association and retry after evaluating latency. If it is required, keep an approved size set and avoid introducing a rare SKU after the group is anchored.

## Accelerated networking

Accelerated networking requires a supported VM size and network path. Microsoft includes it among common overconstraint contributors. Disabling it can widen options, but may reduce throughput, increase latency, and return packet processing to the vCPU path.

Verify both the intended size's support and the NIC configuration. For a production network-intensive workload, choosing another size that supports accelerated networking is usually safer than silently disabling the feature.

## Ephemeral OS and specialized data disks

Ephemeral OS disks depend on local cache, temporary, or NVMe capacity on the host and on compatible VM sizes. Ultra Disk and Premium SSD v2 also have regional, zonal, and VM-size support requirements.

Microsoft's allocation guidance suggests removing Ultra Disk or Premium SSD v2 constraints when they are optional. That means designing a replacement storage layout or migrating data, not detaching a critical disk casually.

Confirm:

- disk SKU support in the region and zone;
- VM size support;
- whether the VM has enabled the relevant capability;
- required logical sector size and host caching rules;
- data durability and performance requirements of any replacement.

## Availability sets and scale sets

An availability set with some VMs still allocated can constrain a resize or restart to its existing cluster. Coordinated full deallocation allows Azure to search compatible clusters when restarting, but takes down the whole set.

A single-placement-group scale set is also more constrained than a scale set that can span placement groups. For large scale-out requests, smaller batches or a multiple-placement-group design can improve allocation probability. Review orchestration and fault-domain implications before changing an existing scale set.

## A safe remediation order

1. Confirm this is allocation, not quota, policy, or invalid configuration.
2. Retry later once for a potentially transient shortage.
3. Try an application-compatible alternative size.
4. For new deployments, test another zone or region.
5. Remove an optional PPG constraint.
6. Prefer another accelerated-networking-capable size before disabling the feature.
7. Rework ephemeral or specialized disk requirements only with a migration plan.
8. Coordinate whole-set deallocation when an availability set or PPG requires it.
9. Create an on-demand Capacity Reservation ahead of future critical deployments.

If constraints are mandatory and no alternative placement meets them, provide the correlation IDs and timestamps to Azure Support. Repeatedly submitting the same request does not make an incompatible placement valid.

## Prevent the next incident

Maintain a tested fallback SKU for each critical workload and zone. Validate quota for both the primary and fallback family. Use capacity reservations where restart or scale-out must be predictable, and keep placement constraints in infrastructure as code so responders can see why the candidate pool is narrow.

## Official Documentation

- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)
- [Resolve SKU not available errors](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available)
- [Proximity placement groups](https://learn.microsoft.com/en-us/azure/virtual-machines/co-location)
- [On-demand Capacity Reservation overview](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-overview)
