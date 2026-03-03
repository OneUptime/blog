# How to Restrict User SSH Access to Specific Commands on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Linux, System Administration

Description: A practical guide to restricting SSH users to specific commands on Ubuntu, including forced commands in authorized_keys, SSH chroot jails, and AllowUsers/AllowGroups configurations.

---

Giving someone SSH access to a server typically means giving them shell access - the ability to run arbitrary commands, explore the filesystem, and potentially interfere with other processes. There are scenarios where you want to allow SSH connectivity for a specific purpose without granting a full shell: automated deployments, restricted data transfers, monitoring agents, or limited operational access. Ubuntu's SSH server provides several mechanisms to restrict what SSH users can do.

## Method 1: Forced Commands in authorized_keys

The `command=` option in `~/.ssh/authorized_keys` restricts what command runs when a specific key is used for authentication. Regardless of what command the client requests, only the specified command executes.

### Basic Forced Command

```bash
# Edit authorized_keys for the user
sudo nano /home/deployuser/.ssh/authorized_keys

# Normal key entry:
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... user@workstation

# With forced command:
command="/opt/scripts/deploy.sh" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... user@workstation
```

When the user connects with this key, only `/opt/scripts/deploy.sh` runs. The client cannot get a shell or run any other command.

```bash
# Test the forced command
ssh deployuser@server
# Runs /opt/scripts/deploy.sh and then disconnects

# Even if you try to run something else:
ssh deployuser@server "cat /etc/passwd"
# Still only runs /opt/scripts/deploy.sh
```

### Using the Original Command in Scripts

When a forced command is set, the original command requested by the SSH client is stored in `$SSH_ORIGINAL_COMMAND`. Your forced command script can use this:

```bash
#!/bin/bash
# /opt/scripts/restricted-ssh.sh
# Allows only specific commands via SSH

# Log the attempted command
logger "SSH restricted access: user=$USER, command=${SSH_ORIGINAL_COMMAND:-interactive}"

case "$SSH_ORIGINAL_COMMAND" in
    "deploy production")
        /opt/scripts/deploy.sh production
        ;;
    "deploy staging")
        /opt/scripts/deploy.sh staging
        ;;
    "status")
        /opt/scripts/check-status.sh
        ;;
    "logs")
        tail -100 /var/log/myapp/app.log
        ;;
    "")
        # Interactive shell attempt - reject it
        echo "Interactive shell access not permitted."
        exit 1
        ;;
    *)
        echo "Command not allowed: $SSH_ORIGINAL_COMMAND"
        exit 1
        ;;
esac
```

```bash
# Set this as the forced command
command="/opt/scripts/restricted-ssh.sh" ssh-ed25519 AAAAC3NzaC1... deployuser@host
```

### Additional Key Options

```bash
# Restrict to specific source IPs
from="192.168.1.0/24",command="/opt/scripts/deploy.sh" ssh-ed25519 AAAA...

# Multiple restrictions
from="10.0.0.1",command="/opt/scripts/deploy.sh",no-agent-forwarding,no-port-forwarding,no-x11-forwarding ssh-ed25519 AAAA...

# Options that should typically accompany forced commands:
# no-pty               - Don't allocate a pseudo-terminal
# no-agent-forwarding  - Don't forward SSH agent
# no-port-forwarding   - Don't allow port forwarding
# no-x11-forwarding    - Don't forward X11

command="/opt/scripts/backup.sh",no-pty,no-agent-forwarding,no-port-forwarding,no-x11-forwarding ssh-ed25519 AAAA...
```

## Method 2: Restricting rsync/scp with Forced Commands

A common use case is allowing automated backups via rsync without granting a full shell:

```bash
# Restrict backup user to rsync only
# In /home/backupuser/.ssh/authorized_keys:
command="/usr/bin/rrsync /var/backups/",no-pty,no-agent-forwarding,no-port-forwarding ssh-ed25519 AAAA...

# rrsync is a restricted rsync wrapper
# Install it:
sudo apt install rsync
# rrsync is included with rsync at /usr/share/doc/rsync/scripts/rrsync
sudo cp /usr/share/doc/rsync/scripts/rrsync /usr/local/bin/rrsync
sudo chmod +x /usr/local/bin/rrsync
```

```bash
# For simple scp-only access, use the scponly shell
sudo apt install scponly

# Set user's shell to scponly
sudo usermod -s /usr/bin/scponly scpuser

# scponly allows scp and sftp operations but blocks shell commands
```

