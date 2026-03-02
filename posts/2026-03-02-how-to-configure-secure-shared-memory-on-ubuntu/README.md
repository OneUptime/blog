# How to Configure Secure Shared Memory on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Hardening, Memory, System Administration

Description: Guide to securing the shared memory filesystem on Ubuntu by configuring /dev/shm with restrictive mount options to prevent privilege escalation and code execution attacks.

---

Shared memory is a mechanism that allows processes to communicate by sharing a region of memory without copying data between them. On Linux, this is typically exposed through `/dev/shm`, a tmpfs filesystem mounted at boot. While legitimate applications use shared memory for high-performance inter-process communication, it is also a well-known staging area for privilege escalation exploits and malicious code execution.

The fix is straightforward: mount `/dev/shm` with restrictive options that prevent code execution, setuid abuse, and device file creation.

## What is /dev/shm?

`/dev/shm` is a special filesystem (tmpfs) that provides POSIX shared memory to applications. It works like any directory - you can create files in it - but its contents reside in RAM rather than on disk. Any process can write an executable to `/dev/shm` and, without restrictions, execute it immediately.

Exploits commonly use this pattern:
1. Write a compiled exploit binary to `/dev/shm`
2. Set it executable
3. Execute it to escalate privileges or establish persistence

The `noexec` mount option directly blocks step 3.

## Checking the Current State

```bash
# View how /dev/shm is currently mounted
mount | grep shm

# Common default output:
# tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev)

# Note: on many Ubuntu installations, noexec is NOT set by default
# This is the gap we need to close

# View /proc/mounts for the authoritative listing
grep shm /proc/mounts

# Check current size and usage
df -h /dev/shm

# List files currently in shared memory
ls -la /dev/shm/
```

## Configuring /dev/shm in /etc/fstab

The recommended approach is to define the mount explicitly in `/etc/fstab` with all three security options:

```bash
# Back up fstab before editing
sudo cp /etc/fstab /etc/fstab.bak

sudo nano /etc/fstab
```

Add or modify the /dev/shm line:

```
# Shared memory with security hardening
# noexec: prevents execution of programs written to shared memory
# nosuid: prevents setuid/setgid bits from taking effect
# nodev: prevents creation of device files
tmpfs  /dev/shm  tmpfs  defaults,noexec,nosuid,nodev,size=512M  0 0
```

The `size=512M` limit is optional but recommended - it prevents applications from filling RAM through shared memory. Adjust based on your workload requirements.

Apply the change without rebooting:

```bash
sudo mount -o remount /dev/shm

# Verify the new options are active
mount | grep shm
# tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev,noexec,size=536870912)
```

## Testing the Configuration

After applying the options, verify they actually work:

```bash
# Test 1: noexec - writing and executing a binary should fail
cat > /dev/shm/test-exec.sh <<'EOF'
#!/bin/bash
echo "This should not execute from /dev/shm"
EOF
chmod +x /dev/shm/test-exec.sh
/dev/shm/test-exec.sh
# Expected: bash: /dev/shm/test-exec.sh: Permission denied

# Test 2: nosuid - setuid bit should be ignored
# Create a test binary (as root)
cp /bin/id /dev/shm/test-id
chmod +s /dev/shm/test-id
ls -la /dev/shm/test-id  # Note the setuid bit is set
/dev/shm/test-id
# Should run as current user, not root

# Test 3: nodev - device file creation should be blocked or unusable
# mknod may require root but nodev makes the device file non-functional
sudo mknod /dev/shm/test-device b 8 0 2>/dev/null && \
  echo "Device created (but nodev prevents it being used)" || \
  echo "Device creation blocked"

# Clean up test files
rm -f /dev/shm/test-exec.sh /dev/shm/test-id /dev/shm/test-device 2>/dev/null
```

## Impact on Applications Using Shared Memory

Most applications that use shared memory write data files, not executables. The `noexec` option only prevents the kernel from directly executing binaries from that filesystem - applications can still read and write data normally.

