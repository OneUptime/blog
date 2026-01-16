# How to Create and Manage Users and Groups on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Users, Groups, Security, System Administration, Tutorial

Description: Complete guide to user and group management on Ubuntu including creating users, managing permissions, and implementing security best practices.

---

User and group management is fundamental to Linux security and system administration. This guide covers creating and managing users, working with groups, setting permissions, and implementing security best practices on Ubuntu.

## Understanding Users and Groups

### Key Concepts

- **User**: An account that can log in and run processes
- **Group**: A collection of users sharing permissions
- **UID**: Unique numeric identifier for users
- **GID**: Unique numeric identifier for groups
- **Primary Group**: The default group assigned to files a user creates
- **Secondary Groups**: Additional groups a user belongs to

### Important Files

| File | Purpose |
|------|---------|
| `/etc/passwd` | User account information |
| `/etc/shadow` | Encrypted passwords |
| `/etc/group` | Group definitions |
| `/etc/gshadow` | Group passwords (rarely used) |

## Viewing User Information

```bash
# View current user
whoami

# View current user's groups
groups

# View detailed user info
id

# View another user's info
id username

# List all users
cat /etc/passwd

# List users with login shells only
getent passwd | grep -E '/bin/(bash|sh|zsh)'

# List all groups
cat /etc/group
```

## Creating Users

### Using adduser (Recommended)

`adduser` is Ubuntu's user-friendly wrapper:

```bash
# Create a new user interactively
sudo adduser newuser
```

This prompts for:
- Password
- Full name
- Room number (optional)
- Work phone (optional)
- Home phone (optional)
- Other (optional)

### Using useradd (Low-level)

For scripting or specific configurations:

```bash
# Create user with home directory and bash shell
sudo useradd -m -s /bin/bash newuser

# Set password separately
sudo passwd newuser
```

### Create User with Specific Options

```bash
# Create user with specific UID and GID
sudo useradd -m -u 1500 -g developers -s /bin/bash devuser

# Create user with multiple secondary groups
sudo useradd -m -G sudo,docker,developers -s /bin/bash adminuser

# Create user with specific home directory
sudo useradd -m -d /home/custom_home -s /bin/bash customuser

# Create user with expiration date
sudo useradd -m -e 2026-12-31 -s /bin/bash tempuser

# Create system user (for services, no home directory)
sudo useradd -r -s /usr/sbin/nologin serviceaccount
```

## Modifying Users

### Change User Properties

```bash
# Change username
sudo usermod -l newname oldname

# Change home directory
sudo usermod -d /new/home -m username

# Change default shell
sudo usermod -s /bin/zsh username

# Add user to additional groups
sudo usermod -aG docker,sudo username

# Change primary group
sudo usermod -g newgroup username

# Lock user account (disable login)
sudo usermod -L username

# Unlock user account
sudo usermod -U username

# Set account expiration date
sudo usermod -e 2026-12-31 username
```

### Change Password

```bash
# Change your own password
passwd

# Change another user's password (requires root)
sudo passwd username

# Force password change on next login
sudo passwd -e username

# View password status
sudo passwd -S username
```

### Password Policies

```bash
# Set password aging (max 90 days, min 7 days, warn 14 days before)
sudo chage -M 90 -m 7 -W 14 username

# View password aging information
sudo chage -l username

# Force password change on next login
sudo chage -d 0 username

# Set account expiration
sudo chage -E 2026-12-31 username
```

## Deleting Users

```bash
# Delete user but keep home directory
sudo userdel username

# Delete user and home directory
sudo userdel -r username

# Using deluser (Ubuntu-friendly)
sudo deluser username

# Remove user and home directory
sudo deluser --remove-home username

# Remove user from a specific group
sudo deluser username groupname
```

## Managing Groups

### Create Groups

```bash
# Create a new group
sudo groupadd developers

# Create group with specific GID
sudo groupadd -g 2000 dbadmins

# Create system group
sudo groupadd -r appgroup
```

### Modify Groups

```bash
# Rename group
sudo groupmod -n newname oldname

# Change group GID
sudo groupmod -g 2500 groupname
```

### Delete Groups

```bash
# Delete a group
sudo groupdel groupname
```

### Managing Group Membership

```bash
# Add user to group
sudo usermod -aG groupname username

# Alternative: using gpasswd
sudo gpasswd -a username groupname

# Remove user from group
sudo gpasswd -d username groupname

# Set group administrators
sudo gpasswd -A adminuser groupname

# List group members
getent group groupname

# List all groups a user belongs to
groups username
```

## Sudo Access

### Grant Sudo Privileges

```bash
# Add user to sudo group (Ubuntu)
sudo usermod -aG sudo username

# Verify sudo access
sudo -l -U username
```

### Configure Sudoers

```bash
# Edit sudoers safely (always use visudo!)
sudo visudo
```

Common configurations:

```bash
# Allow user full sudo access
username ALL=(ALL:ALL) ALL

# Allow user sudo without password (not recommended for production)
username ALL=(ALL:ALL) NOPASSWD: ALL

# Allow group sudo access
%developers ALL=(ALL:ALL) ALL

# Allow specific commands only
username ALL=(ALL) /usr/bin/systemctl restart nginx, /usr/bin/systemctl status nginx

# Allow commands as specific user
username ALL=(www-data) /var/www/deploy.sh
```

