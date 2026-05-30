# How to Set Up Ephemeral OS Disks on Azure Virtual Machines for Faster Boot Times

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Ephemeral Disks, Performance, Boot Time, Cost Optimization

Description: Learn how to configure ephemeral OS disks on Azure VMs to achieve faster boot times, lower latency, and reduced storage costs.

---

Azure VMs typically use managed disks for their OS disk, which are persisted in Azure Storage. This is great for durability but comes with a trade-off: storage latency and cost. Ephemeral OS disks flip that trade-off by placing the OS disk on the local storage of the physical host machine. The result is faster boot times, lower read/write latency, and zero storage costs for the OS disk. The catch is that the data is not persistent - if the VM is stopped and deallocated, redeployed, moved during service healing, or the host fails, the OS disk content is lost.

For stateless workloads, scale set nodes, and CI/CD build agents, that trade-off is not just acceptable - it is preferred.

## How Ephemeral OS Disks Work

Instead of storing the OS disk in Azure Storage (backed by Standard HDD, Standard SSD, or Premium SSD), ephemeral OS disks use the VM's local temporary storage, NVMe storage, or cache disk.

The key characteristics:

- The OS disk is created from the VM image at deploy time, directly on the local storage.
- Read and write latency matches local SSD performance, not remote storage performance.
- There is no storage cost for the OS disk because it does not use Azure Storage.
- The OS disk is lost when the VM is stopped and deallocated, resized, or redeployed. Ephemeral OS disk VMs do not support the stop-deallocated state.
- Reimaging the VM is extremely fast since it just writes the image to local storage.

## When to Use Ephemeral OS Disks

Ephemeral OS disks work best for:

- VM Scale Set instances that are treated as cattle, not pets
- Stateless application servers behind a load balancer
- CI/CD build agents and test runners
- Batch processing workers
- Container host nodes (AKS uses ephemeral OS disks by default whenever the selected node pool configuration supports them)
- Development and test VMs where you rebuild frequently

They are not appropriate for:

- VMs that store critical data on the OS disk
- VMs that need to survive deallocation
- VMs where you need to resize frequently
- Lift-and-shift workloads that were not designed for ephemeral infrastructure

## VM Size Requirements

Not all VM sizes support ephemeral OS disks. The VM's cache, temp, or NVMe disk size must be large enough to hold the OS image. Here is how to check:

```bash
# Check whether a specific size supports ephemeral OS disks and which placements are available
az vm list-skus --location eastus --size Standard_D4ds_v5 \
  --query "[?name=='Standard_D4ds_v5'].{Name:name, EphemeralOSDisk:capabilities[?name=='EphemeralOSDiskSupported'].value | [0], TempDiskMB:capabilities[?name=='MaxResourceVolumeMB'].value | [0], CacheBytes:capabilities[?name=='CachedDiskBytes'].value | [0], Placements:capabilities[?name=='SupportedEphemeralOSDiskPlacements'].value | [0]}" \
  -o table
```

The image OS disk size must be less than or equal to the VM's available local storage for the selected placement. Standard Ubuntu marketplace images are about 30 GiB, while standard Windows Server images are about 127 GiB. Small-size images are available for some distributions and make more VM sizes eligible.

## Creating a VM with an Ephemeral OS Disk

### Using Azure CLI

```bash
# Create a VM with an ephemeral OS disk placed on the cache disk
az vm create \
  --resource-group myResourceGroup \
  --name ephemeralVM \
  --image Ubuntu2204 \
  --size Standard_DS3_v2 \
  --ephemeral-os-disk true \
  --ephemeral-os-disk-placement CacheDisk \
  --os-disk-caching ReadOnly \
  --admin-username azureuser \
  --generate-ssh-keys
```

The `--os-disk-caching ReadOnly` setting is required for ephemeral OS disks. This might seem counterintuitive, but the caching mode here refers to the Azure Storage layer caching behavior. Since the disk is on local storage, the "caching" concept works differently.

### Choosing Placement: Cache, Temp Disk, or NVMe

Ephemeral OS disks can be placed in three locations, depending on the VM size:

**Cache disk**: Uses the VM's cache storage. This is available on older VM families that have a cache disk.

**Temp disk (resource disk)**: Uses the VM's temporary storage allocation. The remaining temp disk space is the initial temp disk size minus the OS image size.

**NVMe disk**: Uses the VM's local NVMe storage. This is generally available on supported v6 VM series.

By default, Azure selects the appropriate placement for the VM SKU. Placement does not directly change the cost; performance depends on the underlying local storage for the selected VM size.

```bash
# Place ephemeral OS disk on the temp (resource) disk instead
az vm create \
  --resource-group myResourceGroup \
  --name ephemeralVM-temp \
  --image Ubuntu2204 \
  --size Standard_D4ds_v5 \
  --ephemeral-os-disk true \
  --ephemeral-os-disk-placement ResourceDisk \
  --os-disk-caching ReadOnly \
  --admin-username azureuser \
  --generate-ssh-keys
```

### Using ARM Template

For infrastructure-as-code deployments:

