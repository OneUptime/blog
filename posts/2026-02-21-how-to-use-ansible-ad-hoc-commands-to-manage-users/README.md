# How to Use Ansible Ad Hoc Commands to Manage Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, User Management, System Administration

Description: Learn how to create, modify, and remove user accounts across your servers using Ansible ad hoc commands with the user and group modules.

---

Managing user accounts across dozens or hundreds of servers is a nightmare if you are doing it manually. One forgotten server means one security hole. Ansible ad hoc commands let you create users, set passwords, manage SSH keys, assign groups, and remove accounts consistently across your entire fleet with a single command.

## Creating Users

The `user` module handles all aspects of user account management:

```bash
# Create a basic user
ansible all -m user -a "name=deploy" --become

# Create a user with a specific shell and home directory
ansible all -m user -a "name=deploy shell=/bin/bash create_home=yes" --become

# Create a user with a comment (GECOS field)
ansible all -m user -a "name=deploy comment='Deployment User' shell=/bin/bash" --become

# Create a user with a specific UID
ansible all -m user -a "name=appuser uid=1500 shell=/bin/bash" --become

# Create a system user (for running services, no home directory, no login shell)
ansible all -m user -a "name=myapp system=yes shell=/sbin/nologin create_home=no" --become
```

## Setting Passwords

Ansible requires passwords to be in hashed format. You cannot pass a plain text password directly.

```bash
# Generate a password hash first (run this locally)
python3 -c "from passlib.hash import sha512_crypt; print(sha512_crypt.using(rounds=5000).hash('MySecretPassword'))"

# Or use openssl
openssl passwd -6 -salt xyz MySecretPassword

# Then use the hash in the ad hoc command
ansible all -m user -a "name=deploy password='$6$xyz$hashedpasswordhere'" --become

# Set password and force the user to change it on first login
ansible all -m user -a "name=newuser password='$6$xyz$hashedpasswordhere' update_password=always" --become
ansible all -m shell -a "chage -d 0 newuser" --become
```

## Managing Groups

Before assigning users to groups, you may need to create those groups:

```bash
# Create a group
ansible all -m group -a "name=developers state=present" --become

# Create a group with a specific GID
ansible all -m group -a "name=developers gid=2000 state=present" --become

# Create a system group
ansible all -m group -a "name=appgroup system=yes state=present" --become

# Remove a group
ansible all -m group -a "name=oldgroup state=absent" --become
```

## Assigning Users to Groups

```bash
# Add a user to a single supplementary group
ansible all -m user -a "name=deploy groups=sudo append=yes" --become

# Add a user to multiple supplementary groups
ansible all -m user -a "name=deploy groups=sudo,docker,developers append=yes" --become

# Set the user's primary group
ansible all -m user -a "name=deploy group=developers" --become

# WARNING: without append=yes, this REPLACES all supplementary groups
# This removes the user from all groups except 'docker'
ansible all -m user -a "name=deploy groups=docker" --become

# SAFE: append=yes ADDS to existing groups
ansible all -m user -a "name=deploy groups=docker append=yes" --become
```

The `append=yes` parameter is critically important. Without it, the `groups` parameter replaces all supplementary group memberships instead of adding to them. This is a common mistake that can lock users out of sudo or other essential groups.

## Managing SSH Authorized Keys

The `authorized_key` module manages SSH public keys for user accounts:

```bash
# Add an SSH public key for a user
ansible all -m authorized_key -a "user=deploy key='ssh-rsa AAAAB3... user@host' state=present" --become

# Add a key from a local file
ansible all -m authorized_key -a "user=deploy key='{{ lookup(\"file\", \"/home/admin/.ssh/id_rsa.pub\") }}'" --become

# Add a key with specific options
ansible all -m authorized_key -a "user=deploy key='ssh-rsa AAAAB3... user@host' key_options='no-port-forwarding,from=\"10.0.0.0/8\"'" --become

# Remove an SSH key
ansible all -m authorized_key -a "user=deploy key='ssh-rsa AAAAB3... user@host' state=absent" --become

# Set exclusive mode (remove all other keys, keep only this one)
ansible all -m authorized_key -a "user=deploy key='ssh-rsa AAAAB3... user@host' exclusive=yes" --become
```

## Removing Users

