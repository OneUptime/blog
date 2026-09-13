# Unbind and Rebind a PCI Device Through sysfs Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Hardware, Kernel, Troubleshooting

Description: Plan a reversible PCI driver detach and attach operation by recording the original driver, dependencies, and recovery path.

Unbinding a PCI device asks its current driver to detach. Rebinding asks a driver to probe it again. This can be useful during driver development or controlled recovery, but detaching a network adapter can disconnect your session, and detaching a storage controller can remove the disk needed to run the recovery command.

The commands are short. The work is identifying dependencies and ensuring that the host can still execute the second command after the first one succeeds.

## Identify exactly one PCI function

Use the full domain, bus, device, and function identifier from the target host. These read-only commands use an illustrative address:

```bash
bdf=0000:03:00.0
device=/sys/bus/pci/devices/$bdf
lspci -s "$bdf" -nnk
readlink -f "$device"
readlink -e "$device/driver"
cat "$device/vendor"
cat "$device/device"
```

Record the bound driver before detaching it. Its symlink will disappear after a successful unbind, so discovering the original driver afterward is less reliable.

Inspect the class, children, and related functions. Determine whether this device provides your management network, root filesystem, swap, container storage, display, or a bus with other attached devices. An address that looks like a single device can represent a controller supporting many workloads.

## Prepare the workload and recovery path

For a network adapter, stop dependent traffic and ensure management uses another independently verified path or an out-of-band console. For storage, follow the storage stack's procedure to stop I/O and release consumers. Merely unmounting one filesystem may leave volume managers, RAID, swap, or other namespaces using the controller.

A second shell over the same network adapter is not an independent recovery path. Nor is a command script stored on the disk behind the controller you are about to detach. Confirm access and required commands before the maintenance window.

Driver detach and device reset are different operations. The driver may stop DMA and release resources, but an unbind/rebind cycle is not a promise to restore every hardware or firmware condition. PCI recovery behavior depends on the device and driver. [Kernel PCI error recovery documentation](https://docs.kernel.org/PCI/pci-error-recovery.html)

## Record the original driver and check controls

Prepare the commands only after the target and its dependencies have been reviewed:

```bash
driver_path=$(readlink -e "$device/driver") || exit 1
test -n "$driver_path" && test -d "$driver_path" || exit 1
driver=${driver_path##*/}
printf 'Device: %s\nDriver: %s\n' "$bdf" "$driver"
ls -l "$driver_path/unbind" "$driver_path/bind"
```

Keep the recorded values in your maintenance notes as well as the shell. An absent `bind` or `unbind` control can reflect how that driver exposes binding operations; do not create a file in `/sys` to replace it.

If `driver_override` is present, inspect it and record whether a non-default override is configured. That affects driver matching. Do not change it as part of a routine same-driver rebind unless your maintenance procedure explicitly requires it.

## Detach, observe, then reattach

The following commands actually change hardware availability. They are a reviewed procedure template, not commands that were run on production hardware for this article:

```bash
printf '%s\n' "$bdf" | sudo tee "$driver_path/unbind" >/dev/null
```

Inspect the kernel journal and confirm that the device's `driver` link is absent. If unbind fails, investigate the returned error and journal before proceeding. Do not turn a failed detach into a wider reset operation automatically.

When the device remains enumerated and the original driver is still available:

```bash
printf '%s\n' "$bdf" | sudo tee "$driver_path/bind" >/dev/null
readlink -e "$device/driver"
```

The bind and unbind ABI accepts the full PCI address. Binding attempts a probe; it can fail if matching, resources, or device state prevent initialization. [Kernel PCI sysfs binding ABI](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-pci)

If the module was unloaded during maintenance, load the recorded module by its actual module name before rebinding. A driver's sysfs name and its module name need not be identical, so collect the module link before detach when it exists.

## Avoid mixing in unrelated controls

`driver_override` restricts which driver may match the device. Writing it does not automatically detach the current driver or load the named module. `new_id` changes a driver's supported ID list and can have effects beyond this single function. Neither is required for the ordinary same-driver cycle shown here. [Kernel PCI driver override ABI](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-pci)

The device's `remove` control removes the PCI object from kernel enumeration. It is a different operation, potentially requiring a rescan to rediscover the device. A `reset` attribute invokes a supported reset operation, with device-specific implications. Do not substitute either for `unbind` just because the desired outcome is described informally as restarting a device. [Kernel PCI resource interfaces](https://docs.kernel.org/PCI/sysfs-pci.html)

## Verify recovery at the application level

After binding, verify the expected driver, device nodes or interfaces, and service behavior. A restored driver link does not prove that IP configuration, storage multipaths, or application sessions recovered. Compare logs and health checks with the recorded baseline.

If rebind fails, stop repeated attempts, preserve the error, and use the prepared recovery path. Recovery may require a supported device reset or reboot, but that is a separate decision based on the driver and hardware rather than an automatic final command.

## Conclusion

A controlled PCI unbind/rebind starts with a full device identity, the original driver, dependency analysis, and an independent recovery path. Execute one reviewed detach, inspect its result, then attach and verify the actual workload. Keeping binding, removal, override, and reset separate makes the operation understandable and recoverable.

## Official Documentation

- [Linux kernel: PCI bind, unbind, and override ABI](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-pci)
- [Linux kernel: PCI sysfs resources](https://docs.kernel.org/PCI/sysfs-pci.html)
- [Linux kernel: PCI error recovery](https://docs.kernel.org/PCI/pci-error-recovery.html)
