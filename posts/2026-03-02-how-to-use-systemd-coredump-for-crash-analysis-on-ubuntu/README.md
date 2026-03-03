# How to Use systemd-coredump for Crash Analysis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Debugging, Crash Analysis, Core Dumps

Description: Configure systemd-coredump to capture and analyze application crashes on Ubuntu, use coredumpctl to inspect dumps, and debug with GDB.

---

When an application crashes with a segmentation fault, stack overflow, or other fatal signal, the operating system can write a core dump - a snapshot of the process's memory at the moment of the crash. `systemd-coredump` captures these dumps, stores them centrally, and provides tools to analyze them. Setting it up properly saves hours of debugging time when production applications crash.

## How systemd-coredump Works

Normally, core dumps go to the current working directory as a file named `core`. `systemd-coredump` intercepts this through the kernel's `core_pattern` mechanism, stores dumps in `/var/lib/systemd/coredump/`, compresses them, and indexes them in the systemd journal. The `coredumpctl` tool queries this index.

```bash
# Check if systemd-coredump is installed
dpkg -l | grep systemd-coredump

# Install if not present
sudo apt install systemd-coredump

# Verify the core pattern is set to use systemd-coredump
cat /proc/sys/kernel/core_pattern
# Should show: |/lib/systemd/systemd-coredump %P %u %g %s %t %c %h
```

## Configuring systemd-coredump

Edit `/etc/systemd/coredump.conf`:

```bash
sudo nano /etc/systemd/coredump.conf
```

```ini
[Coredump]
# What to do with core dumps
# "store": store to disk
# "journal": store in journal only (no separate file)
# "none": don't store
Storage=external

# Compress stored core dumps (xz compression)
Compress=yes

# Maximum size of a single core dump to store (in bytes)
# Use suffix: K, M, G
ProcessSizeMax=2G

# Maximum total space for all stored core dumps
ExternalSizeMax=10G

# How long to keep core dumps (0 = keep forever)
MaxRetentionSec=1week

# Keep at most this many core dumps
# MaxCount=100
```

After editing:

```bash
sudo systemctl daemon-reload
```

## Testing Core Dump Capture

Generate a deliberate crash to verify the setup:

```bash
# Cause a segfault in bash (harmless test)
sleep 100 &
kill -SEGV $!

# Or use a simple C program
cat > /tmp/crash_test.c << 'EOF'
#include <stdlib.h>
int main() {
    // Dereference a null pointer - causes SIGSEGV
    int *ptr = NULL;
    *ptr = 42;
    return 0;
}
EOF

# Compile with debug symbols (important for useful analysis)
gcc -g -o /tmp/crash_test /tmp/crash_test.c

# Run it - it will crash
/tmp/crash_test
# Segmentation fault (core dumped)
```

## Using coredumpctl

`coredumpctl` is the tool for listing and examining core dumps:

```bash
# List all recorded core dumps
coredumpctl list

# Example output:
# TIME                            PID  UID  GID SIG     COREFILE EXE
# Thu 2026-03-02 10:00:00 UTC    1234 1000 1000 SIGSEGV present  /tmp/crash_test
```

### Inspecting a Specific Crash

```bash
# Show detailed info about a specific crash (by PID)
coredumpctl info 1234

# Show info about the most recent crash
coredumpctl info

# Show info for all crashes from a specific executable
coredumpctl info /tmp/crash_test
```

Output includes:
- PID, UID, signal
- Timestamp
- Command line arguments
- Unit name (if a service crashed)
- Stack trace (if debug symbols are available)
- Coredump file location

### Viewing Stack Traces

```bash
# Show the backtrace for the most recent crash
coredumpctl info --debugger=gdb

# Or use gdb directly
coredumpctl debug

# In GDB, type:
# bt           - show backtrace
# bt full      - full backtrace with locals
# info threads - show all threads
# quit         - exit GDB
```

## Debugging with GDB

For thorough analysis, extract the core dump and analyze it:

```bash
# Extract the core dump file
coredumpctl dump 1234 --output=/tmp/crash.core

# Or dump the most recent
coredumpctl dump --output=/tmp/crash.core

# Run GDB with the binary and core dump
gdb /tmp/crash_test /tmp/crash.core
```

Inside GDB:

```text
(gdb) bt
#0  0x00005555555551a9 in main () at crash_test.c:5
        ptr = 0x0

(gdb) info registers
(gdb) x/10i $pc     # Show 10 instructions at program counter
(gdb) frame 0       # Select stack frame 0
(gdb) info locals   # Show local variables
(gdb) list          # Show source code around crash
(gdb) quit
```

## Analyzing Service Crashes

