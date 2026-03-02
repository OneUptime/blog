# How to Set Default Permissions with umask on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, File Permissions, System Administration, Linux

Description: Understand and configure umask on Ubuntu to control the default permissions assigned to newly created files and directories system-wide or per user.

---

Every time you create a file or directory on Linux, the kernel applies a default set of permissions. Those defaults are shaped by a value called `umask` - a bitmask that removes permissions from the maximum allowed. Getting umask right is important for security: too permissive and sensitive files end up world-readable; too restrictive and applications break because they can't read their own config files.

## How umask Works

The maximum permissions for a new file are `666` (read/write for user, group, and others - execute is never set by default on files). For directories, the maximum is `777`.

The umask is subtracted from those maximums. With a umask of `022`:

- Files: `666 - 022 = 644` (owner reads/writes, everyone else reads)
- Directories: `777 - 022 = 755` (owner reads/writes/executes, everyone else reads/executes)

This is the standard Ubuntu default and it works well for most desktop and server setups.

## Checking the Current umask

```bash
# Show umask in octal notation
umask

# Show umask in symbolic notation (more human-readable)
umask -S
```

Example output:
```
0022
u=rwx,g=rx,o=rx
```

The leading zero is just padding - it indicates octal. The actual mask is `022`.

## Common umask Values and When to Use Them

| umask | File perms | Dir perms | Use case |
|-------|-----------|-----------|----------|
| 022   | 644       | 755       | Standard server/desktop |
| 027   | 640       | 750       | Shared server, no world access |
| 077   | 600       | 700       | Highly sensitive (private keys, secrets) |
| 002   | 664       | 775       | Collaborative group environment |

### umask 027 for security-conscious servers

On a server where you don't want any world-readable files by default:

```bash
# Files get 640, directories get 750
umask 027
```

This means group members can read files, but other users on the system cannot. Useful on multi-user servers where services share a group but should not expose files to every user.

### umask 002 for group collaboration

When multiple users work on the same project and need to read/write each other's files:

```bash
# Files get 664, directories get 775
umask 002
```

Combined with setting the group sticky bit on shared directories, this lets team members create files that the whole group can modify.

## Setting umask Per User

### Via ~/.bashrc or ~/.profile

For a specific user, add the umask setting to their shell initialization file:

```bash
# Add to ~/.bashrc for interactive shells
echo 'umask 027' >> ~/.bashrc

# Or ~/.profile for login shells (affects non-interactive scripts too)
echo 'umask 027' >> ~/.profile

# Apply immediately without logging out
source ~/.bashrc
```

### Via /etc/profile

For a system-wide default that applies to all users at login:

```bash
sudo nano /etc/profile
```

Find the existing umask line (usually `umask 022`) and change it, or add one if it's absent:

```bash
# Set system-wide umask
umask 027
```

### Via /etc/profile.d/

A cleaner approach than editing `/etc/profile` directly is dropping a file into `/etc/profile.d/`:

```bash
sudo nano /etc/profile.d/umask.sh
```

```bash
#!/bin/bash
# Custom umask for all users
umask 027
```

Make it executable:

```bash
sudo chmod +x /etc/profile.d/umask.sh
```

This file gets sourced by `/etc/profile` on every login.

## Setting umask for Specific Services

System services don't read `/etc/profile`. They need umask configured through their service manager.

### systemd service units

```bash
sudo systemctl edit nginx
```

Add:

```ini
[Service]
UMask=0027
```

This sets the umask only for the nginx process, leaving the system default unchanged:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx
```

Verify it took effect by checking a file nginx creates (like a log file) with `ls -la`.

### PAM-based umask configuration

PAM (Pluggable Authentication Modules) can set umask at login for specific users or groups. Edit `/etc/pam.d/common-session`:

```bash
sudo nano /etc/pam.d/common-session
```

Add:

```
session optional pam_umask.so umask=027
```

The `pam_umask.so` module also reads per-user umask from `/etc/login.defs` and the `UMASK` field in that file:

```bash
grep UMASK /etc/login.defs
```

You can change the default there too:

```
UMASK 027
```

This affects `useradd` defaults and PAM login sessions.

## Verifying umask Behavior

After making changes, always verify they work as expected:

```bash
# Confirm current session umask
umask

# Create a test file and directory
touch /tmp/testfile
mkdir /tmp/testdir

# Check resulting permissions
ls -la /tmp/testfile /tmp/testdir

# With umask 027, you should see:
# -rw-r----- testfile  (640)
# drwxr-x--- testdir   (750)
```

## umask and sudo

When using `sudo`, the umask may be different from your user's umask. The `sudo` configuration can override it. To check what umask sudo uses:

```bash
sudo sh -c 'umask'
```

If you need sudo to preserve your umask, add this to `/etc/sudoers` via `visudo`:

```
Defaults umask = 0027
Defaults umask_override
```

The `umask_override` directive makes sudo use the specified umask regardless of the calling user's umask, which ensures consistent behavior in scripts that use sudo.

## Practical Recommendations

For most Ubuntu server deployments:

- Use `umask 022` as the system default (this is what Ubuntu ships with)
- Override to `027` for application service accounts where world-readable files are a concern
- Use `077` for directories holding credentials or private keys
- For shared development directories, configure `002` per-user or per-group through PAM

Understanding umask is foundational to managing permissions predictably. When you know that every new file and directory will land with a specific permission set, you avoid the manual `chmod` steps that often get forgotten and leave sensitive files exposed.
