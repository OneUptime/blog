# How to Set File System Mount Options for Security on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Filesystem, Hardening, fstab

Description: Guide to configuring secure mount options in /etc/fstab on Ubuntu, covering noexec, nosuid, nodev, and separate partition strategies for defense in depth.

---

Linux filesystem mount options control what can happen on a mounted filesystem beyond simple read/write access. Options like `noexec`, `nosuid`, and `nodev` prevent entire classes of attacks - privilege escalation through setuid binaries, arbitrary code execution from writable directories, and device-based attacks. Configuring these correctly is one of the most effective and overlooked hardening steps for Ubuntu servers.

## Why Mount Options Matter for Security

When an attacker gains write access to a directory, several attack vectors open up:
- They can upload and execute a malicious binary (`noexec` prevents this)
- They can exploit setuid binaries copied there for privilege escalation (`nosuid` prevents this)
- They can create device files and use them to bypass access controls (`nodev` prevents this)

The principle is simple: restrict what can happen on any filesystem that does not absolutely need those capabilities. The root filesystem needs them. `/tmp` does not.

## The Three Key Security Mount Options

### noexec

Prevents execution of any binary on the filesystem. Even if a user writes an executable and sets the execute bit, the kernel refuses to run it.

```bash
# Mount /tmp with noexec
mount -o remount,noexec /tmp

# Test: this should fail
echo '#!/bin/bash\necho "executed"' > /tmp/test.sh
chmod +x /tmp/test.sh
/tmp/test.sh
# Output: bash: /tmp/test.sh: Permission denied
```

Note: `noexec` does not prevent interpreted scripts from being run indirectly:
```bash
bash /tmp/test.sh  # This still works
```

So `noexec` raises the bar but is not a complete control. Combined with `nosuid` and monitoring, it still provides meaningful protection.

### nosuid

Prevents setuid and setgid bits from taking effect on the filesystem. A binary with the setuid bit set normally runs as its owner (often root). With `nosuid`, the setuid bit is ignored and the binary runs as the calling user.

```bash
# Verify nosuid behavior
mount | grep /tmp | grep nosuid

# Copy a setuid binary to /tmp and confirm nosuid neutralizes it
cp /usr/bin/su /tmp/su
ls -la /tmp/su  # Note: setuid bit may or may not be preserved depending on copy
```

### nodev

Prevents device files (character and block special files) from being interpreted on the filesystem. Without this, an attacker could create a device file (like `/dev/sda`) in a world-writable directory and use it to access raw disk data.

```bash
# Create a block device in /tmp with nodev (should be blocked)
# mknod requires root, but the nodev flag prevents its interpretation even if created
sudo mknod /tmp/test-dev b 8 1  # This may succeed (creation) but the device cannot be used
```

## Current Mount Options Overview

```bash
# View all currently mounted filesystems and their options
mount | column -t

# Or view /proc/mounts for the canonical list
cat /proc/mounts

# Check options for a specific mount
mount | grep " /tmp "
```

## Configuring /etc/fstab

The `/etc/fstab` file defines permanent mount options. Always back it up before editing - an error here can prevent the system from booting:

```bash
sudo cp /etc/fstab /etc/fstab.bak
sudo nano /etc/fstab
```

### Securing /tmp

`/tmp` is world-writable and a common target for exploit staging:

```text
# /tmp on a tmpfs with security options
tmpfs  /tmp  tmpfs  defaults,noexec,nosuid,nodev,size=2G  0 0
```

If `/tmp` is already a separate partition (not tmpfs):

```text
UUID=xxxx  /tmp  ext4  defaults,noexec,nosuid,nodev  0 2
```

Apply the change without rebooting:

```bash
sudo mount -o remount /tmp
mount | grep " /tmp "
```

### Securing /var/tmp

`/var/tmp` persists across reboots (unlike `/tmp`). Many systems bind-mount it to `/tmp` for consistent handling:

```text
# Bind mount /var/tmp to /tmp to share the same restrictions
/tmp  /var/tmp  none  bind  0 0
```

Or mount it separately:

```text
UUID=xxxx  /var/tmp  ext4  defaults,noexec,nosuid,nodev  0 2
```

### Securing /home

User home directories need execution rights (users run their own scripts), but should block device files and setuid bits:

