# How to Enable PCI Passthrough on ESXi and Diagnose Devices Stuck at `Needs Reboot`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, PCI Passthrough, VMDirectPath I/O, DirectPath I/O, IOMMU, GPU, Troubleshooting

Description: Enable VMDirectPath I/O safely on ESXi and diagnose a PCI device that remains in the `Needs Reboot` state after a controlled host reboot.

---

VMDirectPath I/O assigns a physical PCI function directly to a virtual machine. The normal enablement flow includes one host reboot: after **Toggle Passthrough**, the vSphere Client shows an orange pending state because ESXi must change the device's owner during boot. A persistent `Enabled / Needs Reboot` state after that controlled reboot is not normal, but it does not identify one universal cause.

Treat passthrough as a platform, firmware, PCI topology, device-reset, and ESXi configuration problem—not merely a checkbox. The supported recovery depends on whether the device is capable, whether ESXi applied the configured owner, whether its PCI address changed, and whether the device remains visible.

## Understand the Operational Trade-offs

VMDirectPath I/O bypasses much of the virtualization layer. Broadcom documents that VMs using it lose important vSphere features, including:

- vMotion;
- snapshots;
- suspend and resume;
- Fault Tolerance.

The VM also needs a reservation for its full configured memory when the PCI device is assigned. Design backup, maintenance, and host-failure recovery around those limits before enabling the device.

## Prerequisites

Before changing the host:

- verify the server platform and I/O device in the Broadcom Compatibility Guide for the exact ESXi release;
- install OEM-supported BIOS, device firmware, and ESXi drivers;
- enable the platform's IOMMU feature in BIOS/UEFI, commonly named Intel VT-d or AMD IOMMU/AMD-Vi;
- confirm the PCIe path provides the Access Control Services required by the platform;
- check that the guest OS and its in-guest device driver support the device;
- use a maintenance window, evacuate VMs, and place the host in maintenance mode before rebooting;
- obtain console access and capture a host support bundle before low-level remediation.

Never pass through the controller that contains the ESXi boot device, the only management NIC, or another device required by VMkernel. Passing through a boot storage controller can prevent ESXi from loading or persisting its configuration.

Multi-function devices can have reset dependencies. Broadcom requires dependent PCI functions to be assigned collectively to the same VM when the hardware reset affects the whole bus. Do not toggle only one function of a GPU, NIC, or controller until the device and OEM documentation confirms the supported grouping.

Resizable BAR is not supported for PCI devices in passthrough mode according to Broadcom's current VMDirectPath requirements. Large-BAR devices can also need device-specific 64-bit MMIO configuration; follow the current device and Broadcom guidance rather than guessing a `.vmx` value.

## Record the Device Identity

List the hardware and current passthrough configuration before making changes:

```bash
esxcli hardware pci list
esxcli hardware pci pcipassthru list
```

Record the device's full segment:bus:device.function address, for example `0000:65:00.0`, plus:

- Vendor and Device IDs;
- Physical Slot;
- Device Layer Bus Address;
- Passthru Capable;
- Configured Owner;
- Current Owner;
- Module Name;
- Reset Method.

Identify the device by vendor, model, slot, and IDs—not by PCI address alone. Firmware changes, a moved card, or hardware service can change enumeration.

## Enable Passthrough in the vSphere Client

1. Select the ESXi host.
2. Open **Configure > Hardware > PCI Devices**.
3. Select **All PCI Devices** so unclaimed hardware is visible.
4. Filter for and verify the exact device.
5. Select it and click **Toggle Passthrough**.
6. Confirm the state changes to enabled with an orange restart-required indicator.
7. Evacuate remaining workloads, enter maintenance mode, and perform a controlled host reboot.

After boot, return to **PCI Devices**. The normal successful state is enabled and active with a green indicator. Verify from the shell as well:

```bash
esxcli hardware pci pcipassthru list
esxcli hardware pci list
```

Only after the device is active should you power off the target VM, open **Edit Settings > Add New Device > PCI Device**, select the exact device, and reserve all configured guest memory. Install the OEM-supported driver inside the guest.

## Diagnose a Persistent `Needs Reboot` State

Do not keep rebooting indefinitely. One reboot is expected; repeated pending state means the configured and live hardware state must be compared.

### 1. Check Capability and Ownership

Run:

```bash
localcli hardware pci list
esxcli hardware pci pcipassthru list
```

For a correctly claimed device, Broadcom's current troubleshooting guidance expects `Current Owner: VM Passthru` and `Module Name: pciPassthru`. A suspicious pattern is:

```text
Configured Owner: VM Passthru
Current Owner: VMkernel
```

Also check whether `Passthru Capable` is `true`. A device reported as not capable is a different symptom from an owner that remains pending.

### 2. Check Whether Hardware Enumeration Changed

If the card was moved, reseated, replaced, or rediscovered after firmware or BIOS work, compare its live Device Layer Bus Address with the stored ConfigStore record:

```bash
configstorecli config current get \
  -c esx \
  -g hardware \
  -k pci_devices \
  -i 0000:65:00.0
```

