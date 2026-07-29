# Why Won't a Deallocated Azure VM Start Again?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Capacity Planning, Quota, Troubleshooting

Description: Diagnose a deallocated Azure VM that cannot start because of capacity, quota, zone, availability set, placement, or Spot constraints.

---

A deallocated Azure VM has released its own compute allocation. Starting it is therefore a new allocation request, not merely a guest boot. The VM's disks and configuration can be healthy while Azure is temporarily unable to place the requested size under all of its existing constraints.

First capture the exact error from the Activity log. `AllocationFailed`, `ZonalAllocationFailed`, `OverconstrainedAllocationRequest`, `SkuNotAvailable`, and quota errors describe different problems and require different fixes.

## Deallocation usually trades placement for lower cost

While a VM is `Stopped (deallocated)`, Azure does not bill the VM compute instance and normally does not hold a host slot for it. Other resources can continue to incur charges: a provisioned Dedicated Host remains billed even without running VMs, and an on-demand Capacity Reservation remains billed while preserving its reserved capacity independently of the VM's power state. At the next start, the Compute platform must find hardware that satisfies properties such as:

- VM size and processor generation;
- region and availability zone;
- availability set or scale-set placement scope;
- proximity placement group;
- accelerated networking support;
- ephemeral OS disk requirements;
- Ultra Disk or Premium SSD v2 support;
- Dedicated Host or capacity reservation association;
- Spot capacity and maximum-price rules.

The more constraints the model has, the smaller the candidate hardware pool becomes.

## Read the control-plane error

In the portal, open the VM's **Activity log**, select the failed Start operation, and inspect its JSON and error details. From the CLI:

```bash
VM_ID=$(az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query id \
  --output tsv)

az monitor activity-log list \
  --resource-id "$VM_ID" \
  --status Failed \
  --offset 2h \
  --output json
```

Do not use an SSH or RDP timeout to classify the issue. If Start succeeded but the guest is unreachable, troubleshoot boot and networking. If Start itself failed, stay in the allocation, quota, policy, or resource-model layer.

## Separate quota from capacity

Azure checks quota and physical capacity separately.

A standard VM deployment must fit both the subscription's **Total Regional vCPUs** quota and its VM-family vCPU quota. Deallocated VMs still count toward compute quota, so deallocation does not necessarily free quota. Check current usage:

```bash
az vm list-usage --location eastus --output table
```

A quota error names the limit that must be increased or freed. Request an increase through **Quotas** in the portal, or remove unused VM resources if appropriate.

An allocation failure means Azure could not find suitable hardware in the candidate region, zone, or cluster at that time. Raising quota cannot create physical capacity.

## Match the error to the constraint

### AllocationFailed

For a standalone regional VM, retry later or choose a supported alternative size. If the workload can move, create or migrate it to another zone or region. Do not repeatedly loop aggressive retries; use bounded retries and preserve the original error for support.

### ZonalAllocationFailed

The selected zone has no suitable capacity for that request. Another zone may have capacity, but an existing zonal VM cannot simply have its zone property edited. Moving it normally means creating a VM from copied disks or using a supported migration process.

### OverconstrainedAllocationRequest

Azure may have capacity for the size but not for the combination of size, zone, accelerated networking, local/ephemeral disk, proximity placement, and specialized disk requirements. Inventory the model before changing anything:

```bash
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "{size:hardwareProfile.vmSize,zones:zones,availabilitySet:availabilitySet.id,scaleSet:virtualMachineScaleSet.id,ppg:proximityPlacementGroup.id,host:host.id,hostGroup:hostGroup.id,capacityReservation:capacityReservation.capacityReservationGroup.id,storage:storageProfile,networkInterfaces:networkProfile.networkInterfaces[].id}" \
  --output json

az network nic show \
  --ids $(az vm show \
    --resource-group myResourceGroup \
    --name myVM \
    --query "networkProfile.networkInterfaces[].id" \
    --output tsv) \
  --query "[].{name:name,acceleratedNetworking:enableAcceleratedNetworking}" \
  --output table
```

Relax only constraints the workload does not need. Removing accelerated networking or specialized disk requirements can affect performance and may require other model changes.

### SkuNotAvailable

The size can be restricted for the subscription, location, or zone. Inspect advertised SKU restrictions:

```bash
az vm list-skus \
  --location eastus \
  --size Standard_D \
  --all \
  --output table
```

This list is useful for supportability and subscription restrictions, but it is not a guarantee of real-time free capacity.

## Availability sets need special handling

When only some VMs in an availability set are deallocated, starting one of them is constrained to the cluster hosting the still-allocated members. That cluster might lack the requested size or free capacity.

Microsoft's documented workaround is to stop and deallocate **all** VMs in the availability set, then start the required VMs together. Full deallocation lets Azure search across clusters that support the set's sizes. This causes downtime for every member, so plan and approve the outage first.

Check available sizes for the availability set rather than assuming every regional size is usable. A resize within the currently allocated cluster can also fail for the same reason.

## Proximity placement groups can pin the search

A proximity placement group aims to keep resources physically close. That latency constraint can make a start fail even though the region has capacity elsewhere.

For a fully deallocated group, Microsoft recommends starting the most restrictive VM size first. That lets the group anchor to a datacenter capable of the hardest-to-place SKU. If low latency is optional, removing the PPG association widens the placement search, but test latency and architecture consequences before doing so.

## Spot VMs are not guaranteed to return

A deallocated Azure Spot VM has no capacity guarantee. Starting it can fail because Spot capacity is unavailable or because the configured maximum price is below the current price. The disks can continue to incur charges while the VM remains deallocated.

Design Spot workloads so another instance, size, zone, or region can replace the VM. A manually retained Spot VM is not a reliable recovery plan.

## Capacity reservations are a proactive answer for supported workloads

On-demand Capacity Reservation reserves a specific VM size in a region or zone. It is distinct from an Azure Reservation:

- a capacity reservation secures deployment capacity and is charged at applicable VM rates;
- a Reserved VM Instance is a billing discount and does not by itself guarantee capacity.

The capacity reservation must exist and match the VM properties, and creating one is itself subject to quota and available capacity. It is a preventive control, not a guaranteed way to recover after a region is already constrained.

Capacity reservations do not support every placement model. Current exclusions include Spot VMs, availability sets, Dedicated Host nodes and VMs, proximity placement groups, Ultra Disk, and single-placement-group scale sets.

## Safe recovery order

Use the least disruptive option that meets the workload's requirements:

1. Record the error code, operation ID, region, zone, SKU, and time.
2. Check both regional and VM-family quota.
3. Retry once after a reasonable interval for a transient allocation failure.
4. Try a compatible alternative size in the same placement scope.
5. Review and, when safe, remove optional constraints.
6. For an availability set or PPG, coordinate full deallocation and startup order.
7. Recreate or migrate in another zone or region if the recovery objective requires it.
8. Where the workload is supported, use on-demand Capacity Reservation for future critical starts.

Do not delete a VM merely because Start failed. Preserve its managed disks and configuration until a tested replacement is online.

## Official Documentation

- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)
- [Check Azure VM vCPU quotas](https://learn.microsoft.com/en-us/azure/virtual-machines/quotas)
- [Resolve SKU not available errors](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available)
- [On-demand Capacity Reservation overview](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-overview)
- [Azure Spot Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms)
