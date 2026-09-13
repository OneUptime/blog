# Handle Changing sysfs Paths with ID_PATH and Stable udev Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Udev, Hardware, Troubleshooting

Description: Resolve the current sysfs device from a stable identity and distinguish physical topology from device serial numbers.

A script that remembers `/sys/devices/.../ttyUSB0` can work for months and then target the wrong adapter after a reboot. Discovery order, USB bus numbering, driver changes, or a different hub arrangement can alter parts of the path.

Treat a sysfs path as the current location of a kernel device. Choose the identity your application actually needs, resolve that identity at runtime, and then inspect the resulting device and its parents.

## Choose between an object and a location

There are two common requirements. A laboratory service might mean the adapter with serial number `EXAMPLE001`, wherever it is plugged in. A rack controller might mean the adapter connected to a particular physical port, even after the adapter is replaced.

Serial-based identity addresses the first requirement. A topology-derived property such as `ID_PATH` addresses the second. Neither should be described as unconditionally permanent. Devices can lack unique serials, firmware can change reported identifiers, and moving a cable or changing a PCI topology can change a path-based identity.

Write down what replacement and relocation should mean for the application before choosing its identifier. That decision determines whether a reconnect is a recovery event, a new device, or a configuration error.

## Inspect the current udev properties

For an example serial adapter:

```bash
udevadm info --query=property --name=/dev/ttyUSB0
udevadm info --query=path --name=/dev/ttyUSB0
udevadm info --attribute-walk --name=/dev/ttyUSB0
```

Look for `ID_SERIAL`, `ID_SERIAL_SHORT`, `ID_PATH`, and `DEVLINKS`, but do not assume every subsystem populates every property. `ID_PATH` is produced by udev's path identification machinery and reflects the topology it can recognize. [systemd path_id implementation](https://github.com/systemd/systemd/blob/main/src/udev/udev-builtin-path_id.c)

The property query reports the udev database's view. The attribute walk shows the device and parent attributes used for matching. These are related sources of evidence, but an environment property is not automatically a file of the same name under `/sys`.

Also inspect existing aliases:

```bash
ls -l /dev/serial/by-id/
ls -l /dev/serial/by-path/
```

If a suitable alias already exists, use it rather than inventing another naming layer. For disks, use the appropriate disk identity or filesystem identity for the task; a filesystem UUID identifies filesystem contents, not a USB enclosure.

## Create a specific alias when necessary

The following illustrative rule names one USB serial adapter by attributes found on the same USB parent:

```udev
SUBSYSTEM=="tty", ATTRS{idVendor}=="1234", ATTRS{idProduct}=="5678", ATTRS{serial}=="EXAMPLE001", SYMLINK+="example-console"
```

Replace the values with observed data and verify that all parent matches belong to one parent device. For a multi-interface adapter, further distinguish the intended port using an observed interface property or an existing per-port alias. A serial number alone may identify the package while matching more than one tty node.

If the intended identity is a physical location, match the observed `ENV{ID_PATH}` instead. Place that rule after the rules that populate the property. Reload rules and exercise the actual device event; reloading alone does not rewrite existing aliases. `SYMLINK` creates additional device-node names under `/dev`, not permanent sysfs directories. [systemd udev rules](https://github.com/systemd/systemd/blob/main/man/udev.xml)

## Resolve sysfs when the application needs it

Given a configured alias, discover its current sysfs location:

```bash
node=/dev/example-console
devpath=$(udevadm info --query=path --name="$node") || exit 1
device=$(readlink -f "/sys$devpath") || exit 1
printf '%s\n' "$device"
```

For production software, keep discovery and use close together and handle unplugging between them. Resolving a symlink does not pin the physical device in place. Check that the identity still matches before issuing a sensitive operation, and treat disappearance as a recoverable lifecycle event rather than retrying against another matching device.

If the desired control belongs to a USB parent, walk the actual parent chain and select that parent by subsystem and identifying attributes. Do not assume a fixed number of `../` steps. Store the child's identity and the parent's role separately. The kernel documents canonical devpaths as current device identifiers and warns against inheriting a parent's properties into a child record. [Kernel sysfs access rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)

## Test identity failures deliberately

Test with two identical adapters connected in reversed order. Then reconnect the same adapter to the same port, move it to another port, and replace it with a different serial number. These cases expose different mistakes and should have explicit expected outcomes.

Reject ambiguous matches. Picking the first device from a directory listing makes enumeration order part of your identity policy. Log the configured identity, resolved alias, canonical devpath, and observed serial or topology on each successful connection so operators can explain why that device was selected.

## Conclusion

A stable application identity can survive a changing sysfs path when it is resolved anew for each device incarnation. Use serials for a particular device, topology for a particular location, and udev aliases for device-node access. Keep ambiguity and hotplug handling explicit so a path change cannot silently redirect a control operation.

## Official Documentation

- [systemd: udev rules and symlinks](https://github.com/systemd/systemd/blob/main/man/udev.xml)
- [systemd: path_id source](https://github.com/systemd/systemd/blob/main/src/udev/udev-builtin-path_id.c)
- [Linux kernel: sysfs identity rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)
