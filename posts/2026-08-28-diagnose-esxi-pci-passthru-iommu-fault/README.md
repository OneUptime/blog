# How to Diagnose an ESXi VM That Powers Off with `PCI Passthru Device Caused IOMMU Fault`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, VMDirectPath I/O, PCI Passthrough, IOMMU, Hardware Troubleshooting

Description: Identify the faulting passthrough device, preserve the right ESXi and guest evidence, and separate device DMA faults from MMIO-allocation and platform-configuration problems.

---

When a VM using VMDirectPath I/O powers off and `vmware.log` reports `PCI passthru device ... caused an IOMMU fault`, ESXi has stopped the VM after the platform IOMMU rejected a DMA transaction. The shutdown protects isolation between the guest and host. It is not evidence that VM memory is exhausted, and increasing 64-bit MMIO space is not a generic fix.

Broadcom documents this failure especially for DMA-capable Intel accelerator devices, but the investigation applies to any directly assigned PCI function. The useful evidence is the exact PCI address, fault type and address, the device and platform firmware levels, the guest driver, and the workload occurring at the time.

## Stabilize the Workload Before Retrying

Repeatedly powering the VM back on can reproduce a disruptive device or firmware defect. First:

1. Keep the affected VM powered off.
2. Record the host, datastore, VM name, last failure time, and recent changes.
3. If the service must be restored before the device is debugged, remove the passthrough device from the powered-off VM and start it only if the application supports a no-accelerator mode.
4. Do not disable IOMMU or weaken passthrough isolation as a workaround.
5. Preserve the original logs before rotations overwrite them.

Removing a PCI device from VM settings does not erase its datastore disks, but the guest may fail to boot or the application may fail if it requires that hardware. Have an application-level recovery plan first.

## Capture the Exact VMX Failure

Find the VM's configuration path in **VM > Configure > General > Configuration file**, or on the host:

```bash
vim-cmd vmsvc/getallvms
```

Use the datastore path returned for the VM and search its log. Quote paths that contain spaces:

```bash
cd '/vmfs/volumes/DATASTORE/VM_DIRECTORY'

grep -n -i -B 20 -A 40 \
  'PCI passthru device.*IOMMU fault' vmware.log
```

A representative fatal line looks like this:

```text
PCI passthru device 0000:8b:00.1 caused an IOMMU fault type 4 at address 0x...
```

Record all three fields exactly:

- the segment, bus, device and function (SBDF), such as `0000:8b:00.1`;
- the numeric fault type;
- the faulting address.

Also retain messages before the fatal line. They show whether the VM had already reported a guest-driver reset, device timeout, PCIe error, or power event. Do not publish these logs without reviewing them for host names, datastore names, IP addresses, and guest data.

## Map the PCI Address to Physical Hardware

List PCI functions on the affected ESXi host:

```bash
lspci
```

Match the bus, device and function from `vmware.log`. Capture the vendor, model, and all related functions on the same physical adapter. A multi-function accelerator can expose, for example, both `8b:00.0` and `8b:00.1`; troubleshooting only one function can hide a shared reset or firmware dependency.

Then document:

- server model, BIOS/UEFI version, and BMC firmware;
- slot and riser containing the card;
- device firmware or NVM package;
- guest OS and exact in-guest device-driver version;
- ESXi image profile and OEM add-on;
- whether SR-IOV, peer-to-peer DMA, or multiple functions are involved.