```json
{
  "type": "Microsoft.Compute/virtualMachines",
  "apiVersion": "2023-07-01",
  "name": "ephemeralVM",
  "location": "eastus",
  "properties": {
    "hardwareProfile": {
      "vmSize": "Standard_DS3_v2"
    },
    "storageProfile": {
      "imageReference": {
        "publisher": "Canonical",
        "offer": "0001-com-ubuntu-server-jammy",
        "sku": "22_04-lts-gen2",
        "version": "latest"
      },
      "osDisk": {
        "createOption": "FromImage",
        "diffDiskSettings": {
          "option": "Local",
          "placement": "CacheDisk"
        },
        "caching": "ReadOnly"
      }
    },
    "osProfile": {
      "computerName": "ephemeralVM",
      "adminUsername": "azureuser",
      "linuxConfiguration": {
        "ssh": {
          "publicKeys": [
            {
              "path": "/home/azureuser/.ssh/authorized_keys",
              "keyData": "ssh-rsa AAAA..."
            }
          ]
        }
      }
    },
    "networkProfile": {
      "networkInterfaces": [
        {
          "id": "[resourceId('Microsoft.Network/networkInterfaces', 'ephemeralVM-nic')]"
        }
      ]
    }
  }
}
```

## Performance Comparison

To quantify the performance difference, here are typical benchmarks comparing ephemeral OS disks to managed disks.

### Boot Time

```bash
# Measure boot time using systemd-analyze (on the VM after boot)
systemd-analyze

# Typical results:
# Ephemeral OS disk: Startup finished in 4.2s (kernel) + 8.1s (userspace) = 12.3s
# Premium SSD:       Startup finished in 4.5s (kernel) + 14.7s (userspace) = 19.2s
# Standard SSD:      Startup finished in 4.8s (kernel) + 22.3s (userspace) = 27.1s
```

### Disk I/O

```bash
# Benchmark disk performance with fio
# Install fio first
sudo apt install -y fio

# Random read test
sudo fio --name=randread --ioengine=libaio --direct=1 --bs=4k \
  --iodepth=64 --size=1G --rw=randread --filename=/tmp/fiotest

# Typical IOPS results:
# Ephemeral OS disk (local NVMe): 100,000+ IOPS
# Premium SSD P30:                5,000 IOPS
# Standard SSD E30:               500 IOPS
```

The performance difference is dramatic for random I/O. For sequential workloads, the gap is smaller but still significant.

## Ephemeral OS Disks with VM Scale Sets

Ephemeral OS disks really shine with VM Scale Sets. Since scale set instances are designed to be stateless and replaceable, ephemeral OS disks are a natural fit.

```bash
# Create a scale set with ephemeral OS disks
az vmss create \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --image Ubuntu2204 \
  --vm-sku Standard_D4ds_v5 \
  --instance-count 3 \
  --upgrade-policy-mode Automatic \
  --ephemeral-os-disk true \
  --ephemeral-os-disk-placement ResourceDisk \
  --os-disk-caching ReadOnly \
  --admin-username azureuser \
  --generate-ssh-keys
```

The benefits compound with scale sets:

- **Faster scaling**: New instances boot faster because the OS disk is written to local storage, not replicated to Azure Storage.
- **Faster reimaging**: When you update the image version and reimage instances, the process is faster.
- **Lower cost**: No managed disk charges for OS disks across potentially hundreds of instances.

## Cost Savings

The cost savings can be meaningful at scale. Here is a rough comparison:

A managed Premium SSD P10 LRS (128 GiB) in East US costs about $19.71 per month. For a scale set with 50 instances, that is $985.50 per month just for OS disks. With ephemeral OS disks, that cost drops to zero.

For Standard SSD, an E10 LRS 128 GiB disk in East US is about $9.60 per month before transaction charges, which saves about $480 per month across 50 instances.

The savings are per-instance, so they scale linearly with your fleet size.

## Handling VM Maintenance Events

Azure periodically performs maintenance on physical hosts. With persistent managed disks, maintenance preserves the OS disk. With ephemeral OS disks, the behavior depends on the type of maintenance:

- **Live migration**: The VM is moved to another host with minimal interruption. The ephemeral OS disk is migrated in memory. This usually works seamlessly.
- **Service healing**: If Azure needs to heal or move the VM in a way that cannot preserve the local disk, the OS disk data is not preserved and the VM is reprovisioned from the original image.

For scale sets, the recommended approach is to use the `Automatic` upgrade policy and handle maintenance events by replacing instances rather than preserving them.

## Reimaging Ephemeral OS Disk VMs

One advantage of ephemeral OS disks is quick reimaging. If a VM gets into a bad state, you can reimage it back to the original image in seconds:

```bash
# Reimage a specific VM
az vm reimage --resource-group myResourceGroup --name ephemeralVM

# Reimage a scale set instance
az vmss reimage --resource-group myResourceGroup --name myScaleSet --instance-id 0
```

Reimaging with ephemeral disks is substantially faster than with managed disks because the image is simply written to local storage rather than copied through the Azure Storage network.

## Limitations to Keep in Mind

A few constraints to plan for:

- You cannot resize a VM to a size that does not support ephemeral OS disks without recreating it.
- You cannot switch an existing VM from managed disk to ephemeral OS disk - you need to create a new VM.
- You cannot capture an image from a VM with an ephemeral OS disk. Build and capture custom images from a VM that uses a persistent managed OS disk instead.
- The OS disk size is limited by the cache, temp, or NVMe disk size of the VM. If your image is larger than the available local storage, ephemeral OS disks will not work.
- OS disk snapshots are not supported.

## Wrapping Up

Ephemeral OS disks are an easy win for stateless workloads on Azure. Faster boots, better I/O performance, and lower costs with the only trade-off being non-persistence - which for stateless workloads is not a trade-off at all. If you are running scale sets, CI/CD agents, or any workload where VMs are disposable, switch to ephemeral OS disks. The performance improvement alone makes it worth the effort.
