# Why chmod and chown Changes Under sysfs Disappear

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Security, Udev, Systemd

Description: Reapply narrow sysfs access permissions at device creation while distinguishing attribute ownership from udev device-node rules.

Changing a sysfs attribute to `root:device-control` with mode `0660` can give a service exactly the access it needs. That change can vanish after reboot, driver reload, or hotplug because the kernel recreated the attribute with its original ownership and mode.

The lasting configuration must describe how to apply permissions to each new instance. It also needs to target the sysfs attribute itself. A udev rule that sets `GROUP` and `MODE` normally controls a device node under `/dev`, which is a separate object.

## Identify the object that needs access

Start with the actual operation performed by the application. If it opens `/dev/ttyUSB0`, configure that device node. If it writes `/sys/class/leds/.../brightness`, configure the attribute or provide a small privileged interface to it. Granting access to one does not grant access to the other. [systemd udev documentation](https://github.com/systemd/systemd/blob/main/man/udev.xml)

For a harmless, dedicated example indicator, inspect:

```bash
attribute=/sys/class/leds/example:green:status/brightness
readlink -f "$attribute"
ls -l "$attribute"
namei -l "$attribute"
```

The example name must be replaced with a device identified on your host. Confirm that the control really is suitable for delegation. Some attributes named `enable`, `reset`, or `remove` can disrupt other workloads even when they look like simple boolean settings.

Also check the intended service's groups and mount namespace. Correct ownership on the host does not make an attribute writable inside a sandbox that mounts it read-only.

## Use a dedicated group and a narrow permission change

For one existing attribute, the conceptual change is:

```bash
sudo chown root:device-control "$attribute"
sudo chmod 0660 "$attribute"
```

Create the dedicated group through your host's normal account-management process and add only the service identity that needs this control. Restart the service after changing supplementary group membership so its new process receives the group.

Keep root as the owner and grant write permission only to the specific group. Avoid recursive permission changes across `/sys` or a whole device directory. Adjacent attributes may include powerful controls that the application never needs.

The kernel's attribute declaration establishes the initial interface mode. A later `chmod` changes filesystem permission metadata; it cannot add a missing `store()` callback or bypass validation inside an existing callback. [Linux sysfs documentation](https://docs.kernel.org/filesystems/sysfs.html)

## Reapply on the correct device event

For a fixed LED identity whose brightness attribute exists at add time, a short udev action can reapply ownership and mode:

```udev
ACTION=="add", SUBSYSTEM=="leds", KERNEL=="example:green:status", TEST=="brightness", RUN+="/usr/bin/chown root:device-control /sys%p/brightness", RUN+="/usr/bin/chmod 0660 /sys%p/brightness"
```

This rule is illustrative. Verify your command paths and device match. `%p` expands to the event device's devpath. The rule deliberately changes just `brightness`; it does not grant control over `trigger` or other attributes. For devices whose identity can vary or whose path requires more careful validation, use a fixed-purpose helper instead of embedding broader commands.

udev external programs are not automatically executed through a shell. Redirections and shell pipelines inside `RUN` do not have shell meaning unless you explicitly invoke a shell. Simple commands also must finish quickly; device event processing is not a place for a persistent daemon. [udev rule execution documentation](https://github.com/systemd/systemd/blob/main/man/udev.xml)

Reload the rules and test the real lifecycle event. Observe the matched device, final permissions, and the service's ability to perform its single allowed operation.

## Consider tmpfiles for stable, early attributes

For an object guaranteed to exist when tmpfiles is applied, a lowercase `z` rule adjusts an existing path's mode and ownership:

```text
z /sys/class/leds/example:green:status/brightness 0660 root device-control - -
```

A dedicated file such as `/etc/tmpfiles.d/example-led.conf` makes the policy easy to review. Apply and inspect that file during deployment using the installed version of `systemd-tmpfiles`.

This mechanism does not watch for later object creation. A boot-time rule can be correct and still miss a USB device connected afterward. Pair the policy with the lifecycle that actually recreates the attribute. [systemd tmpfiles documentation](https://github.com/systemd/systemd/blob/main/man/tmpfiles.d.xml)

## Decide whether raw write access is too broad

Mode `0660` allows the group to submit any value accepted by that attribute. If the application should choose only between two approved settings, direct filesystem access may be broader than the desired policy.

A host helper can expose named actions, validate a range, check device identity, and log requests while keeping the attribute root-owned. Its executable, configuration, and parent directories must be protected from the service user. Avoid a generic privileged helper that accepts an arbitrary pathname: that turns one-control access into a general root file writer.

During validation, test both positive and negative cases. The service should write the intended attribute successfully, fail to write a neighboring control, and retain the correct behavior after device recreation. Record failures instead of repeatedly changing permissions until the symptom disappears.

## Conclusion

sysfs permissions follow kernel object lifetimes. Store a narrow permission policy and reapply it when the intended attribute is created. Distinguish `/dev` rules from `/sys` attributes, keep privileged ownership intact, and use a dedicated helper when permitted values need stricter control than a group write bit can express.

## Official Documentation

- [systemd: udev rule keys and programs](https://github.com/systemd/systemd/blob/main/man/udev.xml)
- [systemd: tmpfiles.d ownership and mode rules](https://github.com/systemd/systemd/blob/main/man/tmpfiles.d.xml)
- [Linux kernel: sysfs attributes](https://docs.kernel.org/filesystems/sysfs.html)
