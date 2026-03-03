# How to Manage User Home Directory Permissions on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, User Management, File Permissions, Security, System Administration

Description: Learn how to properly set and manage home directory permissions on Ubuntu, covering ownership, group access, and secure defaults for multi-user systems.

---

Home directory permissions are one of those things that gets set once during account creation and then rarely revisited - until a security audit or a misconfiguration causes a problem. On a single-user desktop, the defaults are fine. On a multi-user server, getting home directory permissions right can mean the difference between users accidentally exposing private files to each other or not.

## The Default Setup

When `useradd` creates a new user, it copies a skeleton directory from `/etc/skel` into a new home directory at `/home/username`. The default permissions on that directory are `755`, which means:

- Owner (the user): read, write, execute
- Group: read and execute
- Others: read and execute

The "execute" bit on a directory means the ability to enter it and access its contents (provided you know the filename). The "read" bit lets you list the directory contents. With `755`, any user on the system can `ls /home/otheruser` and see what files are there.

## Checking Current Home Directory Permissions

```bash
# See permissions for all home directories
ls -la /home/

# Check a specific user's home directory in detail
stat /home/username
```

## Restricting Home Directories to the Owner Only

On a server with multiple users, `700` or `750` is more appropriate than `755`.

### Changing a single user's home directory

```bash
# 700: only the owner can access anything
sudo chmod 700 /home/username

# 750: owner and group can access, others cannot
sudo chmod 750 /home/username
```

### Applying the restriction to all existing home directories

```bash
# Set all home directories to 700
sudo chmod 700 /home/*

# Verify the changes
ls -la /home/
```

Example output:
```text
drwx------ 5 alice alice 4096 Mar  2 10:15 alice
drwx------ 4 bob   bob   4096 Mar  1 09:30 bob
drwx------ 3 carol carol 4096 Feb 28 14:22 carol
```

## Setting the Default for New Users

The `useradd` command gets its default behavior from `/etc/login.defs` and the `DIR_MODE` setting:

```bash
sudo nano /etc/login.defs
```

Find and set:

```text
HOME_MODE 0700
```

On older systems or systems that don't have `HOME_MODE`, use `UMASK` combined with the standard permissions applied during account creation. After making this change, every new user created with `useradd` or `adduser` will get a `700` home directory.

You can verify the current default:

```bash
grep HOME_MODE /etc/login.defs
```

### Testing with adduser

```bash
# Create a test user
sudo adduser testuser

# Check the resulting permissions
ls -la /home/ | grep testuser
# Should show drwx------ with HOME_MODE 0700
```

## Managing Group Access to Home Directories

Sometimes you want a specific group to have read access to a user's home directory without giving everyone access. This is common for backup agents, monitoring tools, or shared development setups.

### Grant a secondary group access

```bash
# Create a backup group
sudo groupadd backupagents

# Change the home directory group
sudo chgrp backupagents /home/username

# Set permissions so the group can read (but not write)
sudo chmod 750 /home/username
```

Now users or processes in the `backupagents` group can read the contents of `/home/username`.

### Verify group membership

```bash
# Add the backup service user to the group
sudo usermod -aG backupagents backupd

# Check the group
getent group backupagents
```

## Fixing Ownership Problems

If a home directory has wrong ownership (for example, after manually moving files or restoring from backup), fix it with:

```bash
# Reset ownership of the entire home directory tree
sudo chown -R username:username /home/username

# Verify
ls -la /home/username
```

Be careful with the recursive flag on home directories - if there are symlinks pointing elsewhere, `chown -R` follows them. Use `--no-dereference` to avoid changing the targets:

```bash
sudo chown -R --no-dereference username:username /home/username
```

## Auditing Home Directory Permissions Across the System

A quick audit to find home directories that are too permissive:

```bash
# Find home directories world-readable or world-executable
for dir in /home/*/; do
    perms=$(stat -c '%a' "$dir")
    user=$(stat -c '%U' "$dir")
    if [ "${perms: -1}" != "0" ]; then
        echo "WARNING: $dir owned by $user has permissions $perms (world-accessible)"
    fi
done
```

Or more directly with find:

```bash
# Find home directories where others have any permission
sudo find /home -maxdepth 1 -type d -perm /o=rwx -ls
```

## Special Files Inside the Home Directory

Even if the home directory itself is `700`, certain files inside it may be more or less permissive than expected.

### SSH authorized_keys

The `~/.ssh/authorized_keys` file must not be writable by group or others, or SSH will refuse to use it:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Shell history files

History files like `~/.bash_history` are created with your umask-determined permissions. On a shared system, consider making them non-readable by others:

```bash
chmod 600 ~/.bash_history
```

### Configuration files with secrets

For any file containing API keys, database passwords, or other credentials:

```bash
chmod 600 ~/.some-app-config
```

## Resetting a Home Directory After Accidental Permission Change

If a user accidentally runs `chmod -R 777 ~` or similar, you can reset to sensible defaults:

```bash
# Reset home directory itself
sudo chmod 700 /home/username

# Reset SSH directory and files
sudo chmod 700 /home/username/.ssh
sudo chmod 600 /home/username/.ssh/authorized_keys
sudo chmod 644 /home/username/.ssh/config  # if it exists

# Reset ownership of everything
sudo chown -R username:username /home/username
```

For a more thorough reset of standard config files, you can compare against `/etc/skel`:

```bash
ls /etc/skel/
```

And restore any missing files from there.

## systemd-homed

On more recent Ubuntu versions, you may encounter `systemd-homed` as an alternative to traditional home directory management. It stores home directories as LUKS-encrypted images and manages permissions at a different layer. For most server deployments, the traditional approach above is still standard.

Keeping home directory permissions tight is a low-effort, high-impact security measure. A `chmod 700` on `/home/*` takes seconds and immediately prevents users from browsing each other's files - something that is easy to miss when setting up new accounts.
