# Root Cannot Write a sysfs Attribute: Trace EINVAL, EPERM, and store()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, Troubleshooting, C

Description: Trace a rejected sysfs write from userspace errno to attribute registration, parsing, device state, and the driver callback.

Being able to read a sysfs attribute proves that the read path works. It does not prove that a write callback exists, that your value is valid, or that the operation is permitted in the device's current state. Root can reach a kernel callback and still receive an error.

The useful question is where the operation failed. A short trace, the attribute's ABI description, and the matching kernel source usually provide a much stronger answer than repeatedly changing permissions.

## Capture a single intended operation

Choose an attribute whose write semantics you already understand. The following path and value are placeholders for an approved setting, not a runnable hardware prescription:

```bash
attribute=/sys/devices/platform/example-device/example_limit
value=25
ls -l "$attribute"
findmnt -T "$attribute" -o TARGET,FSTYPE,OPTIONS
printf '%s\n' "$value" |
  sudo strace -o /tmp/example-limit.trace -e trace=openat,write,close \
    tee "$attribute" >/dev/null
```

Locate the `openat()` call for that exact path, note its returned descriptor, and follow the `write()` on that descriptor. Do not confuse a successful write to standard output with the write to sysfs. Save the trace alongside `uname -r` and the device's identity.

If opening the file fails, begin with mount restrictions, directory access, and security policy. If opening succeeds but the write fails, inspect the callback and any lower-level functions it invokes. A Linux security module can also affect operations, so a successful open alone does not conclusively prove that the driver generated the error.

## Read errno as evidence

| Result | A useful next question |
|---|---|
| `EINVAL` | Did parsing reject the string, range, mode, or current transition? |
| `EPERM` | Is there an explicit capability or policy check in this path? |
| `EACCES` | Do permissions or security policy block the access? |
| `EROFS` | Is this path on a read-only mount in this process's namespace? |
| `EBUSY` | Is another operation or user preventing the transition? |
| `ENODEV` | Was the device removed or made unavailable? |

The table is an investigation guide, not a guaranteed ABI. Different attributes return different errors for similar conditions. The kernel's sysfs access rules advise applications to propagate errors and avoid unnecessary dependence on particular implementation-specific error codes. [Kernel sysfs access rules](https://docs.kernel.org/admin-guide/sysfs-rules.html)

## Find who registered the attribute

Start with the canonical device directory and its subsystem. The bound driver is useful evidence, but attributes may come from the device core, bus code, or class framework instead:

```bash
device=$(readlink -f "$(dirname "$attribute")")
readlink -e "$device/subsystem"
readlink -e "$device/driver"
```

If the file is in an attribute subdirectory, identify the containing device before interpreting these links. A `power` or named attribute group directory is not necessarily its own device.

In the distribution's kernel source, search the exported filename and the registration machinery:

```bash
rg -n 'example_limit|DEVICE_ATTR|__ATTR' drivers include
rg -n 'dev_groups|device_add_group|sysfs_create_group' drivers/example
```

A declaration such as `DEVICE_ATTR_RW(example_limit)` connects the name with `example_limit_show()` and `example_limit_store()`. A custom `DEVICE_ATTR()` declaration can use differently named functions. Registration may also be assembled through attribute groups or macros, so follow the references rather than relying on one text match. [Upstream device attribute definitions](https://github.com/torvalds/linux/blob/master/include/linux/device.h)

## Follow the return value backward

Consider this simplified callback logic, shown as pseudocode to explain the investigation:

```text
parse decimal input
if parsing failed: return parser error
if outside supported range: return EINVAL
lock device state
if device is active in an incompatible mode: unlock device state and return EBUSY
program hardware
unlock device state
if programming failed: return hardware error
return original input byte count
```

Identify every early return, including those in helpers. A parser may accept decimal input but reject units such as `25ms`. A value can fit the C integer type and still exceed the device's supported range. A capability check can be evaluated against a user namespace that container root does not control.

Do not assume `chmod` can manufacture a missing callback. The sysfs write dispatch calls the registered store operation; access bits describe the interface but do not implement it. [Upstream sysfs write implementation](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)

## Test the explanation, not random values

Build a small evidence matrix on suitable test hardware: one documented valid value, one invalid string, one out-of-range value, and the same valid value in the relevant device states. Avoid destructive operations and restore the original configuration after a successful test where restoration is supported.

If source and observation disagree, verify the actual build. Distribution patches, a built-in driver, an out-of-tree module, or a different device revision may explain the mismatch. Record module information and the package source version before attributing behavior to upstream master.

## Conclusion

Root access removes only some obstacles to a sysfs write. The reliable diagnosis follows the request from its failing system call through attribute registration to parsing, authorization, and device state. Change the rejected condition, then verify both the readback and the resulting device behavior.

## Official Documentation

- [Linux kernel: rules for sysfs access](https://docs.kernel.org/admin-guide/sysfs-rules.html)
- [Linux kernel source: sysfs file operations](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)
- [Linux kernel source: device interfaces](https://github.com/torvalds/linux/blob/master/include/linux/device.h)