```bash
# Remove a user but keep their home directory
ansible all -m user -a "name=olduser state=absent" --become

# Remove a user and their home directory
ansible all -m user -a "name=olduser state=absent remove=yes" --become

# Before removing, check what the user owns
ansible all -m shell -a "find / -user olduser -type f 2>/dev/null | head -20" --become
```

## Practical Scenarios

### Onboarding a New Team Member

When a new developer joins the team, set up their account across all relevant servers:

```bash
# Step 1: Create the user on all servers
ansible all -m user -a "name=jsmith comment='Jane Smith' shell=/bin/bash groups=developers append=yes" --become

# Step 2: Add their SSH key
ansible all -m authorized_key -a "user=jsmith key='ssh-ed25519 AAAAC3NzaC1... jsmith@laptop'" --become

# Step 3: Add to sudo group on specific servers they need admin access to
ansible 'webservers:appservers' -m user -a "name=jsmith groups=sudo append=yes" --become

# Step 4: Verify the account
ansible all -m shell -a "id jsmith"
```

### Offboarding a Departing Employee

When someone leaves, remove their access immediately:

```bash
# Step 1: Lock the account immediately (prevents login)
ansible all -m user -a "name=jsmith password_lock=yes" --become

# Step 2: Kill any active sessions
ansible all -m shell -a "pkill -u jsmith" --become --ignore-errors

# Step 3: Remove SSH keys
ansible all -m authorized_key -a "user=jsmith key='ssh-ed25519 AAAAC3NzaC1... jsmith@laptop' state=absent" --become

# Step 4: Remove the user and home directory
ansible all -m user -a "name=jsmith state=absent remove=yes" --become

# Step 5: Verify removal
ansible all -m shell -a "id jsmith 2>&1 || echo 'User removed'"
```

### Auditing User Accounts

Check the state of user accounts across your infrastructure:

```bash
# List all users with UID >= 1000 (regular users)
ansible all -m shell -a "awk -F: '\$3 >= 1000 && \$3 < 65534 {print \$1}' /etc/passwd"

# Check who has sudo access
ansible all -m shell -a "getent group sudo || getent group wheel" --become

# Find users with empty passwords
ansible all -m shell -a "awk -F: '(\$2 == \"\" || \$2 == \"!\") {print \$1}' /etc/shadow" --become

# Check SSH key presence for a specific user
ansible all -m shell -a "cat /home/deploy/.ssh/authorized_keys 2>/dev/null | wc -l"

# Find accounts with no password expiration
ansible all -m shell -a "awk -F: '\$5 == \"\" || \$5 == 99999 {print \$1}' /etc/shadow" --become
```

### Password Rotation

```bash
# Generate a new password hash
NEW_HASH=$(python3 -c "from passlib.hash import sha512_crypt; print(sha512_crypt.using(rounds=5000).hash('NewPassword2026'))")

# Update the password for a service account across all servers
ansible all -m user -a "name=serviceaccount password='$NEW_HASH' update_password=always" --become

# Force password change on next login
ansible all -m shell -a "chage -d 0 serviceaccount" --become
```

## Managing Home Directories

```bash
# Create a user with a custom home directory
ansible all -m user -a "name=deploy home=/opt/deploy shell=/bin/bash" --become

# Set up standard directory structure for a user
ansible all -m file -a "path=/home/deploy/.ssh state=directory mode=0700 owner=deploy group=deploy" --become

# Set correct permissions on authorized_keys
ansible all -m file -a "path=/home/deploy/.ssh/authorized_keys mode=0600 owner=deploy group=deploy" --become
```

## Setting Account Expiration

```bash
# Set account to expire on a specific date
ansible all -m user -a "name=contractor expires=1735689600" --become
# 1735689600 is epoch timestamp for 2025-01-01

# Remove account expiration
ansible all -m user -a "name=contractor expires=-1" --become

# Check account expiration dates
ansible all -m shell -a "chage -l contractor" --become
```

## Summary

Ansible ad hoc commands make user management consistent and auditable across your infrastructure. The `user` module handles account creation, modification, and removal. The `group` module manages groups. The `authorized_key` module handles SSH key distribution. Always remember to use `append=yes` when adding supplementary groups, hash passwords before passing them, and use `remove=yes` when deleting accounts you want fully cleaned up. These commands turn what would be hours of manual SSH work into seconds of automation.
