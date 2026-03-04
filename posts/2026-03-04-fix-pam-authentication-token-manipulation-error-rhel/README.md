# How to Fix PAM 'Authentication Token Manipulation Error' on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PAM, Authentication, Password, Troubleshooting

Description: Fix the PAM 'Authentication token manipulation error' on RHEL that prevents users from changing their password or logging in.

---

The "Authentication token manipulation error" typically appears when trying to change a password with the `passwd` command. It indicates that PAM cannot update the password storage backend.

## Common Causes and Fixes

### Cause 1: /etc/shadow Has Wrong Permissions

```bash
# Check permissions on the shadow file
ls -la /etc/shadow
# Should be: ---------- 1 root root (mode 000) or -rw------- (mode 600)

# Fix permissions
sudo chmod 000 /etc/shadow
sudo chown root:root /etc/shadow

# Also check /etc/passwd
ls -la /etc/passwd
sudo chmod 644 /etc/passwd
sudo chown root:root /etc/passwd
```

### Cause 2: Filesystem Is Read-Only

```bash
# Check if the filesystem containing /etc is read-only
mount | grep " / "

# If it shows "ro", remount as read-write
sudo mount -o remount,rw /
```

### Cause 3: Disk Is Full

```bash
# Check available disk space
df -h /etc

# If the disk is full, free up space
sudo dnf clean all
sudo journalctl --vacuum-time=3d
```

### Cause 4: Corrupted /etc/shadow

```bash
# Verify the integrity of password files
sudo pwck
sudo grpck

# If shadow is corrupted, fix the entry
# Use vipw -s for safe editing of shadow
sudo vipw -s
```

### Cause 5: Password Complexity Policy

```bash
# Check PAM password quality settings
cat /etc/security/pwquality.conf

# The new password might not meet complexity requirements
# Check the minimum length, character classes, etc.
# minlen = 8
# dcredit = -1
# ucredit = -1
# lcredit = -1
# ocredit = -1

# Temporarily relax the policy if needed for testing
sudo vi /etc/security/pwquality.conf
```

### Cause 6: SELinux Denying Password Changes

```bash
# Check for SELinux denials
sudo ausearch -m avc -c passwd --start recent

# Restore SELinux contexts on password files
sudo restorecon -v /etc/shadow /etc/passwd /etc/gshadow /etc/group
```

### Cause 7: Account Is Locked or Expired

```bash
# Check the account status
sudo chage -l username

# If the account is expired, reset expiration
sudo chage -E -1 username

# If the account is locked, unlock it
sudo passwd -u username
```

## Testing the Fix

```bash
# Try changing the password
sudo passwd username

# Or as the user
passwd
```

Start by checking `/etc/shadow` permissions and disk space. These two causes account for the majority of "Authentication token manipulation error" occurrences.
