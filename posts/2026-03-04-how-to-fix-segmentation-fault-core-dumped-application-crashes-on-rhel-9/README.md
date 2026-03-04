# How to Fix 'Segmentation Fault (Core Dumped)' Application Crashes on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on fix 'segmentation fault (core dumped)' application crashes on rhel 9 with practical examples and commands.

---

Segmentation faults indicate a program tried to access memory it should not. Here is how to diagnose application crashes on RHEL 9.

## Check for Core Dumps

```bash
# Check if core dumps are enabled
ulimit -c
# Enable if zero
ulimit -c unlimited

# Check systemd coredump configuration
cat /etc/systemd/coredump.conf
```

## View Recent Core Dumps

```bash
coredumpctl list
coredumpctl info <PID>
```

## Analyze a Core Dump with gdb

```bash
sudo dnf install -y gdb
sudo dnf debuginfo-install -y crashed-application

coredumpctl debug <PID>
# In gdb:
# bt    (backtrace)
# info registers
# quit
```

## Check for Known Bugs

```bash
# Check if the package needs updating
sudo dnf check-update crashed-package

# Update to the latest version
sudo dnf update crashed-package
```

## Check Library Dependencies

```bash
ldd /usr/bin/crashed-application
```

Look for missing libraries:

```bash
ldd /usr/bin/crashed-application | grep "not found"
```

## Check SELinux

```bash
sudo ausearch -m AVC -ts recent
```

## Check Memory Issues

```bash
# Run memtest from GRUB boot menu
# Or use valgrind for user-space applications
sudo dnf install -y valgrind
valgrind ./crashed-application
```

## Enable ABRT for Automatic Reporting

```bash
sudo dnf install -y abrt abrt-cli
sudo systemctl enable --now abrtd
abrt-cli list
```

## Check System Logs

```bash
sudo journalctl -p err -b
sudo dmesg | grep -i segfault
```

## Conclusion

Segmentation faults on RHEL 9 require examining core dumps, checking for updates, and verifying library dependencies. Use gdb and coredumpctl for diagnosis, and keep packages updated to benefit from bug fixes.

