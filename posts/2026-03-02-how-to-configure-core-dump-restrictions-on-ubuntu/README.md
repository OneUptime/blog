# How to Configure Core Dump Restrictions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Hardening, Kernel, Memory Protection

Description: Guide to restricting core dumps on Ubuntu to prevent sensitive data exposure from crashed processes, including configuration via sysctl, PAM limits, and systemd settings.

---

When a process crashes due to a signal like SIGSEGV or SIGABRT, the kernel can write the process's entire memory contents to disk as a core dump file. While core dumps are invaluable for debugging, they present a significant security risk in production: a core dump from a process handling sensitive data (private keys, passwords, session tokens, database contents) will contain that data verbatim in the dump file.

Core dump restrictions limit which processes can produce dumps, where dumps go, and whether privileged processes are allowed to dump at all.

## The Security Risks of Unrestricted Core Dumps

Consider what a core dump from these processes might contain:
- **sshd**: Private host keys, session data
- **openssl**: Private keys being used for TLS termination
- **mysqld / postgres**: Passwords, query data, table contents
- **web applications**: Session tokens, API keys, user data

Even if the dump is written to a protected directory, it represents a snapshot of sensitive memory that may persist on disk indefinitely.

## Checking Current Core Dump Configuration

```bash
# Check the current core dump size limit for the current shell
ulimit -c

# If output is 'unlimited', core dumps are enabled for this session

# Check the system-wide core pattern (where dumps go)
cat /proc/sys/kernel/core_pattern

# Check whether setuid process dumps are enabled
cat /proc/sys/fs/suid_dumpable

# View systemd's core dump configuration
cat /etc/systemd/coredump.conf
```

## Disabling Core Dumps System-Wide

### Using sysctl

The most comprehensive approach sets kernel parameters:

```bash
sudo nano /etc/sysctl.d/99-core-dump-restrictions.conf
```

```ini
# /etc/sysctl.d/99-core-dump-restrictions.conf

# Disable core dumps for setuid/setgid processes
# 0 = no core dumps for setuid processes (most secure)
# 1 = core dumps allowed but owned by root
# 2 = core dumps allowed, owned by the process owner (least secure)
fs.suid_dumpable = 0

# Redirect core dumps to /dev/null (discards them)
# This prevents dumps from being written anywhere
kernel.core_pattern = /dev/null

# Alternative: send dumps to a restricted directory
# kernel.core_pattern = /var/crash/core-%e-%p-%t
```

Apply immediately:

```bash
sudo sysctl --system

# Verify
cat /proc/sys/fs/suid_dumpable
cat /proc/sys/kernel/core_pattern
```

### Using PAM Limits

PAM limits apply to user sessions and control resource limits including core dump size:

```bash
sudo nano /etc/security/limits.conf
```

Add these lines:

```text
# Disable core dumps for all users
*   soft   core   0
*   hard   core   0

# Optionally, allow specific users or groups (for developers who need debugging)
@developers   soft   core   unlimited
@developers   hard   core   unlimited
```

For system services that do not go through PAM, set limits via `/etc/security/limits.d/`:

```bash
sudo tee /etc/security/limits.d/no-core-dumps.conf <<EOF
# Prevent core dumps from all non-developer users
*   soft   core   0
*   hard   core   0
EOF
```

Apply to the current session:

```bash
ulimit -c 0
ulimit -c  # Should output: 0
```

### Using systemd for Service Core Dumps

Services managed by systemd have their own limit settings. Disable core dumps for all services:

```bash
sudo nano /etc/systemd/coredump.conf
```

```ini
[Coredump]
# Control whether core dumps are stored or discarded
# 'none' discards all core dumps immediately
# 'external' stores them via core_pattern
# 'journal' stores them in the systemd journal
Storage=none

# Compress stored core dumps
Compress=yes

# Maximum size of a core dump to store (in bytes)
# Set to 0 to discard all
ProcessSizeMax=0

# Maximum disk space for all stored core dumps
ExternalSizeMax=0
```

Reload systemd:

```bash
sudo systemctl daemon-reload
```

## Restricting Core Dumps Per Service

For services that may handle sensitive data, add explicit restrictions to their unit files:

```bash
# Create an override for a specific service
sudo systemctl edit sshd
```

Add:

```ini
[Service]
# Disable core dumps for this service specifically
LimitCORE=0

# Additional memory hardening
MemoryDenyWriteExecute=true
```

```bash
# Apply to multiple sensitive services
for service in sshd nginx postgres redis; do
    sudo mkdir -p /etc/systemd/system/${service}.service.d/
    sudo tee /etc/systemd/system/${service}.service.d/no-core-dump.conf <<EOF
[Service]
LimitCORE=0
EOF
done

sudo systemctl daemon-reload
```

## Controlling Where Core Dumps Go

