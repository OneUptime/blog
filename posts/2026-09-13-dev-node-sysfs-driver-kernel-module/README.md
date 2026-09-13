# Trace a /dev Node to Its sysfs Device, Driver, and Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, Hardware, Troubleshooting

Description: Map device major and minor numbers into sysfs, inspect driver links, and distinguish a child device from its bound parent.

A device node is an entry point into a kernel interface, not a description of the entire hardware stack behind it. A tty node might belong to a USB serial child below a USB interface below a PCI host controller. Those layers can have different drivers and different modules.

Start by locating the exact sysfs device represented by the node, then inspect each ancestor without merging their identities. This produces a trace you can use for driver troubleshooting and device inventory.

## Resolve the node directly

On a host with udev, the shortest route is:

```bash
udevadm info --query=path --name=/dev/ttyUSB0
udevadm info --query=property --name=/dev/ttyUSB0
```

The path result is a devpath beneath `/sys`. The property output may include persistent aliases and bus-specific identification gathered by udev rules. Use an observed node name or a stable alias in place of the example.

When udev is unavailable, Linux provides a direct mapping. Character devices have entries under `/sys/dev/char`, and block devices under `/sys/dev/block`. Their names use decimal major and minor numbers. These symlinks point into the device hierarchy. [Linux sysfs hierarchy documentation](https://docs.kernel.org/filesystems/sysfs.html)

## Use stat without confusing decimal and hexadecimal

Shell `stat` formats differ across platforms and can display device numbers in hexadecimal. The following Linux-oriented Python script avoids that conversion trap and follows an input symlink intentionally:

```python
import os
from pathlib import Path
import stat
import sys

node = Path(sys.argv[1])
info = node.stat()
if stat.S_ISCHR(info.st_mode):
    kind = 'char'
elif stat.S_ISBLK(info.st_mode):
    kind = 'block'
else:
    raise SystemExit('Input is not a character or block device')

number = f'{os.major(info.st_rdev)}:{os.minor(info.st_rdev)}'
link = Path('/sys/dev') / kind / number
try:
    device = link.resolve(strict=True)
except FileNotFoundError:
    raise SystemExit(f'No visible sysfs mapping for {kind} {number}')
print(device)
```

Run it with a node such as `/dev/null` for a read-only basic check, then with the hardware node being investigated. It uses `st_rdev`, which encodes the target device number; `st_dev` would identify the filesystem containing the node instead. [Python os device-number functions](https://docs.python.org/3/library/os.html#os.major)

A node may exist without a visible matching sysfs entry, especially in a restricted container or after removal. Report that state rather than guessing a device by its filename. A manually created node also does not prove that a corresponding device is currently registered.

## Inspect links at the exact device

Once you have the canonical directory, inspect its own links:

```bash
device=/sys/devices/virtual/mem/null
readlink -e "$device/subsystem"
readlink -e "$device/driver"
readlink -e "$device/driver/module"
```

The `/dev/null` example normally has no hardware driver link, which is a valid result. Substitute the path discovered for your target when examining physical hardware.

A `driver` link identifies the driver bound to that particular device. The optional driver's `module` link identifies its module representation. Absence of that link does not by itself prove that the device is unsupported: a driver can be built into the kernel, and some devices are represented through other layers. [Kernel driver binding documentation](https://docs.kernel.org/driver-api/driver-model/binding.html)

## Walk ancestors as separate records

If the child lacks the hardware driver you expected, inspect its parents. This fragment continues after the Python script above and prints each device level that exposes a subsystem:

```python
root = Path('/sys/devices')
if not device.is_relative_to(root):
    raise SystemExit('Resolved mapping is outside /sys/devices')

for current in [device, *device.parents]:
    if current == root:
        break
    subsystem_link = current / 'subsystem'
    if not subsystem_link.is_symlink():
        continue
    subsystem = subsystem_link.resolve().name
    driver_link = current / 'driver'
    driver = driver_link.resolve().name if driver_link.is_symlink() else '-'
    module_link = current / 'driver/module'
    module = module_link.resolve().name if module_link.is_symlink() else '-'
    print(current, subsystem, driver, module, sep='\t')
```

The example is a point-in-time inspection, not a hotplug-safe inventory daemon. Production code should handle disappearing paths and rescan as needed.

Do not report the first parent driver as though it were the child's own driver. Label the relationship explicitly, for example tty child, USB interface parent, and PCI controller ancestor. The kernel's sysfs rules specifically distinguish each device's properties from its ancestors' properties. [Kernel sysfs access rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)

## Connect the evidence to the running build

For an observed module name, inspect `modinfo` and the running kernel release. A driver's name and its module's name need not match, so follow the link before searching a package. Module metadata describes the installed module file; compare it with the actually loaded build when investigating vendor patches or an upgrade awaiting reboot.

For built-in drivers, use the distribution's kernel configuration and matching source package. Keep the node, major and minor number, canonical devpath, subsystem, bound driver, and module in the diagnostic record. Together they make reports reproducible even when convenient node names change.

## Conclusion

Trace `/dev` through its device number into the canonical sysfs tree, then inspect each driver relationship at its own device level. This avoids confusing aliases, child devices, and parent controllers, and gives you an accurate route from an application-visible node to the relevant kernel implementation.

## Official Documentation

- [Linux kernel: sysfs hierarchy](https://docs.kernel.org/filesystems/sysfs.html)
- [Linux kernel: driver binding](https://docs.kernel.org/driver-api/driver-model/binding.html)
- [Linux kernel: sysfs access rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)
- [Python: major and minor device numbers](https://docs.python.org/3/library/os.html#os.major)
