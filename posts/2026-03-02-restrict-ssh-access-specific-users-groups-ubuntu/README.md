# How to Restrict SSH Access to Specific Users or Groups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Access Control

Description: Learn how to restrict SSH access on Ubuntu to specific users or groups using sshd_config directives, providing precise control over who can connect remotely.

---

By default, any user account on an Ubuntu system can log in via SSH if SSH is running. For shared servers or multi-user systems, this is often too permissive. You might have local service accounts, application users, or legacy accounts that should never have SSH access. Restricting SSH to specific users or groups ensures only the people who need remote access can get it.

## The Key Directives

SSH provides four main directives in `/etc/ssh/sshd_config` for access control:

- **AllowUsers** - Whitelist specific usernames that can log in via SSH
- **AllowGroups** - Whitelist specific groups; only members of these groups can log in
- **DenyUsers** - Blacklist specific usernames that cannot log in via SSH
- **DenyGroups** - Blacklist specific groups; members cannot log in

When multiple directives are present, SSH evaluates them in this order: `DenyUsers`, `AllowUsers`, `DenyGroups`, `AllowGroups`. An explicit deny takes priority over an allow.

## Restricting to Specific Users

The simplest approach: only named users can SSH in.

```bash
# Edit the SSH daemon config
sudo nano /etc/ssh/sshd_config
```

Add the `AllowUsers` directive:

```text
# Only these users can connect via SSH
# Separate multiple usernames with spaces
AllowUsers alice bob carol deploy-user
```

This is a whitelist. Any user not on this list will get "Permission denied" regardless of their credentials.

To restrict to specific users from specific hosts (useful for tighter controls):

```text
# User can connect from any host
AllowUsers alice

# User bob can only connect from a specific IP
AllowUsers bob@192.168.1.100

# Pattern matching works too
AllowUsers carol@10.0.0.*
```

## Restricting to Specific Groups

Group-based control is easier to manage at scale. Instead of listing individual users, you define which groups have SSH access and manage membership separately.

First, create a group for SSH users:

```bash
# Create a dedicated group for SSH access
sudo groupadd sshusers

# Add users to this group
sudo usermod -aG sshusers alice
sudo usermod -aG sshusers bob

# Verify group membership
getent group sshusers
```

Then configure `sshd_config` to only allow this group:

```text
# Only members of the sshusers group can connect
AllowGroups sshusers
```

Adding a new user with SSH access is now just:

```bash
sudo usermod -aG sshusers newuser
```

Revoking access:

```bash
sudo gpasswd -d username sshusers
```

No `sshd_config` changes needed.

## Denying Specific Users or Groups

For blacklisting instead of whitelisting:

```text
# These users can never log in via SSH
DenyUsers www-data daemon postgres mysql

# Members of this group cannot SSH in
DenyGroups nossh legacy-accounts
```

This is useful when you have a small number of accounts that should be excluded but the majority of users should have access. Whitelisting (AllowUsers/AllowGroups) is generally more secure than blacklisting because new accounts are denied by default.

## Applying Changes

```bash
# Test the config file before restarting
sudo sshd -t

# If the test passes (no output = success), restart SSH
sudo systemctl restart ssh

# Check the service is running after restart
sudo systemctl status ssh
```

Always test your changes from a second terminal session before closing your current connection, in case you accidentally locked yourself out.

## Testing Access Restrictions

After applying changes, verify the restrictions work correctly:

```bash
# Test that an allowed user can connect
ssh alice@your-server.example.com

# Test that a denied user cannot connect
# The following should fail with "Permission denied"
ssh www-data@your-server.example.com

# Check auth.log to see what SSH logged for the denied attempt
sudo grep "sshd" /var/log/auth.log | tail -20
# Look for: "User www-data from X.X.X.X not allowed because not listed in AllowUsers"
```

## Using Match Blocks for Conditional Rules

Match blocks let you apply different rules to different users, groups, or connection sources:

```text
# Global settings apply to all connections
AllowGroups sshusers admins

# Match block for a specific user with stricter settings
Match User backup-agent
    # This user can only run rsync
    ForceCommand /usr/bin/rsync --server --daemon .
    AllowTcpForwarding no
    X11Forwarding no

# Match block for developers - allow from internal network only
Match Group developers Address 10.0.0.0/8
    AllowTcpForwarding yes
    X11Forwarding no

# Match block for admins - full access
Match Group admins
    AllowTcpForwarding yes
    PermitTTY yes
```

The `Match` directive creates a conditional block. Settings inside the block only apply when all specified conditions are met.

## Combining SSH Restrictions with sudo Access

It is good practice to separate SSH access from administrative (sudo) access. A user might need SSH access but not sudo, or vice versa:

```bash
# Create separate groups for SSH access and sudo access
sudo groupadd sshusers
sudo groupadd sudousers

# Give a user SSH but not sudo
sudo usermod -aG sshusers developer1

# Give a user both SSH and sudo
sudo usermod -aG sshusers admin1
sudo usermod -aG sudo admin1

# Configure /etc/sudoers for group-based sudo (edit with visudo)
sudo visudo
# Add: %sudousers ALL=(ALL:ALL) ALL
```

## Restricting Root SSH Login

Root login should always be disabled on systems accessible from the internet:

```text
# In /etc/ssh/sshd_config
PermitRootLogin no
```

If you need to perform admin tasks, SSH in as a regular user and then use `sudo` to elevate privileges.

## Viewing Current SSH Restrictions

To audit who currently has SSH access:

```bash
# View current AllowUsers/AllowGroups configuration
sudo grep -E "^AllowUsers|^AllowGroups|^DenyUsers|^DenyGroups|^PermitRootLogin" /etc/ssh/sshd_config

# View all members of the sshusers group
getent group sshusers

# View all user accounts on the system
getent passwd | awk -F: '$3 >= 1000 {print $1}' | sort

# Cross-reference to see which users are NOT in sshusers
comm -23 \
    <(getent passwd | awk -F: '$3 >= 1000 {print $1}' | sort) \
    <(getent group sshusers | cut -d: -f4 | tr ',' '\n' | sort)
```

## Summary

Restricting SSH access to specific users or groups is straightforward with `AllowUsers` and `AllowGroups` in `/etc/ssh/sshd_config`. Group-based control is easier to manage at scale - create an `sshusers` group, add the directive to sshd_config, then manage membership with `usermod`. Always test config changes with `sshd -t` before restarting the service, and verify restrictions work from a second terminal. Combine SSH access restrictions with `PermitRootLogin no` and appropriate sudo configurations for a layered access control approach.
