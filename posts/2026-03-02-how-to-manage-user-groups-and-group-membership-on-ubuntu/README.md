# How to Manage User Groups and Group Membership on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, User Management, System Administration

Description: A comprehensive guide to managing user groups and group membership on Ubuntu, covering group creation, modification, membership changes, and practical use cases.

---

Groups are the primary mechanism for controlling access to shared resources on Linux. When multiple users need access to the same files, devices, or services, creating a group is cleaner than setting permissions for each user individually. Ubuntu comes with many predefined system groups, and understanding both how to use them and how to create your own is essential for proper system administration.

## Understanding Groups in Linux

Every user has a primary group (set at account creation) and can belong to additional supplementary groups. When you create a file, it gets assigned your primary group. Supplementary groups determine what other group-owned resources you can access.

```bash
# See your current user's groups
id
# uid=1000(alice) gid=1000(alice) groups=1000(alice),4(adm),24(cdrom),27(sudo),1001(developers)

# Just the group names
groups
# alice adm cdrom sudo developers

# Check groups for another user
id bob
groups bob
```

The number in parentheses after each group name is the GID (Group ID).

## Common Ubuntu System Groups

Ubuntu includes predefined groups that grant specific privileges:

```bash
# View all groups on the system
cat /etc/group

# Important groups to know:
# sudo          - Members can use sudo (admin access)
# adm           - Can read system log files
# docker        - Can manage Docker without sudo
# www-data      - Web server (Apache/nginx) group
# ssl-cert      - Access to SSL certificate private keys
# dialout       - Serial port access
# plugdev       - Removable media access
# kvm           - KVM hypervisor access
# libvirt       - libvirt/QEMU virtual machine management
# lxd           - LXD container management
# netdev        - Network configuration

# Add alice to the docker group
sudo usermod -aG docker alice

# Add alice to multiple groups at once
sudo usermod -aG docker,kvm,libvirt alice
```

## Creating Groups

```bash
# Create a new group
sudo groupadd developers

# Create a group with a specific GID
sudo groupadd -g 2000 developers

# Create a system group (GID < 1000)
sudo groupadd --system myapp

# Verify group was created
grep developers /etc/group
# developers:x:1001:
# (name:password:gid:members)
```

## Adding Users to Groups

```bash
# Add a user to a supplementary group (the -a flag is critical - without it, replaces all groups)
sudo usermod -aG developers alice
sudo usermod -aG developers,qa,devops bob

# Verify membership
id alice
groups alice

# Add a user to a group using gpasswd
sudo gpasswd -a alice developers

# The change takes effect at next login
# To apply immediately in the current session:
newgrp developers  # Opens a new shell with the group active
```

## Removing Users from Groups

```bash
# Remove alice from the developers group
sudo gpasswd -d alice developers

# Verify removal
groups alice

# Remove using deluser (Ubuntu's high-level tool)
sudo deluser alice developers
```

## Modifying Groups

```bash
# Rename a group
sudo groupmod -n engineering developers

# Change a group's GID
sudo groupmod -g 2001 developers

# Verify changes
grep engineering /etc/group
```

## Deleting Groups

```bash
# Delete a group
sudo groupdel developers

# Note: you cannot delete a user's primary group
# Change the user's primary group first
sudo usermod -g newgroup alice
sudo groupdel alice-old-primary-group

# Verify deletion
grep developers /etc/group  # Should return nothing
```

## Practical Group Use Cases

### Shared Web Development Directory

Multiple developers working on the same web project:

```bash
# Create a web developers group
sudo groupadd webdev

# Add developers to the group
sudo usermod -aG webdev alice
sudo usermod -aG webdev bob
sudo usermod -aG webdev charlie

# Create the project directory
sudo mkdir -p /srv/webapp

# Set group ownership and permissions
sudo chown root:webdev /srv/webapp
sudo chmod 2775 /srv/webapp  # setgid bit: new files inherit group ownership
# 2 = setgid, 7 = rwx for owner, 7 = rwx for group, 5 = r-x for others

# Verify permissions
ls -la /srv/
# drwxrwsr-x 2 root webdev 4096 Mar  2 10:00 webapp
# The 's' in 'rws' indicates the setgid bit is set
```

