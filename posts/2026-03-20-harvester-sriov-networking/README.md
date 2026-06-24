# How to Configure Harvester SR-IOV for Network Performance - Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, SR-IOV, Networking, High Performance, HCI, KubeVirt, SUSE Rancher

Description: Learn how to configure SR-IOV (Single Root I/O Virtualization) in Harvester to provide VMs with near-native network performance by bypassing the software switching layer.

---

SR-IOV allows a single physical NIC to present multiple virtual functions (VFs) that Harvester can pass through to VMs as PCI devices, bypassing the standard virtual switching path and achieving near-native network throughput with lower latency.

---

## Prerequisites

- Harvester v1.2.0 or later
- SR-IOV capable NIC (Intel X710, Mellanox ConnectX series, etc.) that is not used for Harvester management or VLAN traffic
- BIOS with SR-IOV and IOMMU enabled
- Guest OS support for the VF driver you plan to expose

---

## Step 1: Enable IOMMU and SR-IOV in BIOS

In your server BIOS/UEFI:
- Enable **VT-d** (Intel) or **AMD-Vi** (AMD) for IOMMU
- Enable **SR-IOV** support
- Save and reboot

Verify IOMMU is active:

```bash
dmesg | grep -E 'DMAR|IOMMU' | head -5
# Look for DMAR/IOMMU initialization messages

```

---

## Step 2: Enable the PCI Devices Add-on

In the Harvester UI:
- Go to **Advanced > Add-ons**
- Enable **pcidevices-controller**
- Wait for the add-on state to become **DeploySuccessful**

```bash
# Verify the controller is running
kubectl -n harvester-system get pods | grep pcidevices-controller
```

---

## Step 3: Configure SR-IOV Virtual Functions

On each Harvester node with SR-IOV NICs, Harvester discovers supported interfaces as `SRIOVNetworkDevice` objects.

In the Harvester UI:
- Go to **Advanced** and locate the **SR-IOV Network Devices** list
- Locate the SR-IOV capable interface
- Select **⋮ > Enable**
- Set the number of VFs to create

Verify the SR-IOV devices and resulting VFs:

```bash
kubectl get sriovnetworkdevices.devices.harvesterhci.io
kubectl get pcidevices.devices.harvesterhci.io
```

The newly created VFs appear as `PCIDevice` resources after the next re-scan.

---

## Step 4: Enable Passthrough for the VF

Use the `address` and `nodeName` values from the `PCIDevice` you want to claim:

```yaml
# pcideviceclaim.yaml
apiVersion: devices.harvesterhci.io/v1beta1
kind: PCIDeviceClaim
metadata:
  name: vf-claim
spec:
  address: "<vf-pci-address>"
  nodeName: "<harvester-node-name>"
  userName: "<your-user>"
```

Apply the claim:

```bash
kubectl apply -f pcideviceclaim.yaml
```

Harvester binds the claimed VF to `vfio-pci`, which KubeVirt requires for PCI device assignment.
The `PCIDeviceClaim` is a request object; once the VF is prepared, the enabled device is reflected on the corresponding `PCIDevice`.

---

## Step 5: Attach the SR-IOV VF to a VM

In the Harvester UI:
- Go to **Virtual Machines**
- Create a VM or edit an existing one
- Open the **PCI Devices** section
- Attach the VF that you enabled for passthrough
- Start the VM

Inside the guest, verify that the VF is visible as a PCI network device:

```bash
lspci | grep -i -E 'ethernet|network'
ip link show
```

Because the VF is passed through as a PCI device, configure IP addressing and guest drivers inside the VM as you would on bare metal.

---

## Best Practices

- Use SR-IOV for latency-sensitive workloads like financial trading systems or HPC applications.
- Use SR-IOV only on dedicated NICs or PFs; do not use host-owned devices such as Harvester management or VLAN NICs.
- If multiple identical PCI devices exist in the cluster, pin the VM to a specific node to avoid incorrect scheduling.
- VMs with PCI passthrough devices cannot be live-migrated while the device is attached.
- Some NICs, such as certain Mellanox adapters, may require the guest driver to be installed inside the VM.
- Monitor interface counters with `ethtool -S <vf-interface>` inside the guest or on the backing PF on the host.