Use the [Broadcom Compatibility Guide](https://compatibilityguide.broadcom.com/) and the server and device vendors' support matrices. Compatibility is a combination, not a single checkbox: server platform, ESXi release, firmware, device, guest OS, and guest driver must be supported together.

## Distinguish an IOMMU Fault from Other Passthrough Failures

Three failures are often conflated:

### Runtime IOMMU fault

The VM ran and then terminated with the fault line. Broadcom attributes this to an invalid hardware-level memory operation, with possible causes including device hardware, firmware, guest driver, or application behavior. Investigate those layers with the device vendor.

### MMIO allocation failure at power-on

Messages such as `The firmware could not allocate ... KB of PCI MMIO` or `total number of pages needed ... exceeds limit` occur while the VM is powering on. Those can require UEFI firmware and correctly sized `pciPassthru.use64bitMMIO` settings. They do not explain a later DMA transaction rejected by the IOMMU.

### Reset or topology incompatibility

VMDirectPath I/O requires platform IOMMU and PCIe Access Control Services support. Devices also need a supported reset method. Functions with bus-level or multi-function dependencies may have to be assigned together. A reset failure usually has different adjacent log messages and should be evaluated against the VMDirectPath I/O platform requirements.

Classifying the phase prevents a risky configuration change from masking the real defect.

## Correlate the Failure Across Host and Guest Logs

Use the timestamp from `vmware.log` to inspect the corresponding host window:

```bash
grep -n -i -B 20 -A 40 'iommu\|pcipassthru\|dma' \
  /var/run/log/vmkernel.log
```

In the guest, collect the kernel or system event log, the device driver's log, and vendor diagnostics from the same interval. Look for:

- a driver reset immediately before the fault;
- firmware-health or PCIe AER events;
- a workload operation that consistently triggers the failure;
- a recent driver, firmware, BIOS, application, or ESXi change;
- the same physical card failing when assigned to a controlled test VM.

Do not swap a suspect card into another production host merely to test it. Use a maintenance window and preserve hardware-service records so the device vendor can compare the failure with its diagnostics.

## Generate a Support Bundle

In vSphere Client, select the host and use **Monitor > Logs > Export System Logs**, or run the host command:

```bash
vm-support
```

Record the generated bundle path and copy it to supported secure storage before leaving maintenance mode. Give Broadcom, the server vendor, device vendor, and application vendor the same timeline and identifiers. Broadcom's IOMMU-fault guidance recommends joint analysis because the failing transaction can originate from hardware, firmware, the in-guest driver, or the application that programs the device.

## Test One Change at a Time

A controlled remediation order is:

1. Confirm the configuration is supported in the Compatibility Guide and vendor matrices.
2. Apply the server vendor's validated BIOS, BMC, riser, and device-firmware combination.
3. Use the supported guest driver for that firmware and guest OS.
4. If the incident began after a change, test the vendor-supported rollback in a lab or maintenance window.
5. Reproduce with the smallest supported workload while collecting both guest and host evidence.
6. Replace the device or platform component if vendor diagnostics identify a hardware fault.

Do not add undocumented `.vmx` parameters, edit `/etc/vmware/passthru.map`, or enable peer-to-peer DMA unless the device's supported configuration explicitly requires it. Those settings change isolation or reset behavior and address different classes of problem.

## Verify Recovery

After applying a vendor-supported fix:

- cold-start the host if the device or platform firmware procedure requires it;
- confirm the intended PCI functions are assigned to the VM;
- run the exact workload that previously triggered the fault;
- watch `vmware.log`, the guest driver, and hardware telemetry through several workload cycles;
- verify that unrelated VMs and devices on the same PCIe hierarchy remain healthy;
- keep the original support bundle and record the before-and-after versions.

A successful VM power-on alone is not validation when the original fault occurred only under sustained DMA load.

## Official Documentation

- [Broadcom KB 392714: PCI passthrough device caused an IOMMU fault](https://knowledge.broadcom.com/external/article/392714/error-pci-passthru-device-caused-iommu-f.html)
- [Broadcom KB 312208: vSphere VMDirectPath I/O platform and device requirements](https://knowledge.broadcom.com/external/article/312208/vsphere-vmdirectpath-io-and-dynamic-dire.html)
- [Broadcom Compatibility Guide](https://compatibilityguide.broadcom.com/)
- [Broadcom KB 334594: PCI passthrough power-on failure caused by insufficient MMIO](https://knowledge.broadcom.com/external/article/334594/module-devicepoweron-power-on-failed-to.html)

## Conclusion

An IOMMU fault is a rejected DMA operation, not a request to allocate more VM memory. Preserve the complete failure line, map its PCI address to the exact hardware and related functions, correlate guest and host evidence, and validate the entire firmware-and-driver combination. Restore production only after a supported fix survives the workload that originally triggered the shutdown.
