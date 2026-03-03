# How to Troubleshoot 'NT_STATUS_ACCESS_DENIED' in Samba on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Troubleshooting, Networking, SMB

Description: Diagnose and fix NT_STATUS_ACCESS_DENIED errors in Samba on Ubuntu by working through credentials, filesystem permissions, SELinux/AppArmor, and share configuration issues.

---

`NT_STATUS_ACCESS_DENIED` is one of the most common and frustrating Samba errors. It means the server rejected the client's request, but the cause can be any of several layers: wrong credentials, bad filesystem permissions, Samba share configuration, or security frameworks like AppArmor. Working through each layer systematically gets you to the root cause quickly.

## Understanding What the Error Means

When a client connects to a Samba share and gets `NT_STATUS_ACCESS_DENIED`, it means the SMB layer accepted the authentication (the user logged in successfully), but the subsequent access to the file or directory was denied. This is different from `NT_STATUS_LOGON_FAILURE`, which means authentication itself failed.

The distinction matters: if you're getting `NT_STATUS_ACCESS_DENIED` even after successfully authenticating, the problem is almost always one of:

1. Linux filesystem permissions on the shared directory
2. Samba share configuration (`valid users`, `read only`, `write list`)
3. AppArmor restrictions on the smbd process
4. File ownership mismatches

## Step 1: Verify Authentication Works

First, confirm the user can authenticate at all:

```bash
# Test Samba authentication from the server itself
smbclient //localhost/sharename -U username

# If this succeeds (shows a prompt), authentication is fine
# If you get NT_STATUS_LOGON_FAILURE, the password is wrong
```

Check that the Samba user exists and has a password:

```bash
# List all Samba users
sudo pdbedit -L -v

# Reset the Samba password if needed
sudo smbpasswd -a username

# Re-enable a disabled account
sudo smbpasswd -e username
```

## Step 2: Check Linux Filesystem Permissions

This is the most common cause of `NT_STATUS_ACCESS_DENIED`. Samba runs as the `smbd` daemon, but file access happens as the authenticated Linux user. The Linux kernel enforces normal Unix permissions.

```bash
# Check permissions on the share path
ls -la /srv/samba/sharename

# Check the full path including parent directories
namei -l /srv/samba/sharename
```

The `namei -l` output shows permissions on every directory in the path. If any component is not readable/executable by the Samba user, access fails.

Fix permission issues:

```bash
# Make the share directory owned by the correct user
sudo chown -R username:groupname /srv/samba/sharename

# Or use a shared group approach
sudo groupadd smbshare
sudo usermod -aG smbshare username
sudo chgrp -R smbshare /srv/samba/sharename

# Set appropriate permissions (group read/write)
sudo chmod -R 770 /srv/samba/sharename

# If Samba daemon needs access via the nobody user for guest
sudo chmod 755 /srv/samba/sharename
```

## Step 3: Review the Samba Share Configuration

```bash
# View the current Samba configuration
sudo testparm -s

# Or look at the specific share
sudo testparm -s /etc/samba/smb.conf
```

Check these specific settings in your share definition:

```ini
[myshare]
   path = /srv/samba/myshare

   # If valid users is set, only listed users/groups can connect
   valid users = username @groupname

   # If read only = yes, write attempts get ACCESS_DENIED
   read only = no

   # write list overrides read only for listed users
   write list = username @groupname

   # If browseable = no, the share is hidden but still accessible
   browseable = yes
```

Common configuration mistakes:
- `valid users` is set but the connecting user is not listed
- `read only = yes` and the user is trying to write
- `write list` is set but the user is not included

Fix by editing `/etc/samba/smb.conf`:

```bash
sudo nano /etc/samba/smb.conf
```

After changes, reload Samba:

```bash
# Reload configuration without dropping connections
sudo smbcontrol smbd reload-config

# Or restart the service
sudo systemctl restart smbd
```

## Step 4: Check AppArmor Restrictions

Ubuntu uses AppArmor to confine the Samba daemon. If the share path is outside AppArmor's allowed paths, Samba gets `EACCES` internally, which translates to `NT_STATUS_ACCESS_DENIED` for the client.

```bash
# Check AppArmor status
sudo aa-status

# Look for Samba profiles
sudo aa-status | grep samba

# Check AppArmor audit log for denials
sudo dmesg | grep apparmor | grep DENIED | grep smbd

# Also check the audit log
sudo grep "DENIED" /var/log/syslog | grep smbd
```

If AppArmor is blocking access:

```bash
# View the Samba AppArmor profile
cat /etc/apparmor.d/usr.sbin.smbd
```

Add the share path to the profile:

```bash
sudo nano /etc/apparmor.d/local/usr.sbin.smbd
```

Add lines like:

```text
# Allow Samba to access custom share paths
/srv/samba/** rwk,
/data/shares/** rwk,
```

Reload the AppArmor profile:

```bash
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.smbd
```

Alternatively, put AppArmor into complain mode for smbd temporarily to confirm it is the cause:

```bash
# Switch to complain mode (logs but does not block)
sudo aa-complain /usr/sbin/smbd

# Test the share access
# Then switch back to enforce mode
sudo aa-enforce /usr/sbin/smbd
```

## Step 5: Check for ACL Issues

If the filesystem uses POSIX ACLs, the ACLs might be more restrictive than the standard permissions suggest:

```bash
# Check ACLs on the directory
getfacl /srv/samba/myshare

# Remove restrictive ACLs if needed
setfacl -b /srv/samba/myshare

# Add a user to the ACL explicitly
setfacl -m u:username:rwx /srv/samba/myshare
setfacl -d -m u:username:rwx /srv/samba/myshare  # default ACL for new files
```

## Step 6: Enable Detailed Samba Logging

If the above steps do not identify the cause, increase Samba's log verbosity:

```bash
# Temporarily increase log level
sudo smbcontrol smbd debuglevel 5

# Watch the log in real time
sudo tail -f /var/log/samba/log.smbd

# Also watch per-client logs (named after client IP/hostname)
sudo tail -f /var/log/samba/log.192.168.1.100

# Reset log level after debugging
sudo smbcontrol smbd debuglevel 1
```

The detailed logs show exactly which operation failed and why. Look for lines containing `DENIED` or `permission` near the time of the failed access attempt.

## Step 7: Test with smbclient from the Server

```bash
# Connect from localhost as the affected user
smbclient //127.0.0.1/myshare -U username

# Try to list files
smb: \> ls

# Try to write a file
smb: \> put /etc/hostname testfile.txt
```

If `ls` works but `put` fails, the issue is write permissions specifically. If `ls` also fails, the problem is read permissions or the share configuration itself.

## Quick Reference Checklist

- Samba user exists: `sudo pdbedit -L`
- Password is set and correct: `sudo smbclient //localhost/share -U user`
- Filesystem permissions allow the user: `namei -l /path/to/share`
- `valid users` in smb.conf includes the user
- `read only = no` for write access
- AppArmor not blocking: `sudo dmesg | grep apparmor | grep smbd`
- ACLs not restricting access: `getfacl /path/to/share`

Working through this list in order covers the vast majority of `NT_STATUS_ACCESS_DENIED` situations.