Broadcom documents a stale-record failure where the stored `dl_bus_address` no longer matches the physical slot. Toggling passthrough off and on does not fix that mismatch because the address is preserved in the record.

Do not delete anything unless the mismatch is actually present and the host matches the documented scenario. Capture a support bundle first.

### 3. Remove Only a Confirmed Stale Record

With the host in maintenance mode, and only after confirming the exact mismatched PCI record, Broadcom's documented repair is:

```bash
configstorecli config current delete \
  -c esx \
  -g hardware \
  -k pci_devices \
  -i 0000:65:00.0
```

Never use `--all`. It removes every record under the key and can reassign unrelated PCI devices.

Confirm the remaining records, then reboot:

```bash
configstorecli config current get \
  -c esx \
  -g hardware \
  -k pci_devices
```

After boot, verify that the record was regenerated with the correct device-layer bus address. Enable the exact device and reboot once more:

```bash
esxcli hardware pci pcipassthru set \
  -d 0000:65:00.0 \
  -e true
```

Then verify:

```bash
localcli hardware pci list
esxcli hardware pci pcipassthru list
```

If the regenerated address remains wrong or the VMkernel still owns the device, stop and open a Broadcom support case. Further ConfigStore edits are not a general-purpose troubleshooting technique.

## Distinguish Other ESXi 8.x Problems

Several nearby symptoms have separate fixes:

- **Device becomes non-passthrough-capable after installing or upgrading to ESXi 8.0.3:** Broadcom KB 391460 describes an overly strict ACS sanity check and an advanced boot-option workaround. This is not a generic fix for `Needs Reboot`. Confirm the exact build and symptom against the live KB before applying it.
- **Device disappears when a passthrough VM powers on:** Broadcom says an ESXi 8.0 hotplug-reset issue is resolved in ESXi 8.0 Update 3g (`80P06`). Upgrade to that release or later instead of repeatedly re-adding the device.
- **Reset failure or PCIe link-down messages appear in `vmkernel.log`:** reset behavior is device- and platform-specific. Use the OEM's supported firmware and Broadcom's exact device KB; do not invent entries in `/etc/vmware/passthru.map`.
- **The intended device is owned by VMkernel but an unrelated slot is in passthrough:** this strongly matches the stale ConfigStore address scenario. Verify both records before deleting the one specific stale entry.

Review the log around the boot and claim event:

```bash
grep -iE 'PCIPassthru|PCI:|IOMMU|reset|link.*down' \
  /var/run/log/vmkernel.log
```

Save the unfiltered log and a support bundle. A grep excerpt is useful for orientation but is not enough for a vendor root-cause analysis.

## Verify the VM and Device

After ESXi reports the device active:

1. Confirm the VM has a full memory reservation.
2. Add the correct PCI device while the VM is powered off.
3. Power on the VM and verify the expected vendor/device IDs inside the guest.
4. Check the in-guest driver and firmware status.
5. Test the device with a non-destructive vendor diagnostic.
6. Power-cycle the VM once during the maintenance window to verify that the device resets cleanly.

If powering on the VM causes the host to PSOD, reboot, or lose the device, stop testing and collect logs. That is a reset or platform-support problem, not a reason to relax ACS or IOMMU protections without an exact Broadcom/OEM procedure.

## Disable Passthrough and Recover VMkernel Ownership

To roll back, remove the PCI device from the powered-off VM, use **Configure > Hardware > PCI Devices > Toggle Passthrough** to disable the exact device, and reboot the host. Verify that `Current Owner` returns to `VMkernel` and that the original ESXi driver or adapter name returns.

If a boot or storage controller was accidentally marked for passthrough, follow Broadcom's specific recovery KB rather than improvising. The host may be writing changes only to temporary storage when its boot device is unavailable, so ordinary toggles might not persist.

## Official Documentation

- [Configuring VMDirectPath I/O pass-through devices on an ESXi host](https://knowledge.broadcom.com/external/article/309986)
- [vSphere VMDirectPath I/O and Dynamic DirectPath I/O: Requirements for Platforms and Devices](https://knowledge.broadcom.com/external/article/312208)
- [GPU shows Shared Direct or Basic and will not switch to Direct after changing Graphics Mode](https://knowledge.broadcom.com/external/article/445893)
- [PCIe devices are reported as non-pass-through capable or SR-IOV fails to enable](https://knowledge.broadcom.com/external/article/391460)
- [Virtual machines might not power on when configured with PCI passthrough devices in ESXi 8.0](https://knowledge.broadcom.com/external/article/409712)
- [Confirming ESX/ESXi host hardware compatibility](https://knowledge.broadcom.com/external/article/313743)
- [ESXi host fails to boot when its storage controller is marked for passthrough](https://knowledge.broadcom.com/external/article/373820)

## Conclusion

An orange `Needs Reboot` state is expected once when enabling VMDirectPath I/O. If it persists, compare the configured and current owner, capability, physical slot, and stored device-layer bus address before taking action. Correct only a proven stale record, use exact Broadcom version guidance for ACS or hotplug defects, and never trade IOMMU isolation or host boot access for a speculative workaround.
