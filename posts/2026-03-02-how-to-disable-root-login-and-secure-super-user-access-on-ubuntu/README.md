# How to Disable Root Login and Secure Super User Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, SSH, sudo, User Management

Description: Learn how to disable direct root login over SSH and console on Ubuntu, configure sudo for controlled privilege escalation, and audit super user access.

---

The root account is the highest-privilege account on any Linux system. Leaving it available for direct login creates serious risks: every attacker knows the username in advance, brute-force attempts can target it directly, and any successful authentication immediately grants full system control. On Ubuntu, best practice is to disable root login entirely and use `sudo` for the rare cases when elevated privileges are needed.

Ubuntu's installation process creates a regular user with sudo access by default and disables the root account password. But on many systems - especially those built from cloud images, older installations, or systems where someone re-enabled root - you need to verify and enforce this explicitly.

## Understanding the Current State

Before making changes, check what you're working with:

```bash
# Check if root has a password set
sudo passwd -S root
```

The output shows the account status. Common states:
- `root P ...` - password is set (root can log in with password)
- `root L ...` - account is locked (no password login, but SSH keys may still work)
- `root NP ...` - no password set

```bash
# Check if root can log in via SSH
sudo grep -i "permitrootlogin" /etc/ssh/sshd_config

# Check if your user has sudo access
sudo -l
```

## Locking the Root Account Password

Locking the root password prevents password-based login while leaving the account functional for other purposes (system processes run as root, su from a sudo session still works):

```bash
# Lock root password
sudo passwd -l root

# Verify it's locked
sudo passwd -S root
# Should show: root L ...
```

A locked account shows `L` in the status. The `!` prefix in `/etc/shadow` is the actual indicator:

```bash
# Verify in shadow file
sudo grep "^root:" /etc/shadow
# Locked: root:!$6$...:...
# Unlocked: root:$6$...:...
```

## Disabling Root SSH Login

Even with the password locked, root could log in via SSH key if `PermitRootLogin` is not set to `no`. Always set this explicitly:

```bash
sudo nano /etc/ssh/sshd_config
```

Find the `PermitRootLogin` line and set it:

```
# Completely prevent root from logging in via SSH
PermitRootLogin no
```

If you don't see the line, add it. For maximum clarity, add it near the top of the file or in a dedicated hardening section.

After changing, validate the config and restart SSH:

```bash
# Validate SSH config syntax before restarting
sudo sshd -t

# If no errors, restart the SSH daemon
sudo systemctl restart sshd

# Verify the setting took effect
sudo sshd -T | grep permitrootlogin
```

**Critical**: Before restarting SSH, confirm you have another user with sudo access that can log in. Test it in a second terminal session before closing the current one.

## Creating a Dedicated Admin User

If your only user is root, create a regular user first:

```bash
# Create a new admin user
sudo adduser adminuser

# Add them to the sudo group
sudo usermod -aG sudo adminuser

# Verify group membership
groups adminuser
```

Set up SSH key authentication for this user:

```bash
# As the new user, create the .ssh directory
su - adminuser
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key to authorized_keys
# (copy your public key from your local machine)
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

Test SSH login as the new user in a separate terminal before proceeding.

## Configuring sudo for the Admin User

Ubuntu grants full sudo access to the `sudo` group by default. For production systems, consider more restrictive sudo rules:

```bash
# Always edit sudoers with visudo (validates syntax)
sudo visudo
```

The default configuration:
```
# Members of the sudo group can run any command
%sudo   ALL=(ALL:ALL) ALL
```

For more controlled access, you can specify exact commands:

```bash
# Edit sudoers with visudo
sudo visudo -f /etc/sudoers.d/adminuser
```

```
# Allow adminuser to run specific commands without password
adminuser ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
adminuser ALL=(ALL) NOPASSWD: /usr/bin/systemctl status *

# Allow running all commands but require password
adminuser ALL=(ALL:ALL) ALL
```

The `NOPASSWD:` flag is convenient but reduces security - use it only for specific, non-dangerous commands.

## Requiring Password for sudo

Ubuntu allows members of the sudo group to use sudo with their own password. This is appropriate. What you want to avoid is `NOPASSWD: ALL` in sudoers for interactive admin users. Verify no broad NOPASSWD rules exist:

```bash
# Check for NOPASSWD entries
sudo grep -r "NOPASSWD" /etc/sudoers /etc/sudoers.d/
```

If you see `NOPASSWD: ALL` for any interactive user (not service accounts), remove or restrict it.

## Setting sudo Session Timeout

By default, sudo caches credentials for 15 minutes. Reduce this in high-security environments:

```bash
sudo visudo
```

Add at the top of the Defaults section:

```
# Require password for every sudo invocation (no caching)
Defaults timestamp_timeout=0

# Or cache for 5 minutes instead of 15
# Defaults timestamp_timeout=5

# Require the user's own password (not root's)
Defaults rootpw=false

# Log sudo usage to syslog
Defaults log_host, log_year, logfile="/var/log/sudo.log"
```

## Disabling Interactive Root Shell via su

Restrict who can switch to root with `su`:

```bash
# Only members of the 'root' group can use 'su' to become root
# (Ubuntu default: only sudo group can)
sudo dpkg-reconfigure login
```

Or configure PAM directly:

```bash
sudo nano /etc/pam.d/su
```

Uncomment the line requiring `wheel` group membership (on Ubuntu, use `sudo` group):

```
# Require membership in sudo group to use su -
auth required pam_wheel.so
```

## Auditing Root and sudo Usage

Enable logging of all sudo commands if not already configured:

```bash
# Check current sudo logging
sudo grep -r "logfile\|log_input\|log_output" /etc/sudoers /etc/sudoers.d/
```

For comprehensive sudo auditing, add to `/etc/sudoers.d/logging`:

```bash
sudo visudo -f /etc/sudoers.d/logging
```

```
# Log all sudo commands with timestamps
Defaults log_year
Defaults logfile=/var/log/sudo.log
Defaults log_input
Defaults log_output
```

View sudo activity:

```bash
# Recent sudo commands from syslog
sudo grep sudo /var/log/auth.log | tail -30

# If you enabled a custom log file
sudo tail -50 /var/log/sudo.log
```

## Checking for Unauthorized Root Access Methods

Review other ways root could be accessed:

```bash
# Check for SSH authorized_keys in root's home
sudo ls -la /root/.ssh/

# Check if root has any authorized keys
sudo cat /root/.ssh/authorized_keys 2>/dev/null || echo "No authorized_keys file"

# Check /etc/passwd for any other UID 0 accounts
awk -F: '($3 == "0") {print}' /etc/passwd
```

Only one line should be returned for that last command - the root entry itself. Any other UID 0 account is a serious backdoor.

## Verifying the Configuration

After all changes, do a full verification:

```bash
# Root account locked
sudo passwd -S root | grep " L "

# SSH root login disabled
sudo sshd -T | grep "permitrootlogin no"

# No unauthorized UID 0 accounts
awk -F: '($3 == "0") {print}' /etc/passwd

# No root authorized SSH keys (or expected to be empty)
sudo ls -la /root/.ssh/ 2>/dev/null

# Your sudo user can escalate
sudo -l -U $(whoami)
```

With root login disabled, a privileged SSH key to root's account from an authorized_keys file blocked, and a properly configured sudo setup, you've eliminated the most common direct privilege escalation paths. Combine this with SSH key-only authentication for your admin users and you've significantly hardened user access on Ubuntu.
