# Enumerate sysfs Devices Without Counting Aliases Twice

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, Hardware, Troubleshooting

Description: Build device inventories using canonical sysfs paths, subsystem identity, and explicit handling of aliases and hotplug races.

An inventory script can report the same device several times if it recursively scans `/sys/class`, `/sys/bus`, and `/sys/devices` and treats every encountered path as a new object. Classification directories provide alternate views into the same kernel device tree.

Use canonical paths as the key for the current snapshot. Keep aliases as useful metadata, and decide separately what counts as a physical device, a partition, an interface, or another child object.

## Separate classification from identity

A network interface can appear in `/sys/class/net` while its real device directory resides beneath `/sys/devices`. A block device can be reachable through more than one classification view. Following every symlink recursively can revisit parents, drivers, subsystems, and the same device repeatedly.

The kernel's sysfs rules define canonical devpaths beneath `/sys/devices` as current device identifiers. They also distinguish a device's own subsystem and driver from the corresponding properties of its parents. [Kernel sysfs access rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)

A canonical path is suitable for deduplicating one live snapshot. It is not a promise of stable identity across reboot or unplugging. Use appropriate persistent identifiers when comparing device incarnations over time.

## Prefer a device enumeration API for a daemon

For production device management, consider the system's device library rather than reproducing discovery and event handling. systemd's sd-device API provides enumeration and device introspection; udev properties can add useful identity data beyond raw sysfs attributes. [systemd sd-device documentation](https://github.com/systemd/systemd/blob/main/man/sd-device.xml)

A direct sysfs reader can still be useful for diagnostics, a constrained environment, or explaining duplicates. Keep that reader bounded and avoid assuming that every directory is a device.

## Canonicalize candidates from the classification views

This read-only Python example collects current devices from the available classification layout and groups aliases by their canonical target:

```python
from pathlib import Path

root = Path('/sys/devices')
subsystem_root = Path('/sys/subsystem')
if subsystem_root.exists():
    patterns = [(subsystem_root, '*/devices/*')]
else:
    patterns = [
        (Path('/sys/class'), '*/*'),
        (Path('/sys/bus'), '*/devices/*'),
        (Path('/sys/block'), '*'),
    ]

records = {}
errors = 0
for base, pattern in patterns:
    for alias in base.glob(pattern):
        try:
            device = alias.resolve(strict=True)
            if not device.is_relative_to(root) or not device.is_dir():
                continue
            subsystem_link = device / 'subsystem'
            if not subsystem_link.is_symlink():
                continue
            subsystem = subsystem_link.resolve(strict=True).name
            key = str(device)
            record = records.setdefault(key, {
                'subsystem': subsystem,
                'aliases': set(),
            })
            record['aliases'].add(str(alias))
        except (OSError, RuntimeError):
            errors += 1

for device, record in sorted(records.items()):
    print(record['subsystem'], device, len(record['aliases']), sep='\t')
print(f'Unique visible devices: {len(records)}; skipped errors: {errors}')
```

Use Python 3.9 or newer for `Path.is_relative_to()`. The code does not recursively follow links and does not read arbitrary attribute contents. It checks that each candidate resolves inside the device tree and exposes a subsystem link before counting it.

The optional `/sys/subsystem` handling follows the documented classification scheme without assuming that directory exists on current systems. When it is absent, scanning the bus, class, and block views together avoids relying on a subsystem being represented in only one location. [Kernel sysfs classification rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)

## Define the counting unit

Deduplicating aliases does not collapse distinct kernel objects into one physical device. A disk and its partitions are distinct block devices. A USB peripheral and its interfaces are distinct objects. A PCI controller and the devices attached through it are also distinct.

If your report asks for whole disks, filter block records using the subsystem's documented partition information rather than deleting paths that happen to contain digits. If it asks for USB peripherals, distinguish the USB device object from interface objects using their device type and attributes.

Keep the raw canonical inventory available for debugging. A higher-level report should explain its grouping rule, such as one row per USB device with child interfaces listed separately. Otherwise, a correct kernel-object count can still be mislabeled as a physical-device count.

## Treat a scan as an observation interval

Devices can disappear after directory enumeration and before link resolution. They can also appear after a directory has already been scanned. The exception handling makes the example tolerant of some races, but it does not produce an atomic snapshot of the host.

For an ongoing inventory, establish event monitoring, enumerate the initial state, and reconcile events that occur during enumeration. Perform a rescan when event loss or inconsistent state is detected. Do not use a permanent seen-path set: a removed path can later be reused by another device incarnation.

Container visibility is another boundary. A container's sysfs mount can expose only part of the host view or a namespace-specific set of devices. Label the inventory with the environment in which it was collected rather than calling it an authoritative host count.

## Verify that deduplication works

Choose a known device reachable from two aliases and confirm that both resolve to one record. Inspect its alias set while debugging. Test a partition alongside its parent disk and confirm that they remain separate records. Then test device removal during repeated scans on suitable hardware.

If counts differ from a tool such as `lsblk` or `lsusb`, compare their counting definitions before assuming a bug. Those tools present subsystem-specific views, while a generic sysfs enumerator observes kernel device objects across several subsystems.

## Conclusion

Canonicalize classification entries into `/sys/devices` and deduplicate by the resolved path for each snapshot. Keep subsystem identity, parent relationships, and aliases separate. That prevents repeated views of one object from becoming duplicate inventory rows while preserving genuinely distinct child devices and lifecycle changes.

## Official Documentation

- [Linux kernel: sysfs access and classification rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)
- [Linux kernel: sysfs hierarchy](https://docs.kernel.org/filesystems/sysfs.html)
- [systemd: sd-device enumeration API](https://github.com/systemd/systemd/blob/main/man/sd-device.xml)
