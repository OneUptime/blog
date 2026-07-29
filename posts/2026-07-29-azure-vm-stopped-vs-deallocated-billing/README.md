# Why Is My Azure VM Still Charging After Shutdown?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Cost Management, FinOps, Cloud Computing

Description: Explain Azure VM stopped and deallocated states, identify charges that remain after deallocation, and verify that compute billing has ended.

---

Shutting down an Azure virtual machine from inside Windows or Linux does not necessarily release its host. If Azure reports the VM as **Stopped**, the VM is powered off but still allocated to a host, so compute billing continues. To confirm that the allocation has been fully released, wait until the VM reaches **Stopped (deallocated)**, also shown by the instance-view power state `PowerState/deallocated`. Azure also marks the transitional **Deallocating** state as not billed for VM instance usage.

Deallocation does not delete the VM. Its configuration and persistent managed disks remain. Those retained resources explain why a deallocated VM can still produce a bill.

## Stopped and deallocated are different states

The important distinction is allocation, not whether the guest operating system is running:

| Azure power state | Guest running | Host capacity held | VM compute billed |
|---|---:|---:|---:|
| Running | Yes | Yes | Yes |
| Stopped | No | Yes | Yes |
| Deallocating | No | Being released | No VM compute charge |
| Deallocated | No | No | No VM compute charge |

A shutdown initiated with `shutdown`, `poweroff`, or the Windows Start menu normally powers off the guest. Azure can therefore show `Stopped`, because the platform did not receive a request to release the compute allocation.

By contrast, the Azure portal **Stop** action and the Azure deallocate API release the allocation. Do not infer the billing state from a monitoring agent going quiet or from an RDP/SSH failure. Read the platform power state.

## Verify the state Azure is billing

In the portal, open **Virtual machines**, select the VM, and check **Status** on the Overview page. The stable terminal value that confirms the allocation has been released is **Stopped (deallocated)**.

With Azure CLI, query instance view rather than only the resource's provisioning state:

```bash
az vm get-instance-view \
  --resource-group myResourceGroup \
  --name myVM \
  --query "instanceView.statuses[?starts_with(code, 'PowerState/')].{code:code,status:displayStatus}" \
  --output table
```

`ProvisioningState/succeeded` means that the most recent control-plane operation on the VM succeeded. It does not mean the VM is running, and it is not a billing state.

To release compute:

```bash
az vm deallocate \
  --resource-group myResourceGroup \
  --name myVM
```

Wait for the long-running operation, then query instance view again. `az vm stop` powers off a VM but is not the command to rely on for deallocation. Use `az vm deallocate` when the intent is to release compute.

## Charges that remain after deallocation

Deallocation stops the usage charge for the VM's compute instance. It does not stop every resource associated with the machine.

### Managed disks

The OS disk and attached data disks remain allocated and billable. Their data persists so the VM can start again. Disk SKU, provisioned size, transactions, snapshots, and features such as bursting can affect the storage portion of the bill.

Deleting only the VM does not always delete its disks either. Resource delete options determine whether Azure deletes or detaches associated disks. Verify the resources before assuming a VM deletion removed storage charges.

### Public IP and networking resources

A retained public IP resource can be billable, particularly a Standard public IP. NAT Gateway, Azure Bastion, Load Balancer rules or data processing, and other independently deployed network services also have their own billing lifecycle. Deallocating one backend VM does not delete those resources.

### Backup and disaster recovery

Recovery Services vault data, backup protected instances, snapshots, restore points, and Azure Site Recovery replicas can continue to incur charges. A VM being off does not end retention.

### Commitments and licenses

Azure Reservations and Azure savings plans are billing commitments, not per-VM power switches. Deallocating a VM may leave part of a commitment unused, but it does not cancel the commitment. Marketplace software and other separately licensed products can also have billing rules independent of VM power state.

## Find the charge instead of guessing

Use **Cost Management + Billing > Cost analysis** and group the result by **Resource** or **Meter**. Narrow the time range to after the VM was deallocated. Common results are:

- no new VM compute usage, but continuing managed disk usage;
- a public IP or shared network appliance charge;
- Recovery Services storage;
- an amortized reservation or savings plan commitment;
- delayed usage records from before deallocation.

Cost data is not always instantaneous. Compare the usage date and resource ID, not only the day the line appeared in the portal.

You can also list the VM's attached resources:

```bash
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "{vm:id,osDisk:storageProfile.osDisk.managedDisk.id,dataDisks:storageProfile.dataDisks[].managedDisk.id,nics:networkProfile.networkInterfaces[].id}" \
  --output json
```

Follow the NIC IDs to any public IP resources, and inspect the resource group for snapshots, restore point collections, and unattached disks.

## Make shutdown automation deallocate

For nonproduction VMs, schedule a platform deallocation rather than a guest shutdown. Azure's VM auto-shutdown feature is designed for this use case. For custom automation, invoke the Compute deallocate operation and monitor it to completion.

A useful control has two checks:

1. the requested stop operation succeeded;
2. instance view reached `PowerState/deallocated`.

Alert when a VM remains `PowerState/stopped` beyond a short grace period. That state is easy to miss because the workload is unavailable even though compute is still billed.

Before automating deallocation, account for its operational effects. The VM must obtain capacity again when it starts, temporary-disk data is not durable across deallocation, and a dynamically assigned public IP can change. Persistent disks and static network resources remain.

## A practical shutdown checklist

When a supposedly shut down VM still costs money:

1. Confirm the instance-view power state.
2. If it is `Stopped`, deallocate it through Azure.
3. Confirm it reaches `Deallocated`.
4. Use Cost analysis by resource and meter for the post-deallocation period.
5. Review managed disks, public IPs, snapshots, backup, and shared networking.
6. Review reservations, savings plans, and marketplace commitments separately.
7. Change schedules and runbooks to call deallocate, then verify the result.

The shortest diagnosis is: **Stopped means powered off but allocated; deallocated means compute released.** The remaining bill belongs either to retained resources, a separate commitment, or usage recorded before the release.

## Official Documentation

- [States and billing status of Azure Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing)
- [Manage Windows VMs and review VM power states](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/tutorial-manage-vm)
- [Virtual Machines deallocate REST operation](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/deallocate)
- [Delete a VM and attached resources](https://learn.microsoft.com/en-us/azure/virtual-machines/delete)
