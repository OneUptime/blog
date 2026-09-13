# Choose sysfs_notify or a uevent for Driver State Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, Udev, C

Description: Choose between waking attribute pollers and broadcasting device events, with clear state, lifetime, and delivery semantics.

A driver can change a sysfs value without userspace noticing immediately. Calling `sysfs_notify()` can wake processes monitoring that attribute. Emitting a uevent can tell device-management subscribers that something about a device changed.

Those mechanisms have different audiences. Choose the one that matches the interface's contract, and keep the authoritative state readable so consumers can recover after missed or coalesced notifications.

## Start with the consumer

A process already holding an attribute descriptor usually wants a wakeup telling it to reread the current value. That is the natural role of a sysfs notification.

A device manager watching add, remove, bind, or meaningful device changes needs an event describing a device. That is the role of the kernel uevent mechanism and the udev ecosystem.

| Requirement | Suitable starting point |
|---|---|
| Wake a watcher of one attribute | `sysfs_notify()` |
| Announce a device-level change | Existing subsystem event mechanism or uevent |
| Deliver every sample or transition | A dedicated event or streaming interface |
| Run application business logic reliably | Userspace service consuming durable state |

Do not emit both mechanisms for every update without a reason. Each additional event becomes work for listeners and another behavior that applications may begin to depend on.

## Notify after updating observable state

For a scalar named `status` directly on a device, the intended ordering is:

```c
/* Fragment called in sleepable context with a live device. */
mutex_lock(&state->lock);
changed = state->status != next_status;
state->status = next_status;
mutex_unlock(&state->lock);

if (changed)
    sysfs_notify(&dev->kobj, NULL, "status");
```

The variables represent driver-specific state; this is not a complete driver. The corresponding `show()` must use compatible synchronization when reading that state. Notify after publishing the value so a woken reader does not observe an update that has not yet been applied.

If the attribute is in a named group, pass that group directory, for example `sysfs_notify(&dev->kobj, "controls", "status")`. The object, group, and attribute must identify the file actually being watched. The implementation locates that attribute and notifies its kernfs node. [Linux sysfs notification source](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)

## Explain what an attribute watcher receives

A watcher should read the initial value, poll for priority/error notification readiness, seek to offset zero, and read again. Ordinary readable readiness is not a change event. Polling the wrong file or skipping the refresh can create a busy loop.

The notification represents a need to reread state. It does not contain the old value, new value, or an event payload. Several changes can collapse into one observed wakeup. Two concurrent producers can also update state between notification and read, so the result is the current snapshot rather than the exact transition that first caused readiness. [Kernfs notification and polling implementation](https://github.com/torvalds/linux/blob/master/fs/kernfs/file.c)

If consumers need to detect that updates were skipped, expose a properly synchronized generation counter as part of a documented protocol. If they require every event's payload, use an interface designed to queue those events.

## Use uevents for meaningful device changes

A driver with a justified device-level event may use:

```c
ret = kobject_uevent(&dev->kobj, KOBJ_CHANGE);
if (ret)
    dev_warn_ratelimited(dev, "change event failed: %d\n", ret);
```

This fragment belongs in a suitable sleepable context with the device lifetime guaranteed. Prefer a subsystem helper when one already exists: it can provide established event fields and avoid duplicate announcements.

A uevent contains device context such as action and devpath. The implementation can include environment data and broadcasts through the kernel's event infrastructure. A successful return is not an acknowledgment that every listener processed the event. The upstream implementation explicitly leaves receive-buffer overflow handling to userspace. [Kernel uevent implementation](https://github.com/torvalds/linux/blob/master/lib/kobject_uevent.c)

Do not treat a uevent as a durable message queue or place a high-rate sample stream in it. A device manager can be doing substantial work for each matching event.

## Observe the right event layer

For troubleshooting on a system with udev:

```bash
udevadm monitor --kernel --udev --property
```

Kernel and udev output describe different stages. udev can apply rules and attach additional properties before emitting its processed event. A sysfs notification by itself should not be expected to appear as a udev change event. [systemd udev event processing documentation](https://github.com/systemd/systemd/blob/main/man/udev.xml)

A synthetic event created during testing also does not prove that the hardware driver emits the same event under real conditions. Validate one real, documented transition on test hardware and correlate it with the attribute readback.

## Protect teardown and recovery

Stop interrupt sources, timers, or work items that produce notifications before releasing the state and device references they use. Merely checking whether a pointer is non-NULL does not establish a safe lifetime. A worker queued before removal can run later unless the teardown sequence prevents it.

Consumers should tolerate device disappearance, reopen after a new device incarnation, and rescan state after lost events or restart. Keep the current state authoritative and make event handling idempotent so a duplicate wakeup is harmless.

## Conclusion

Use `sysfs_notify()` to wake readers of a particular attribute and uevents for established device-level notifications. Neither mechanism guarantees a durable history of every transition. Publish state before signaling, coordinate device lifetime, and design consumers to reread and reconcile the current state.

## Official Documentation

- [Linux kernel: sysfs notifications](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)
- [Linux kernel: kernfs polling](https://github.com/torvalds/linux/blob/master/fs/kernfs/file.c)
- [Linux kernel: uevent implementation](https://github.com/torvalds/linux/blob/master/lib/kobject_uevent.c)
- [systemd: udev events](https://github.com/systemd/systemd/blob/main/man/udev.xml)