### Create Custom Sudoers File

```bash
# Create file in sudoers.d (recommended over editing main file)
sudo nano /etc/sudoers.d/developers
```

```bash
# Allow developers group to restart web services
%developers ALL=(ALL) /usr/bin/systemctl restart nginx, /usr/bin/systemctl restart apache2
```

```bash
# Set correct permissions
sudo chmod 440 /etc/sudoers.d/developers

# Verify syntax
sudo visudo -c
```

## File Permissions

### Understanding Permission Notation

```
-rwxr-xr-- 1 owner group size date filename
│├─┤├─┤├─┤
││  │  │
││  │  └── Others (everyone else)
││  └───── Group
│└──────── Owner
└───────── File type (- = file, d = directory)
```

Permission values:
- `r` (read) = 4
- `w` (write) = 2
- `x` (execute) = 1

### Change Ownership

```bash
# Change file owner
sudo chown newowner filename

# Change owner and group
sudo chown newowner:newgroup filename

# Change recursively
sudo chown -R newowner:newgroup /path/to/directory

# Change only group
sudo chgrp newgroup filename
```

### Change Permissions

```bash
# Using symbolic notation
chmod u+x filename     # Add execute for owner
chmod g-w filename     # Remove write for group
chmod o=r filename     # Set others to read only
chmod a+r filename     # Add read for all

# Using numeric notation
chmod 755 filename     # rwxr-xr-x (common for scripts)
chmod 644 filename     # rw-r--r-- (common for files)
chmod 700 filename     # rwx------ (private)
chmod 777 filename     # rwxrwxrwx (avoid! insecure)

# Recursive
chmod -R 755 /path/to/directory
```

### Special Permissions

```bash
# Set SUID (run as owner)
chmod u+s /path/to/binary
chmod 4755 /path/to/binary

# Set SGID (run as group / inherit group in directory)
chmod g+s /path/to/directory
chmod 2755 /path/to/directory

# Set sticky bit (only owner can delete in directory)
chmod +t /path/to/directory
chmod 1755 /path/to/directory
```

### Default Permissions (umask)

```bash
# View current umask
umask

# Set umask (022 = new files are 644, directories 755)
umask 022

# More restrictive (027 = files 640, directories 750)
umask 027

# Make permanent - add to ~/.bashrc or /etc/profile
echo "umask 027" >> ~/.bashrc
```

## Access Control Lists (ACLs)

ACLs provide fine-grained permissions beyond standard Unix permissions.

```bash
# Install ACL tools if needed
sudo apt install acl

# View ACLs
getfacl filename

# Grant user read access
setfacl -m u:username:r filename

# Grant group read/write access
setfacl -m g:groupname:rw filename

# Set default ACL for directory (new files inherit)
setfacl -d -m g:developers:rwx /shared/project

# Remove ACL entry
setfacl -x u:username filename

# Remove all ACLs
setfacl -b filename

# Copy ACLs from one file to another
getfacl source | setfacl --set-file=- destination
```

## Practical Examples

### Create Developer Team Setup

```bash
#!/bin/bash
# Script to set up a development team

# Create developers group
sudo groupadd developers

# Create shared project directory
sudo mkdir -p /opt/projects
sudo chgrp developers /opt/projects
sudo chmod 2775 /opt/projects  # SGID ensures new files belong to group

# Create team members
for user in alice bob charlie; do
    sudo useradd -m -s /bin/bash -G developers $user
    sudo passwd $user  # Will prompt for password
done

# Set up ACL for shared directory
sudo setfacl -d -m g:developers:rwx /opt/projects

echo "Developer team setup complete!"
```

### Create Service Account

```bash
# Create account for running an application
sudo useradd -r -s /usr/sbin/nologin -d /opt/myapp -M myapp

# Create application directory
sudo mkdir -p /opt/myapp
sudo chown myapp:myapp /opt/myapp
sudo chmod 750 /opt/myapp
```

## Security Best Practices

### Password Policies

```bash
# Install password quality checking
sudo apt install libpam-pwquality

# Edit PAM configuration
sudo nano /etc/security/pwquality.conf
```

```ini
# Minimum password length
minlen = 12

# Require at least one digit
dcredit = -1

# Require at least one uppercase
ucredit = -1

# Require at least one lowercase
lcredit = -1

# Require at least one special character
ocredit = -1
```

### Audit User Activities

```bash
# View login history
last

# View failed login attempts
sudo lastb

# View currently logged-in users
who
w

# View user's last login
lastlog
```

### Regular Maintenance

```bash
# Find users with empty passwords
sudo awk -F: '($2 == "") {print $1}' /etc/shadow

# Find users with UID 0 (root privileges)
awk -F: '($3 == 0) {print $1}' /etc/passwd

# List users who can log in
getent passwd | awk -F: '$7 !~ /(nologin|false)/ {print $1}'

# Find files with no owner
sudo find / -nouser -o -nogroup 2>/dev/null
```

---

Effective user and group management is essential for system security and collaborative workflows. Use groups to simplify permission management, implement strong password policies, and regularly audit user access to maintain a secure system.