```text
UUID=xxxx  /home  ext4  defaults,nosuid,nodev  0 2
```

### Securing /dev/shm

Shared memory is mounted as a tmpfs and is often used in exploit techniques:

```text
# /dev/shm - shared memory filesystem
tmpfs  /dev/shm  tmpfs  defaults,noexec,nosuid,nodev,size=512M  0 0
```

```bash
# Apply immediately
sudo mount -o remount /dev/shm
mount | grep shm
```

### Separate /var Partition

On servers with sensitive application data, mounting `/var` with restrictive options prevents device file attacks:

```text
UUID=xxxx  /var  ext4  defaults,nosuid,nodev  0 2
```

Do NOT add `noexec` to `/var` - package management and some applications execute scripts from `/var`.

### /proc and /sys Hardening

The proc and sys filesystems expose kernel internals. Limit access:

```text
proc  /proc  proc  defaults,hidepid=2,gid=proc  0 0
```

The `hidepid=2` option hides process information from users who do not own those processes. The `gid=proc` option allows members of the `proc` group to see all processes (useful for monitoring tools):

```bash
# Create the proc group if it doesn't exist
sudo groupadd -g 1000 proc 2>/dev/null || true

# Add monitoring users to the proc group
sudo usermod -aG proc prometheus-user
```

Apply:

```bash
sudo mount -o remount /proc
```

## A Hardened fstab Example

```text
# /etc/fstab - hardened configuration
# <file system>  <mount point>  <type>  <options>              <dump>  <pass>

UUID=root-uuid  /          ext4    defaults,relatime               0  1
UUID=boot-uuid  /boot      ext4    defaults,nosuid,nodev,noexec    0  2
UUID=home-uuid  /home      ext4    defaults,nosuid,nodev           0  2
UUID=var-uuid   /var       ext4    defaults,nosuid,nodev           0  2
UUID=tmp-uuid   /tmp       ext4    defaults,nosuid,nodev,noexec    0  2

# Shared memory
tmpfs           /dev/shm   tmpfs   defaults,nosuid,nodev,noexec,size=512M  0  0

# Proc with hidden PIDs
proc            /proc      proc    defaults,hidepid=2,gid=proc             0  0
```

## Verifying Mount Options

After making changes, verify that the options are active:

```bash
# Check current options for security-sensitive paths
for mountpoint in /tmp /var/tmp /dev/shm /home /proc; do
    echo -n "$mountpoint: "
    mount | grep " $mountpoint " | awk '{print $6}'
done
```

Use `findmnt` for cleaner output:

```bash
# View all mounts with their options in a tree format
findmnt --real -o TARGET,OPTIONS

# Check a specific mount
findmnt /tmp
```

## Testing Mount Options

```bash
# Test noexec on /tmp
cat > /tmp/exec-test.sh <<'EOF'
#!/bin/bash
echo "This should not execute"
EOF
chmod +x /tmp/exec-test.sh
/tmp/exec-test.sh
# Expected: Permission denied

# Test nosuid - copy a setuid binary
cp /bin/bash /tmp/bash-copy
chmod +s /tmp/bash-copy
ls -la /tmp/bash-copy  # Shows setuid bit set
/tmp/bash-copy -p -c 'echo $EUID'
# With nosuid: EUID should be your user ID, not 0

# Clean up
rm -f /tmp/exec-test.sh /tmp/bash-copy
```

## CIS Benchmark Compliance

The CIS Ubuntu Linux Benchmark recommends these mount options as part of its Level 1 profile. The relevant controls are:

- 1.1.2: Ensure /tmp is configured
- 1.1.3: Ensure nodev option on /tmp
- 1.1.4: Ensure nosuid option on /tmp
- 1.1.5: Ensure noexec option on /tmp
- 1.1.8 through 1.1.20: Similar controls for /dev/shm and removable media

Running a CIS benchmark scanner against your system will flag missing options:

```bash
# OpenSCAP can check CIS compliance
sudo apt-get install -y libopenscap8 scap-security-guide
sudo oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_cis \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml 2>/dev/null | \
  grep -E 'FAIL.*mount|PASS.*mount'
```

Securing mount options takes about 15 minutes on a new system and prevents a meaningful class of local privilege escalation attacks that would otherwise require no user privileges to attempt.
