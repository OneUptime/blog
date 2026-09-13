# Make a sysfs Setting Survive Reboot, Hotplug, and Resume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Systemd, Udev, DevOps

Description: Choose lifecycle-aware mechanisms to reapply sysfs settings after boot, module loading, device hotplug, and system resume.

A write under `/sys` changes a running kernel object. The file is not a configuration file stored on disk. When a driver creates a new device object, reloads hardware state, or resumes a device, a previously applied value may disappear or be reset.

Persistence therefore means saving a policy and applying it when the relevant device is ready. Boot, hotplug, and resume are different events. One startup command rarely covers all three.

## Establish which event resets the setting

Record the canonical device path, current value, and the exact transition that loses it. Test boot, a supported module reload, unplug and replug, and suspend and resume separately on suitable hardware. Check whether the sysfs file itself disappears or whether the same file remains with a different value.

Use a device event monitor while reproducing the relevant transition:

```bash
udevadm monitor --kernel --udev --property
```

Correlate its output with the kernel journal and your readbacks. A driver reload may recreate the attribute; a resume callback may overwrite a register without producing a matching add event. A power-management service may also restore its own policy after your write.

Before adding automation, look for a supported driver parameter or an existing subsystem configuration service. Two independent owners repeatedly restoring conflicting values can create a confusing race.

## Apply a setting when a device is added

For a short write to an attribute already present at the event, a udev rule is often appropriate. This illustrative rule applies a runtime power policy to one USB device with a unique serial number:

```udev
ACTION=="add", SUBSYSTEM=="usb", ENV{DEVTYPE}=="usb_device", ATTR{idVendor}=="1234", ATTR{idProduct}=="5678", ATTR{serial}=="EXAMPLE001", TEST=="power/control", ATTR{power/control}="on"
```

Replace all identity values with observed values. `ATTR{...}=` writes an attribute on the matched event device. Matching a USB interface or a serial child is a different operation. A rule that matches the wrong level can appear to run successfully while addressing an unrelated control. [systemd udev documentation](https://github.com/systemd/systemd/blob/main/man/udev.xml)

For this specific control, `on` prevents runtime suspension. It is not a general instruction to power on arbitrary hardware. Choose the value from the attribute's documented ABI. [Kernel runtime power management](https://docs.kernel.org/power/runtime_pm.html)

Reloading rules affects subsequent events:

```bash
sudo udevadm control --reload-rules
```

Then exercise the intended device event during an appropriate maintenance test. A targeted synthetic add event is another option, but it executes all matching rules, including rules unrelated to your change. Do not trigger the whole device tree just to test one setting.

## Use a service for work that needs coordination

A helper that waits for firmware, performs several ordered operations, or logs detailed results belongs in a service rather than a long-running udev `RUN` command. The service should resolve the intended device, validate its identity, and fail visibly when the control is absent.

The following unit shows the shape of a fixed-purpose helper:

```ini
[Unit]
Description=Apply example device policy

[Service]
Type=oneshot
ExecStart=/usr/local/libexec/apply-example-device-policy
```

The helper path is illustrative; implement it before installing the unit. Give it a fixed allowed operation and bounded runtime. It should compare current and desired state, make only the necessary write, verify the result, and report failures through its exit status.

Where supported, udev can tag the device for systemd and request this service using `SYSTEMD_WANTS`. Arrange activation around the device becoming available. A service marked permanently active with `RemainAfterExit=yes` will not automatically rerun on every subsequent request, so decide explicitly how each new device incarnation triggers fresh work. [systemd device unit documentation](https://github.com/systemd/systemd/blob/main/man/systemd.device.xml)

## Treat boot-time tmpfiles as one lifecycle hook

For an attribute guaranteed to exist when tmpfiles runs, a `w` entry can write a value:

```text
w /sys/devices/platform/example-device/example_setting - - - - 25
```

Save the real entry in a dedicated file under `/etc/tmpfiles.d/`. This is useful for stable, early-created objects. It does not watch for later hotplug, delayed module loading, or resume. A missing attribute at boot requires a later lifecycle hook, not an arbitrary longer boot delay. [systemd tmpfiles configuration](https://github.com/systemd/systemd/blob/main/man/tmpfiles.d.xml)

## Add a resume path only when needed

If measurements show the setting resets on resume without device recreation, arrange an explicit resume action that calls the same idempotent helper. systemd sleep hooks receive pre and post phases, but hooks run in parallel and user sessions may be frozen. Keep them short, do not depend on ordering against other hooks, and avoid requiring a desktop process to respond. [systemd suspend service documentation](https://github.com/systemd/systemd/blob/main/man/systemd-suspend.service.xml)

Where a supported daemon already owns this policy, configure that daemon instead. Otherwise, log the requested value, resolved device, event, and readback so that the next reset can be traced to its cause.

## Conclusion

Persist the desired policy, then connect its application to the device's actual lifecycle. Use a small attribute rule for add events, a bounded service for coordinated work, and a resume action only when evidence requires it. Validate each transition independently instead of assuming a successful boot test covers all cases.

## Official Documentation

- [systemd: udev rules](https://github.com/systemd/systemd/blob/main/man/udev.xml)
- [systemd: tmpfiles.d](https://github.com/systemd/systemd/blob/main/man/tmpfiles.d.xml)
- [systemd: systemd-suspend.service](https://github.com/systemd/systemd/blob/main/man/systemd-suspend.service.xml)
- [Linux kernel: runtime power management](https://docs.kernel.org/power/runtime_pm.html)
