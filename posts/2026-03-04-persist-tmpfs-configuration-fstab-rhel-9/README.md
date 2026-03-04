# How to Persist tmpfs Configuration Across Reboots in /etc/fstab on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, tmpfs, fstab, Linux

Description: Learn how to configure persistent tmpfs mounts in /etc/fstab on RHEL so your RAM-based filesystems are automatically created at boot.

---

tmpfs mounts created with the `mount` command disappear on reboot. For production systems that need tmpfs mounts available at every boot - application caches, build directories, session storage - you need to configure them in `/etc/fstab` or as systemd mount units.

## Basic fstab Entry for tmpfs

The format is the same as any other fstab entry:

```bash
<device>  <mountpoint>  <type>  <options>  <dump>  <pass>
```

For tmpfs:

```bash
tmpfs  /mnt/ramdisk  tmpfs  defaults,size=2G  0 0
```

- Device is always `tmpfs`
- Type is always `tmpfs`
- Dump and pass are both `0` (no backup, no fsck needed)

## Step-by-Step Setup

### Step 1: Create the Mount Point

```bash
# Create the directory
mkdir -p /mnt/ramdisk
```

### Step 2: Add the fstab Entry

```bash
# Add tmpfs entry to fstab
echo "tmpfs  /mnt/ramdisk  tmpfs  defaults,size=2G,mode=1777  0 0" >> /etc/fstab
```

### Step 3: Mount It

```bash
# Mount from fstab
mount /mnt/ramdisk
```

### Step 4: Verify

```bash
# Confirm the mount
df -h /mnt/ramdisk
mount | grep ramdisk
```

## Common fstab Configurations

### Temporary Build Directory

```bash
tmpfs  /tmp/build  tmpfs  defaults,size=8G,mode=1777,nosuid,nodev  0 0
```

### Application Cache

```bash
tmpfs  /var/cache/myapp  tmpfs  defaults,size=1G,mode=0750,uid=myapp,gid=myapp,noexec,nosuid,nodev  0 0
```

### Web Session Storage

```bash
tmpfs  /var/lib/php/sessions  tmpfs  defaults,size=512M,mode=0770,uid=apache,gid=apache,noexec,nosuid,nodev  0 0
```

### Shared Memory (Custom Size)

```bash
tmpfs  /dev/shm  tmpfs  defaults,size=8G,noexec,nosuid,nodev  0 0
```

### Database Temp Directory

```bash
tmpfs  /var/lib/mysql/tmp  tmpfs  defaults,size=2G,mode=0750,uid=mysql,gid=mysql,noexec,nosuid,nodev  0 0
```

## Using systemd Mount Units

For more control, use systemd mount units instead of or in addition to fstab. systemd actually converts fstab entries to mount units anyway, but explicit units give you dependency management.

### Create the Mount Unit

```bash
cat > /etc/systemd/system/mnt-ramdisk.mount << 'EOF'
[Unit]
Description=tmpfs RAM disk for application cache
After=local-fs.target

[Mount]
What=tmpfs
Where=/mnt/ramdisk
Type=tmpfs
Options=size=2G,mode=1777,nosuid,nodev

[Install]
WantedBy=local-fs.target
EOF
```

### Enable and Start

```bash
systemctl daemon-reload
systemctl enable --now mnt-ramdisk.mount
```

### Verify

```bash
systemctl status mnt-ramdisk.mount
df -h /mnt/ramdisk
```

## Dependency Management

If an application needs the tmpfs mount to be available before starting:

### In fstab with x-systemd Options

```bash
tmpfs  /var/cache/myapp  tmpfs  defaults,size=1G,x-systemd.before=myapp.service  0 0
```

### In the Application's Service File

```bash
# Edit the application service
systemctl edit myapp.service
```

Add:

```bash
[Unit]
RequiresMountsFor=/var/cache/myapp
```

This ensures the tmpfs mount is up before the application starts.

## Initializing Data on tmpfs at Boot

Since tmpfs is empty after every boot, you might need to populate it. Create a systemd service that runs after the tmpfs is mounted:

```bash
cat > /etc/systemd/system/init-ramdisk.service << 'EOF'
[Unit]
Description=Initialize RAM disk with required structure
After=mnt-ramdisk.mount
Requires=mnt-ramdisk.mount

[Service]
Type=oneshot
ExecStart=/usr/local/bin/init-ramdisk.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
```

The initialization script:

```bash
#!/bin/bash
# /usr/local/bin/init-ramdisk.sh
# Create directory structure on tmpfs after boot

mkdir -p /mnt/ramdisk/{cache,tmp,sessions}
chmod 755 /mnt/ramdisk/cache
chmod 1777 /mnt/ramdisk/tmp
chmod 770 /mnt/ramdisk/sessions
chown apache:apache /mnt/ramdisk/sessions
```

Enable it:

```bash
chmod +x /usr/local/bin/init-ramdisk.sh
systemctl enable init-ramdisk.service
```

## Testing fstab Changes Safely

Always test before rebooting:

```bash
# Test mounting all fstab entries
mount -a

# Check for errors
echo $?

# Verify all tmpfs mounts
df -h -t tmpfs
```

If `mount -a` fails, fix the fstab entry before rebooting. A broken fstab can prevent the system from booting normally.

## Verifying After Reboot

After the next reboot, verify:

```bash
# Check all tmpfs mounts came up
df -h -t tmpfs

# Check specific mounts
mount | grep tmpfs

# Verify permissions
ls -la /mnt/ramdisk
```

## Removing a Persistent tmpfs Mount

```bash
# Unmount
umount /mnt/ramdisk

# Remove from fstab
sed -i '\|/mnt/ramdisk|d' /etc/fstab

# Or if using systemd mount
systemctl disable --now mnt-ramdisk.mount
rm /etc/systemd/system/mnt-ramdisk.mount
systemctl daemon-reload
```

## Summary

Persisting tmpfs mounts on RHEL is done through `/etc/fstab` entries or systemd mount units. Always specify size limits and security options (noexec, nosuid, nodev). Use systemd dependencies to ensure applications wait for tmpfs mounts. Create initialization services to populate directory structures on boot. Test with `mount -a` before rebooting to catch configuration errors.