If you need core dumps for debugging but want to control their location and permissions:

```bash
# Create a restricted directory for core dumps
sudo mkdir -p /var/crash
sudo chmod 1777 /var/crash  # Sticky bit like /tmp

# Or restrict to root only
sudo mkdir -p /var/crash
sudo chmod 700 /var/crash
sudo chown root:root /var/crash

# Configure the kernel core pattern
# %e = executable name, %p = PID, %t = timestamp, %u = UID
sudo sysctl -w kernel.core_pattern=/var/crash/core-%e-%p-%u-%t
echo 'kernel.core_pattern = /var/crash/core-%e-%p-%u-%t' | \
  sudo tee /etc/sysctl.d/99-core-pattern.conf
```

For a more controlled setup, pipe core dumps through a handler script:

```bash
# Core dumps piped through a script for analysis and cleanup
sudo tee /usr/local/sbin/core-handler <<'SCRIPT'
#!/bin/bash
# Called by the kernel with the crashed process info
EXEC_NAME=$1
PID=$2
UID=$3
TIMESTAMP=$4
SIGNAL=$5

DUMP_DIR="/var/crash"
DUMP_FILE="${DUMP_DIR}/core-${EXEC_NAME}-${PID}-${TIMESTAMP}"

# Log the crash event
logger -t core-handler "Process crashed: ${EXEC_NAME} PID=${PID} UID=${UID} Signal=${SIGNAL}"

# Read and store the core dump from stdin
cat > "${DUMP_FILE}"

# Set restrictive permissions
chmod 400 "${DUMP_FILE}"
chown root:root "${DUMP_FILE}"

# Optional: send alert
# mail -s "Core dump: ${EXEC_NAME}" admin@company.com < /dev/null
SCRIPT

sudo chmod 750 /usr/local/sbin/core-handler

# Use pipe in kernel.core_pattern to invoke the handler
echo "kernel.core_pattern = |/usr/local/sbin/core-handler %e %p %u %t %s" | \
  sudo tee /etc/sysctl.d/99-core-pattern.conf

sudo sysctl --system
```

## Verifying Core Dump Restrictions

Test that core dumps are suppressed:

```bash
# First, check limits for your current session
ulimit -c

# Generate a test core dump by running a program that crashes
# (cat /dev/null kills itself with SIGSEGV in this test)
# This should NOT produce a core file if restrictions are correct

# Create a simple program to crash
cat > /tmp/crash-test.c <<'EOF'
#include <stdio.h>
#include <string.h>

int main() {
    char *ptr = NULL;
    // Intentional null pointer dereference
    *ptr = 'A';
    return 0;
}
EOF

gcc -o /tmp/crash-test /tmp/crash-test.c

# Run it and check if a core file is created
(cd /tmp && ./crash-test)
ls -la /tmp/core* 2>/dev/null || echo "No core dump created (restrictions working)"
ls -la core 2>/dev/null || echo "No core dump in current directory (restrictions working)"
```

## Clearing Existing Core Dumps

If core dumps already exist on the system, clean them up:

```bash
# Find existing core dumps
sudo find / -name 'core' -o -name 'core.*' 2>/dev/null | \
  grep -v proc | head -20

# Find in common locations
sudo find /var/crash /tmp /home -name 'core*' 2>/dev/null

# Remove them
sudo find /var/crash /tmp -name 'core*' -delete 2>/dev/null

# Check Ubuntu's crash reporter files
ls -la /var/crash/
sudo rm -f /var/crash/*.crash  # Ubuntu crash reporter files
```

## Preventing Specific Applications from Dumping

For applications that handle secrets, add program-level core dump disabling:

In shell scripts:

```bash
#!/bin/bash
# Disable core dumps for this script
ulimit -c 0

# Rest of the script
```

In C/C++ applications:

```c
#include <sys/resource.h>

// At the start of main():
struct rlimit core_limit = {0, 0};
setrlimit(RLIMIT_CORE, &core_limit);
```

In Python:

```python
import resource

# Disable core dumps for this process
resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
```

## Monitoring for Unexpected Core Dumps

Even with restrictions, monitor for crash events:

```bash
# Check systemd journal for crash events
sudo journalctl -k | grep -i 'core dump\|segfault\|killed process'

# Monitor the coredump journal
sudo coredumpctl list

# Watch for crash reporter activity
sudo journalctl -u apport -n 50  # Ubuntu's crash reporter service
```

Disable the Ubuntu crash reporter on servers where it is not needed:

```bash
sudo systemctl disable --now apport
sudo systemctl mask apport
```

Core dump restrictions are one of those controls that rarely show up in security checklists but matter significantly in practice. A single core dump from a crashed application can expose an attacker to secrets that would otherwise take months to obtain, making this a worthwhile hardening step for any Ubuntu system running sensitive workloads.