Applications known to use `/dev/shm` for legitimate purposes:
- **PostgreSQL**: Uses shared memory for buffers. PostgreSQL uses `POSIX shm` (`shm_open`), which works with `noexec` since the data is not executed.
- **Redis**: Can use shared memory for cluster communication
- **Chrome/Chromium**: Uses `/dev/shm` for renderer sandboxing
- **Java applications**: May use `/dev/shm` for IPC

### Testing Application Compatibility

If you are concerned about an application breaking:

```bash
# Watch for applications accessing /dev/shm during operation
sudo inotifywait -m -r /dev/shm -e create,modify,access 2>/dev/null &
WATCH_PID=$!

# Run your application
sudo systemctl restart your-application

# Wait 30 seconds and review what was accessed
kill $WATCH_PID 2>/dev/null

# Also check application logs for shared memory errors after applying noexec
sudo journalctl -u your-application -f &
```

### Chrome/Chromium Exception

Chrome uses `/dev/shm` in a way that conflicts with `noexec` on some versions. If you run a GUI desktop with Chrome, this setting may cause Chrome to fall back to in-process rendering or fail. For server-only systems without browsers, this is not a concern.

If you need Chrome to work, use this flag instead:

```bash
# Run Chrome with this flag to use a different shared memory path
chromium --disable-dev-shm-usage
```

## Setting a Secure Size Limit

Without a size limit, any process can fill `/dev/shm` up to 50% of RAM (the default), which can cause other processes to fail with out-of-memory errors. Setting an explicit limit prevents this:

```bash
# Check current size
df -h /dev/shm

# The current maximum
cat /proc/sys/kernel/shmmax
```

Choose a size based on your applications' requirements. A conservative limit for servers with no heavy IPC needs:

```
tmpfs  /dev/shm  tmpfs  defaults,noexec,nosuid,nodev,size=256M  0 0
```

For database servers or high-performance applications:

```
tmpfs  /dev/shm  tmpfs  defaults,noexec,nosuid,nodev,size=2G  0 0
```

## Monitoring /dev/shm for Suspicious Activity

Even with `noexec`, watch for suspicious files being written to `/dev/shm`:

```bash
# Set up an audit rule to watch for file creation in /dev/shm
sudo auditctl -w /dev/shm -p wa -k shm_access

# View audit events related to /dev/shm
sudo ausearch -k shm_access | tail -20

# Make the audit rule persistent
echo '-w /dev/shm -p wa -k shm_access' | \
  sudo tee -a /etc/audit/rules.d/hardening.rules

sudo systemctl restart auditd
```

A simple alerting script that checks for unusual files:

```bash
sudo tee /etc/cron.hourly/check-shm <<'SCRIPT'
#!/bin/bash
# Alert if executable files appear in /dev/shm
ALERT_FILE="/var/log/shm-alert.log"

for f in /dev/shm/*; do
    if [ -f "$f" ] && [ -x "$f" ]; then
        echo "$(date): Executable found in /dev/shm: $f ($(ls -la $f))" >> "$ALERT_FILE"
    fi
done
SCRIPT
sudo chmod 755 /etc/cron.hourly/check-shm
```

## Systemd Service Hardening for Shared Memory

If a specific service needs shared memory access, you can restrict its shared memory namespace rather than relying solely on mount options:

```bash
# Add these to a service's systemd unit file in [Service] section
# [Service]
# PrivateTmp=true          - Service gets its own /tmp and /var/tmp
# MemoryDenyWriteExecute=true  - Prevent mapping memory as both writable and executable

# Create an override for a service
sudo systemctl edit your-service
```

Add:

```ini
[Service]
PrivateTmp=true
MemoryDenyWriteExecute=true
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart your-service
```

## Verifying After Reboot

After a reboot, confirm the settings persisted:

```bash
# Reboot
sudo reboot

# After reconnecting
mount | grep shm
# Should show: tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev,noexec,size=...)

# Verify options are present
findmnt /dev/shm
```

Securing `/dev/shm` takes about five minutes and closes a commonly exploited path for local privilege escalation. It is one of the few hardening steps that has essentially no downside for server workloads that do not execute code from shared memory - which is the correct behavior by design.
