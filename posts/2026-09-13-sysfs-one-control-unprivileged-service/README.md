# Expose One sysfs Control to an Unprivileged Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Security, Systemd, Udev

Description: Grant a service narrow access to one sysfs attribute using dedicated ownership and a restricted service namespace.

A service that needs to adjust one device setting does not need to run all its application logic as root. The access can often be expressed as a dedicated group permission on one attribute, combined with a service namespace that leaves the rest of sysfs read-only.

There is one important design decision: should the service be allowed to submit every value the attribute accepts, or only a smaller set of approved actions? File permissions answer the first question. A fixed-purpose privileged broker can answer the second.

## Define the smallest useful operation

Use an attribute with a documented purpose and bounded impact. A dedicated indicator's brightness control is a useful example; a storage-controller reset is a substantially different operation even if both accept small integers.

Confirm the intended device identity and canonical path:

```bash
attribute=/sys/class/leds/example:green:status/brightness
readlink -e "$attribute"
cat /sys/class/leds/example:green:status/max_brightness
ls -l "$attribute"
```

The example name must be replaced with an observed, dedicated device. LED brightness ranges from zero to the device's advertised maximum, and triggers can influence its behavior. Configure any trigger policy separately before deciding what the service should control. [Kernel LED documentation](https://docs.kernel.org/leds/leds-class.html)

## Grant a dedicated group access

Create a group such as `led-control` through your normal account-management process and give that group write access to the one attribute:

```bash
sudo chown root:led-control "$attribute"
sudo chmod 0660 "$attribute"
```

Keep the attribute root-owned. The service should not own the helper scripts or configuration that determine its privileged access. Avoid recursively changing the parent device's mode, because neighboring controls can have unrelated effects.

These commands affect the current attribute instance. Reapply the policy when the kernel recreates it. A narrowly matched udev rule can run short ownership commands on the LED's add event:

```udev
ACTION=="add", SUBSYSTEM=="leds", KERNEL=="example:green:status", TEST=="brightness", RUN+="/usr/bin/chown root:led-control /sys%p/brightness", RUN+="/usr/bin/chmod 0660 /sys%p/brightness"
```

Verify the command locations and event identity on the target host. The standard udev `GROUP` and `MODE` assignments concern device nodes under `/dev`; they are not a replacement for changing a sysfs attribute's permission metadata. [systemd udev documentation](https://github.com/systemd/systemd/blob/main/man/udev.xml)

## Give the service a narrow writable exception

A system service can run with no capabilities and a dedicated supplementary group. This example is a template for a real daemon you provide:

```ini
[Unit]
Description=Dedicated status LED agent

[Service]
Type=simple
User=led-agent
SupplementaryGroups=led-control
ExecStart=/usr/local/bin/led-agent
NoNewPrivileges=yes
CapabilityBoundingSet=
ProtectSystem=strict
ProtectHome=yes
ReadOnlyPaths=/sys
ReadWritePaths=/sys/devices/platform/example-board/leds/example:green:status/brightness
```

Replace the exception with the verified canonical path. Ensure the daemon and account exist, and that the device is available before starting the service. The daemon must know which approved brightness file to use through root-controlled configuration.

`ReadWritePaths` preserves ordinary access checks; it does not grant permission by itself. It can create a writable exception within a read-only namespace, but it cannot make an underlying read-only filesystem superblock writable. [systemd execution sandbox documentation](https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml)

This template intentionally relies on the explicit `/sys` policy shown. If an existing service also uses `ProtectKernelTunables`, additional bind mounts, or another root directory, review the combined effective namespace instead of assuming a copied exception overrides every setting.

## Account for hotplug and replacement

A service mount exception can refer to the attribute instance resolved when the namespace is created. Device removal and recreation can invalidate that reference. Reapply ownership through the device event and arrange for the service to restart or reconnect according to the actual lifecycle.

Do not silently switch to the first device that happens to have the same filename. Validate identity again after replacement. A service intended for one physical indicator should fail visibly if its configured target cannot be established.

## Use a broker when values need policy

Direct write permission allows every operation accepted by that attribute. If the application should request only `indicator-on` and `indicator-off`, a small host service can own the attribute and expose those named actions over a local authenticated interface.

Keep the target path fixed in privileged configuration, validate inputs, serialize requests, and verify readback. The client must not supply arbitrary file paths, shell commands, or unchecked numeric ranges. Grant access to the broker's narrow endpoint instead of granting general `sudo tee` or unrestricted root shell access.

A broker also gives one place to coordinate device discovery, hotplug, rate limits, and audit records. It can be preferable when several clients would otherwise race to control the same attribute.

## Verify the allowed and denied cases

Test from the real service context. It should perform the intended brightness write, fail to change a neighboring sysfs control, and fail to modify its executable or privileged configuration. Inspect the effective unit and mount namespace if host-side writes work but service-side writes fail.

Repeat the test after device recreation and reboot. A correct initial permission change is only one part of a persistent least-privilege arrangement.

## Conclusion

One sysfs control can often be delegated with a dedicated group and one writable namespace exception. Keep the rest of the service unprivileged and reconnect access to device lifetime. When allowed values need application policy, put that policy in a small fixed-purpose broker rather than broadening filesystem privileges.

## Official Documentation

- [Linux kernel: LED class controls](https://docs.kernel.org/leds/leds-class.html)
- [systemd: udev rule execution](https://github.com/systemd/systemd/blob/main/man/udev.xml)
- [systemd: execution sandbox and access paths](https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml)