With the setgid bit, any file created inside `/srv/webapp` automatically inherits the `webdev` group, so all team members can read and write each other's files.

### Docker Access Without sudo

```bash
# Add a user to docker group
sudo usermod -aG docker alice

# User must log out and back in for this to take effect
# Or use newgrp to activate in current session
su - alice  # Or log out/in

# Verify docker works without sudo
docker ps
docker run hello-world
```

### Shared Log Reading for Operations Team

```bash
# Create ops team group
sudo groupadd ops

# Add ops users
sudo usermod -aG ops alice
sudo usermod -aG ops bob

# Grant log reading access - add to adm group
sudo usermod -aG adm alice

# Ubuntu's /var/log/auth.log and syslog are readable by adm group
ls -la /var/log/auth.log
# -rw-r----- 1 syslog adm 12345 Mar  2 10:00 /var/log/auth.log
```

### Application Group Isolation

For running applications under specific service accounts with controlled access:

```bash
# Create app group
sudo groupadd myapp

# Create app user in that group
sudo useradd -r -s /usr/sbin/nologin -g myapp myapp

# Create data directory accessible to the app group
sudo mkdir -p /var/lib/myapp
sudo chown myapp:myapp /var/lib/myapp
sudo chmod 750 /var/lib/myapp

# If admins need to access the data, add them to the app group
sudo usermod -aG myapp alice
```

## Checking Group Membership and Permissions

```bash
# List all members of a group
getent group developers
# developers:x:1001:alice,bob,charlie

# List groups a user belongs to
groups alice

# Find files owned by a specific group
find /srv -group webdev

# Find files a group can write to
find /var -group myapp -writable

# Check effective group during a process
# After adding to a group, verify a new login session picks it up
su - alice
id
# Should now show the new group
```

## Group Management with getent

`getent` queries the system's name service switch, which handles both local files and LDAP/Active Directory:

```bash
# Get all groups (including LDAP groups if configured)
getent group

# Find a specific group
getent group developers

# Find all groups with GID above 1000 (user groups)
getent group | awk -F: '$3 >= 1000 {print $1, $3, $4}'

# Find which groups have members
getent group | awk -F: '$4 != "" {print $1": "$4}'
```

## Viewing and Auditing Group Configuration Files

```bash
# /etc/group format: name:password:gid:members
# Password field is 'x' - actual group passwords (rarely used) are in /etc/gshadow
cat /etc/group | column -t -s:

# Check for groups with no members
awk -F: '$4 == "" {print $1}' /etc/group

# Check for orphaned groups (no users have them as primary)
# Cross-reference /etc/passwd GIDs with /etc/group GIDs
awk -F: '{print $4}' /etc/passwd | sort -u | while read gid; do
    if ! grep -q ":$gid:" /etc/group; then
        echo "Orphaned GID: $gid"
    fi
done 2>/dev/null
```

## Scripted Group Management

For managing groups across many users or as part of provisioning:

```bash
#!/bin/bash
# setup-team-groups.sh
# Creates department groups and assigns users

declare -A TEAMS
TEAMS["engineering"]="alice bob charlie"
TEAMS["operations"]="dave eve frank"
TEAMS["qa"]="grace henry"

for team in "${!TEAMS[@]}"; do
    # Create group if it doesn't exist
    if ! getent group "$team" > /dev/null 2>&1; then
        sudo groupadd "$team"
        echo "Created group: $team"
    fi

    # Add members
    for user in ${TEAMS[$team]}; do
        if id "$user" &>/dev/null; then
            sudo usermod -aG "$team" "$user"
            echo "Added $user to $team"
        else
            echo "Warning: user $user does not exist"
        fi
    done
done

echo "Group setup complete"
```

Group-based access control scales much better than user-by-user permission management. When a new team member joins, adding them to the appropriate groups immediately grants all the access they need. When they leave, removing them from groups revokes access cleanly across all resources.
