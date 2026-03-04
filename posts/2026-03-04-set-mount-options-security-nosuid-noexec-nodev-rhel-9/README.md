# How to Set Mount Options for Security (nosuid, noexec, nodev) on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Security, fstab, Mount Options, Hardening, Linux

Description: Learn how to use nosuid, noexec, and nodev mount options on RHEL to harden file system security and comply with security benchmarks.

---

Mount options control how file systems behave after they are attached to the directory tree. Three options in particular -- nosuid, noexec, and nodev -- are essential for security hardening on RHEL. They restrict what can happen on a mounted file system, reducing the attack surface for privilege escalation and malicious code execution.

## Understanding the Three Key Security Mount Options

### nosuid

The nosuid option prevents set-user-ID (SUID) and set-group-ID (SGID) bits from being honored on the mounted file system. SUID programs run with the permissions of the file owner rather than the user executing them. If an attacker places a SUID root binary on a partition without nosuid, they could escalate to root privileges.

### noexec

The noexec option prevents the execution of any binaries on the mounted file system. This stops attackers from running malicious executables that they may have uploaded or written to that partition.

### nodev

The nodev option prevents the interpretation of block or character special device files on the mounted file system. Without this option, an attacker could create device files that provide raw access to hardware.

## Which Partitions Should Use These Options

Not every partition should use all three options. Here is a guide:

| Partition | nosuid | noexec | nodev | Notes |
|-----------|--------|--------|-------|-------|
| / | No | No | No | System binaries need SUID and exec |
| /boot | Yes | Yes | Yes | Only contains kernel and bootloader files |
| /home | Yes | Yes | Yes | Users should not run binaries from home |
| /tmp | Yes | Yes | Yes | Temporary files should never be executable |
| /var | Yes | No | Yes | Some services run scripts from /var |
| /var/tmp | Yes | Yes | Yes | Same as /tmp |
| /var/log | Yes | Yes | Yes | Log files are never executable |
| /dev/shm | Yes | Yes | Yes | Shared memory should not have executables |

## Configuring Mount Options in fstab

Edit `/etc/fstab` and add the security options:

```bash
sudo vi /etc/fstab
```

Example entries:

```text
UUID=...  /tmp      xfs  defaults,nosuid,noexec,nodev  0 0
UUID=...  /home     xfs  defaults,nosuid,noexec,nodev  0 0
UUID=...  /var/log  xfs  defaults,nosuid,noexec,nodev  0 0
UUID=...  /boot     xfs  defaults,nosuid,noexec,nodev  0 0
```

## Securing /dev/shm

The `/dev/shm` shared memory partition is often overlooked. Add restrictions:

```text
tmpfs  /dev/shm  tmpfs  defaults,nosuid,noexec,nodev  0 0
```

Apply immediately without rebooting:

```bash
sudo mount -o remount,nosuid,noexec,nodev /dev/shm
```

## Securing /tmp

If `/tmp` is a separate partition:

```text
UUID=...  /tmp  xfs  defaults,nosuid,noexec,nodev  0 0
```

If `/tmp` is using tmpfs:

```text
tmpfs  /tmp  tmpfs  defaults,nosuid,noexec,nodev,size=2G  0 0
```

Apply immediately:

```bash
sudo mount -o remount,nosuid,noexec,nodev /tmp
```

## Applying Changes Without Rebooting

For each partition you changed, remount it:

```bash
sudo mount -o remount /tmp
sudo mount -o remount /home
sudo mount -o remount /dev/shm
```

Verify the options took effect:

```bash
mount | grep /tmp
```

Expected output includes the security options:

```text
/dev/sda3 on /tmp type xfs (rw,nosuid,nodev,noexec,relatime)
```

## Verifying Mount Options

Use `findmnt` for a clean view:

```bash
findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS /tmp
```

To check all mount points at once:

```bash
findmnt -o TARGET,OPTIONS
```

## Handling noexec on /var

The `/var` partition needs careful consideration. Some services execute scripts from `/var`:

- Package managers may run scripts in `/var/cache`
- Web servers may execute CGI scripts in `/var/www`
- Database engines may use `/var/lib`

If you need noexec on `/var`, consider putting these directories on separate partitions without noexec.

## Compliance and Security Benchmarks

These mount options are required by several security standards:

- **CIS Benchmark for RHEL** requires nosuid, noexec, and nodev on /tmp, /var/tmp, /home, and /dev/shm
- **DISA STIG** has similar requirements
- **PCI DSS** expects file system hardening as part of system security

## Testing the Restrictions

Verify noexec works:

```bash
cp /bin/ls /tmp/ls_test
chmod +x /tmp/ls_test
/tmp/ls_test
```

With noexec, you should see:

```text
-bash: /tmp/ls_test: Permission denied
```

Verify nosuid works:

```bash
# Create a SUID test (as root)
cp /bin/cat /tmp/cat_test
chmod u+s /tmp/cat_test
ls -l /tmp/cat_test
```

With nosuid, the SUID bit is ignored when executing.

## Troubleshooting

If an application breaks after adding noexec:

1. Check what the application is trying to execute and from where
2. Consider moving the application's executables to a partition without noexec
3. Use `ausearch -m avc` to check for SELinux denials that may be related
4. Review application logs for permission errors

## Summary

The nosuid, noexec, and nodev mount options are fundamental security hardening measures on RHEL. Apply them to all partitions that do not need the capabilities they restrict, especially /tmp, /home, /var/tmp, /dev/shm, and /boot. Always test changes with `mount -o remount` before rebooting, and verify compliance with `findmnt`. These simple changes significantly reduce the attack surface of your system.
