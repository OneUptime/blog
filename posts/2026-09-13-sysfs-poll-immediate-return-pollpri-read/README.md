# Fix sysfs poll() Returning Immediately with POLLPRI and a Fresh Read

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, Troubleshooting, C

Description: Build a sysfs notification loop that performs an initial read, waits for priority events, seeks to zero, and handles removal.

A sysfs monitoring loop can consume a CPU while appearing to wait for changes. Two common causes are requesting ordinary readable events and failing to read the attribute before polling. Neither condition tells you that the hardware is changing rapidly.

For a text attribute that supports sysfs notifications, read its initial value, wait for `POLLPRI`, and reread from offset zero after each notification. Also plan for device removal and attributes that never emit notifications.

## Understand what readiness means

A sysfs text file is generally readable immediately. Requesting `POLLIN` asks whether a read can proceed, not whether the attribute value has changed. That makes ordinary readable readiness the wrong condition for a change-monitoring loop.

The current kernfs implementation tracks a notification counter and the counter observed by each open file. A fresh open has not yet observed the current state. Reading updates that observation; a later notification makes the counters differ and produces priority/error readiness. The initial readiness and counter behavior are visible in the upstream implementation. [Linux kernfs file operations](https://github.com/torvalds/linux/blob/master/fs/kernfs/file.c)

Treat these details as an explanation of the supported usage pattern, not as a counter ABI to reproduce in userspace.

## Keep one descriptor and refresh from the start

This example uses Python to make the file-position behavior explicit. It is intended for a known, small text attribute whose driver documents notification support:

```python
import os
import select
import sys

path = sys.argv[1]
fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC)
page_size = os.sysconf('SC_PAGE_SIZE')

def refresh():
    os.lseek(fd, 0, os.SEEK_SET)
    data = os.read(fd, page_size)
    if not data:
        raise RuntimeError('Attribute returned no state')
    return data.decode('ascii').rstrip('\n')

try:
    print('initial:', refresh(), flush=True)
    waiter = select.poll()
    waiter.register(fd, select.POLLPRI | select.POLLERR)
    while True:
        events = waiter.poll(30000)
        if not events:
            continue
        for _, flags in events:
            if flags & (select.POLLNVAL | select.POLLHUP):
                raise RuntimeError(f'Attribute unavailable: flags={flags}')
            if flags & (select.POLLPRI | select.POLLERR):
                print('current:', refresh(), flush=True)
finally:
    os.close(fd)
```

A read failure exits visibly instead of starting a tight retry loop. For a daemon, catch that failure outside the monitoring session, rediscover the intended device, and reopen it with bounded retry delays. The timeout provides a place to check shutdown conditions or device identity; it does not create notification support. [Python poll interface](https://docs.python.org/3/library/select.html#select.poll)

The example assumes ASCII text and one page is enough for the attribute. Adapt parsing to its ABI. Do not use this text reader for binary attributes with unrelated offset semantics.

## Why seeking is essential

After reading a text attribute, the descriptor's offset is at the end of the returned value. Reading again at that offset can return end-of-file rather than a fresh value. Seeking to zero requests a new snapshot and lets the read acknowledge the notification state.

Closing and reopening is another way to obtain a fresh snapshot, but keeping one descriptor makes the monitoring lifecycle easier to reason about. Merely seeking without performing the read is insufficient: the read is the operation that obtains the current state.

If the attribute changes between the read and entering `poll`, the notification state remains pending for that descriptor. This is why the loop should read before waiting rather than inserting arbitrary sleeps intended to avoid a race.

## Interpret POLLERR in the sysfs context

For this interface, `POLLERR` can accompany an ordinary attribute notification. It is not automatically evidence of hardware failure. Refresh the state and inspect the read result. The same event path can also become ready when the object is removed, so successful parsing must not be assumed.

Log repeated read errors with the device identity and stop polling a dead descriptor. A name that reappears after hotplug can refer to a new kernel object, even if the path string is unchanged.

## Confirm that the driver emits notifications

An attribute can be readable and pollable without ever waking on value changes. The relevant driver or subsystem must call the notification mechanism, commonly `sysfs_notify()`, for the correct object and attribute name. There is no general userspace probe that proves every future change will emit an event. Inspect the documented ABI or the matching source. [Linux sysfs notification implementation](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)

Notifications can coalesce. If the state changes several times before the next read, you receive the current value, not a replay of all transitions. Use a counter or a dedicated event interface when every transition matters.

For a controlled check, compare polling before and after the initial read, verify that adding `POLLIN` produces immediate readiness, and trigger one documented state transition on suitable test hardware. These checks separate event-mask bugs from missing driver notifications.

## Conclusion

A sysfs change watcher needs an initial read, priority-event polling, and a fresh read from offset zero after each wakeup. Handle read errors as lifecycle events and confirm notification support in the driver. The result is a state monitor with bounded waiting, rather than a busy loop or an assumed event queue.

## Official Documentation

- [Linux kernel: kernfs polling and read implementation](https://github.com/torvalds/linux/blob/master/fs/kernfs/file.c)
- [Linux kernel: sysfs notifications](https://github.com/torvalds/linux/blob/master/fs/sysfs/file.c)
- [Python: poll objects](https://docs.python.org/3/library/select.html#select.poll)