## Method 3: SSH Configuration Restrictions

The `sshd_config` file allows system-wide and per-user/group restrictions:

```bash
sudo nano /etc/ssh/sshd_config
```

### Restricting Specific Users to Specific Hosts

```text
# /etc/ssh/sshd_config

# Allow only specific users
AllowUsers alice bob@192.168.1.0/24 deployuser

# The bob@192.168.1.0/24 syntax restricts bob to connections from that network only
```

### Per-User Restrictions with Match Blocks

`Match` blocks apply settings only when the user, group, or source IP matches:

```text
# Restrict the 'readonly' user to sftp only
Match User readonly
    ForceCommand internal-sftp
    ChrootDirectory /srv/readonly/%u
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no

# Restrict all users in 'git' group to git operations only
Match Group gitusers
    ForceCommand /usr/bin/git-shell
    AllowTcpForwarding no
    X11Forwarding no
```

```bash
# Restart SSH to apply changes
sudo systemctl reload sshd

# Test the configuration before reloading
sudo sshd -t
```

## Method 4: SFTP-Only Access with chroot

For users who should only transfer files via SFTP:

```bash
# Create a chroot directory structure
sudo mkdir -p /srv/sftp-users
sudo chown root:root /srv/sftp-users
sudo chmod 755 /srv/sftp-users

# Create user-specific directories inside the chroot
sudo mkdir -p /srv/sftp-users/alice/uploads
sudo chown alice:alice /srv/sftp-users/alice/uploads
sudo chmod 700 /srv/sftp-users/alice/uploads
```

Configure sshd_config:

```text
# SFTP-only with chroot
Match User alice
    ForceCommand internal-sftp -l INFO
    ChrootDirectory /srv/sftp-users/%u
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY no
```

Important: The chroot directory must be owned by root, not the user, for sshd to accept it.

```bash
# Verify the config
sudo sshd -t

# Reload
sudo systemctl reload sshd

# Test as alice:
sftp alice@server
# Should land in the chroot, can only see /uploads
ls
# uploads

# Shell access should fail:
ssh alice@server
# This service allows sftp connections only.
```

## Method 5: git-shell for Git Access

For a server that hosts Git repositories, `git-shell` restricts users to only git operations:

```bash
# Check if git-shell is installed
which git-shell
cat /etc/shells | grep git-shell

# Add git-shell to /etc/shells if not present
echo $(which git-shell) | sudo tee -a /etc/shells

# Set a user's shell to git-shell
sudo usermod -s $(which git-shell) gituser

# Create the git-shell-commands directory (controls what's allowed)
sudo mkdir -p /home/gituser/git-shell-commands
sudo chown gituser:gituser /home/gituser/git-shell-commands

# Create a 'help' command (optional, shows what user can do)
cat > /home/gituser/git-shell-commands/help << 'EOF'
#!/bin/sh
echo "Welcome! Git access only."
echo "Available repositories:"
ls /srv/git/
EOF
chmod +x /home/gituser/git-shell-commands/help
```

```bash
# Test - git operations work:
git clone gituser@server:/srv/git/myrepo.git

# But shell access fails:
ssh gituser@server
# fatal: Interactive git shell is not enabled.
```

## Logging Restricted SSH Access

Monitor what restricted users are doing:

```bash
# SSH logs go to auth.log
tail -f /var/log/auth.log | grep sshd

# See commands run via SSH
sudo journalctl -u ssh -f | grep "Accepted\|command"

# For forced commands that log via logger:
journalctl | grep "SSH restricted access"

# View failed SSH attempts
grep "Failed\|Invalid\|Connection closed" /var/log/auth.log | tail -20
```

## Testing Restrictions

After configuring restrictions, test them from a client machine:

```bash
# Test that the forced command runs
ssh restricteduser@server
# Should execute the forced command only

# Test that interactive shell is blocked
ssh restricteduser@server "ls /etc"
# Should run forced command, not ls

# Test port forwarding is blocked
ssh -L 8080:localhost:80 restricteduser@server
# Should fail if no-port-forwarding is set

# Test SFTP works (if intended)
sftp restricteduser@server
# Should connect to chroot
```

Combining these methods gives you precise control over what SSH users can do. The most common production patterns are: forced commands for automated deployment keys, SFTP-with-chroot for file transfer accounts, and `git-shell` for Git hosting. Each approach allows the specific SSH capability needed while eliminating the ability to get a general-purpose shell session.