When a systemd service crashes, the core dump is automatically linked to the service name:

```bash
# List crashes from services
coredumpctl list | grep -i "service"

# Filter by service
coredumpctl list _SYSTEMD_UNIT=myapp.service

# Examine a service crash
coredumpctl info _SYSTEMD_UNIT=myapp.service

# Debug the most recent crash from a service
coredumpctl debug _SYSTEMD_UNIT=myapp.service
```

## Configuring Applications for Better Crash Reports

For meaningful analysis, binaries need debug symbols. Production builds often strip them. There are two approaches:

### Keep Separate Debug Symbols

```bash
# Compile with debug symbols
gcc -g -O2 -o myapp myapp.c

# Strip the binary but save debug symbols separately
objcopy --only-keep-debug myapp myapp.debug
strip --strip-debug --strip-unneeded myapp

# Link the stripped binary to its debug symbols
objcopy --add-gnu-debuglink=myapp.debug myapp

# GDB automatically finds the debug file
gdb myapp core
```

### Install Debug Symbol Packages

Ubuntu provides debug symbol packages for system libraries:

```bash
# Enable the debug symbol repository
echo "deb http://ddebs.ubuntu.com $(lsb_release -cs) main restricted universe multiverse" | \
    sudo tee /etc/apt/sources.list.d/ddebs.list

# Import the signing key
sudo apt install ubuntu-dbgsym-keyring
sudo apt update

# Install debug symbols for a specific package
sudo apt install libc6-dbgsym
sudo apt install nginx-dbgsym

# Now crash analysis shows library call stacks too
```

## Enabling Core Dumps for Applications

By default, applications run by users have core dumps enabled. But services running under systemd may have them disabled:

```ini
# /etc/systemd/system/myapp.service
[Service]
# Enable unlimited core dumps for this service
LimitCORE=infinity

# Or set a specific size limit (in bytes)
# LimitCORE=1G
```

Apply and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp.service

# Verify the limit
cat /proc/$(pgrep myapp)/limits | grep core
```

## Setting Up Automatic Alerts

Monitor for new crash dumps and send alerts:

```bash
# Watch the journal for coredump entries
sudo journalctl -f -t systemd-coredump
```

A simple monitoring script:

```bash
#!/bin/bash
# /usr/local/bin/monitor-crashes.sh
# Run via cron or as a service

NEW_CRASHES=$(coredumpctl list --since="1 hour ago" --no-pager 2>/dev/null | grep -v TIME | wc -l)

if [ "$NEW_CRASHES" -gt 0 ]; then
    echo "WARNING: $NEW_CRASHES new crash(es) in the last hour"
    coredumpctl list --since="1 hour ago" --no-pager
    # Send to your monitoring system or email
fi
```

```bash
# Add to crontab
echo "*/30 * * * * /usr/local/bin/monitor-crashes.sh 2>&1 | logger -t crash-monitor" | crontab -
```

## Cleaning Up Core Dumps

```bash
# Check disk usage by core dumps
du -sh /var/lib/systemd/coredump/

# List stored core dumps and their sizes
coredumpctl list --no-pager

# Clean up via journald vacuum
sudo journalctl --vacuum-time=1week

# Manually remove old dumps
sudo find /var/lib/systemd/coredump/ -name "*.zst" -mtime +7 -delete
sudo find /var/lib/systemd/coredump/ -name "*.lz4" -mtime +7 -delete
```

The `MaxRetentionSec` and `ExternalSizeMax` settings in `coredump.conf` handle this automatically when configured.

## Troubleshooting Missing Core Dumps

**Core dumps not appearing in coredumpctl**:

```bash
# Check if core_pattern is set correctly
cat /proc/sys/kernel/core_pattern
# Should be: |/lib/systemd/systemd-coredump %P %u %g %s %t %c %h

# Check if apport is overriding it (Ubuntu's crash reporter)
sudo systemctl status apport

# Disable apport if you prefer systemd-coredump exclusively
sudo systemctl disable apport
```

**"Core dump too large" errors**:

```bash
# Check the limit
grep ProcessSizeMax /etc/systemd/coredump.conf

# Increase the limit
sudo nano /etc/systemd/coredump.conf
# ProcessSizeMax=4G
```

**No debug symbols in backtrace**:

```bash
# Check if the binary has debug info
file myapp
# "with debug_info" in the output means debug symbols are present

# Or
readelf --debug-dump=info myapp 2>&1 | head -5
```

`systemd-coredump` transforms crash analysis from a manual, error-prone process into a structured workflow. Combined with debug symbols and GDB, it provides the information needed to diagnose and fix crashes systematically.
