# Why sudo echo to sysfs Fails and When sudo tee Is Not Enough

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Troubleshooting, Kernel, Security

Description: Diagnose sysfs write failures by separating shell redirection, mount restrictions, file permissions, and driver validation.

A command such as `sudo echo on > /sys/devices/.../power/control` can fail before `sudo` starts. The shell opens the destination for `>`, using your current credentials. Giving the command elevated privileges does not elevate the shell that prepares its output.

That explains one common permission error. It does not explain every failed sysfs write. A sysfs attribute is a kernel interface with its own access rules, accepted values, and device lifecycle. Diagnose those layers separately so that fixing one does not hide another.

## Put privilege on the process that opens the file

For a documented, writable attribute, use this pattern after replacing the illustrative device path:

```bash
attribute=/sys/devices/platform/example-device/power/control
printf '%s\n' on | sudo tee "$attribute" >/dev/null
```

Here `tee` opens the attribute as root. The final redirection discards its ordinary standard output; it does not perform the sysfs write. Avoid `tee -a`: an attribute normally represents a complete request, not an appendable text document.

Another option runs both the write and redirection in a privileged shell:

```bash
sudo sh -c 'printf "%s\n" "$1" > "$2"' sh on "$attribute"
```

Passing the value and path as positional arguments avoids assembling executable shell text from variables. GNU Bash documents redirection as shell processing that occurs before command execution. [Bash redirection documentation](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

Neither example is a recommendation to change an arbitrary device. First identify the attribute's documented purpose. For runtime power management, `on` forbids runtime suspension, whereas `auto` permits the driver to use it when conditions allow; neither is a generic device enable switch. [Kernel runtime power management documentation](https://docs.kernel.org/power/runtime_pm.html)

## Find the layer rejecting the request

Capture the exact command, value, path, and error. These read-only commands provide the first useful evidence on a Linux host:

```bash
id
ls -l "$attribute"
namei -l "$attribute"
findmnt -T "$attribute" -o TARGET,FSTYPE,OPTIONS
readlink -f "$(dirname "$attribute")"
```

`namei` helps identify an inaccessible parent directory. `findmnt` reveals whether the relevant mount is read-only. Resolving the directory helps connect a convenient class alias with the actual device. If the failure occurs inside a service or container, collect mount information there as well: the host's view may differ.

A read-only mount produces `EROFS`, commonly displayed as `Read-only file system`. Changing ownership cannot make that mount writable. A denial from ordinary file access commonly appears as `EACCES`. A device callback may reject a syntactically valid write with `EINVAL`, `EPERM`, or another error. These are clues, not a universal mapping between error text and root cause.

## Observe the actual write

When the intended setting is understood and a single attempt is acceptable, trace that attempt:

```bash
printf '%s\n' on |
  sudo strace -o /tmp/sysfs-write.trace -e trace=openat,write,close \
    tee "$attribute" >/dev/null
```

Inspect the file descriptor associated with the attribute, rather than the writes to standard output. An `openat()` failure points toward path access, mount policy, or a security restriction. An open that succeeds followed by a failing `write()` takes the investigation closer to the attribute implementation.

The trace performs the write; it is not a dry run. Do not repeat a reset, remove, firmware, or binding operation merely to get a cleaner trace. Preserve the first useful result and investigate from there.

## Understand the driver's contract

Ordinary text attributes invoke a kernel `store()` callback. Successful access checks do not require that callback to accept every string. It may validate a number, enforce a range, require a particular device state, or delegate an operation that hardware rejects. Read-only attributes have no supported write operation to unlock. [Kernel sysfs interface documentation](https://docs.kernel.org/filesystems/sysfs.html)

Check the attribute's ABI documentation and the source matching your running distribution kernel. Record whether a terminal newline is accepted, whether units are implicit, and whether the operation changes a persistent setting or triggers a one-time action. For example, a value expressed in milliseconds should not be copied from an example expressed in seconds.

If a write succeeds, read the attribute back when its ABI supports reading. Then verify the intended behavior separately. A setting may describe policy rather than the current hardware state; a power policy readback cannot by itself prove that a device is suspended.

## Fix the specific cause

Keep the remedy proportional to the evidence. Use `sudo tee` for shell redirection mistakes. Correct a malformed value when parsing fails. Adjust a service's documented sandbox settings only when its mount namespace blocks a required operation. Investigate SELinux or AppArmor logs when their policy is involved. Fix a driver limitation through its supported interface rather than granting broader privileges.

If a successful setting later reverts, inspect which service, driver transition, or device recreation wrote the replacement value. Repeatedly escalating privileges will not solve competing configuration owners.

## Conclusion

A successful sysfs write must pass shell setup, path access, mount policy, and the driver's own contract. Place privilege on the writer, capture the failing system call, and verify the documented device behavior. That sequence turns an ambiguous permission message into a specific fix.

## Official Documentation

- [GNU Bash: redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)
- [Linux kernel: sysfs attributes](https://docs.kernel.org/filesystems/sysfs.html)
- [Linux kernel: runtime power management](https://docs.kernel.org/power/runtime_pm.html)
