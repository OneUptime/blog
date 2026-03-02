# How to Add and Remove Users on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, User Management, Linux, System Administration

Description: A complete guide to adding and removing user accounts on Ubuntu Server, covering adduser, useradd, userdel, and managing home directories and SSH keys.

---

Managing user accounts is a fundamental sysadmin task. On Ubuntu Server, you'll regularly add accounts for team members, service accounts for applications, and system users for daemons. This guide covers the full process with the right tools for each scenario.

## Two Tools for Adding Users

Ubuntu provides two commands for creating users: `adduser` and `useradd`. They're often confused but serve different purposes.

**`adduser`** is the high-level, interactive tool. It creates the home directory, copies skeleton files, prompts for a password and user information, and handles everything you'd want for a real person's account.

**`useradd`** is the low-level tool. It directly manipulates `/etc/passwd` and related files without interaction. Use it for scripting or when you need precise control over what gets created.

## Adding a User with adduser

For a human user who will log in and work on the system:

```bash
# Add a new user interactively
sudo adduser alice

# You'll be prompted for:
# Password: (set a strong password)
# Full Name: Alice Smith
# Room Number: (can leave blank)
# Work Phone: (can leave blank)
# Home Phone: (can leave blank)
# Other: (can leave blank)
# Is the information correct? [Y/n]: Y
```

This creates:
- User account in `/etc/passwd`
- Hashed password in `/etc/shadow`
- Home directory at `/home/alice`
- User's primary group `alice` in `/etc/group`
- Skeleton files copied from `/etc/skel` into the home directory

```bash
# Verify the user was created
id alice
# uid=1001(alice) gid=1001(alice) groups=1001(alice)

# Check the home directory
ls -la /home/alice/
# Shows .bashrc, .bash_profile, .profile (from /etc/skel)
```

## Adding a User with useradd

For scripting or when you need specific control:

```bash
# Basic user creation with useradd
sudo useradd -m -s /bin/bash -c "Alice Smith" alice

# Flags explained:
# -m        Create home directory
# -s        Set login shell
# -c        Set comment/GECOS field (usually full name)

# Set the password separately
sudo passwd alice

# More options:
sudo useradd \
    -m \                          # Create home directory
    -s /bin/bash \                # Shell
    -c "Service Account" \        # Comment
    -d /opt/myservice \           # Custom home directory
    -u 1500 \                     # Specific UID (optional)
    -g developers \               # Primary group
    -G docker,sudo \              # Additional groups
    myservice
```

## Creating Service Accounts

Service accounts run application processes and typically don't need login shells or home directories:

```bash
# Create a system user for a daemon (no home dir, no login)
sudo useradd \
    --system \          # System user (UID < 1000)
    --no-create-home \  # No home directory
    --shell /usr/sbin/nologin \  # Prevent interactive login
    --comment "MyApp Service Account" \
    myapp

# Or use adduser with --system flag
sudo adduser --system --no-create-home --group myapp

# Verify
id myapp
# uid=999(myapp) gid=999(myapp) groups=999(myapp)

grep myapp /etc/passwd
# myapp:x:999:999:MyApp Service Account:/:/usr/sbin/nologin
```

## Modifying Existing Users

After creating a user, you can modify their properties:

```bash
# Change the user's primary group
sudo usermod -g developers alice

# Add alice to additional groups
sudo usermod -aG docker alice    # -a flag appends, without it replaces
sudo usermod -aG sudo alice

# Change the login shell
sudo usermod -s /bin/zsh alice

# Change the home directory (and move files)
sudo usermod -d /home/new-home -m alice

# Lock an account (disable login without deleting)
sudo usermod -L alice

# Unlock an account
sudo usermod -U alice

# Change the username
sudo usermod -l newname alice    # Renames alice to newname
# Note: home directory path is NOT automatically renamed
sudo mv /home/alice /home/newname
sudo usermod -d /home/newname newname
```

## Setting Up SSH Access for New Users

For server access, configure SSH keys rather than relying on passwords:

```bash
# Switch to the new user's context to set up SSH
sudo su - alice

# Create the .ssh directory with correct permissions
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create the authorized_keys file
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Exit back to your user
exit

# Add a public key to alice's authorized_keys (as root)
# Assuming you have alice's public key content:
echo "ssh-ed25519 AAAAC3Nza... alice@workstation" | \
    sudo tee -a /home/alice/.ssh/authorized_keys

# Verify permissions (critical - wrong permissions break SSH)
ls -la /home/alice/.ssh/
```

Or if you have alice's public key in a file:

```bash
sudo mkdir -p /home/alice/.ssh
sudo cp alice_key.pub /home/alice/.ssh/authorized_keys
sudo chmod 700 /home/alice/.ssh
sudo chmod 600 /home/alice/.ssh/authorized_keys
sudo chown -R alice:alice /home/alice/.ssh
```

## Removing Users

### Removing a User Account Only

```bash
# Remove the user account, keep the home directory
sudo userdel alice

# This leaves /home/alice intact - useful if you want to archive or reassign the data
ls /home/alice  # Still exists
```

### Removing a User and Their Home Directory

```bash
# Remove user and home directory
sudo userdel -r alice

# Using deluser (Ubuntu's high-level tool)
sudo deluser alice

# With home directory removal
sudo deluser --remove-home alice

# Also remove the user from all groups
sudo deluser --remove-all-files alice
```

### Before Removing: Handling User's Files

Before removing a user on a production system, document and archive their files:

```bash
# Create a tarball of the user's home directory before deletion
sudo tar -czf /backup/alice-$(date +%Y%m%d).tar.gz /home/alice/

# Check what processes are running as this user
ps aux | grep alice

# Kill any running processes before deletion
sudo pkill -u alice

# Transfer ownership of files outside home dir to another user
sudo find / -user alice -exec chown newowner {} \; 2>/dev/null

# Now safe to delete
sudo userdel -r alice
```

## Checking User Account Status

```bash
# View user information
id alice
finger alice       # If finger is installed
getent passwd alice

# Check when the account expires, password aging
sudo chage -l alice

# List all non-system users (UID >= 1000)
awk -F: '$3 >= 1000 && $3 != 65534 {print $1, $3, $6}' /etc/passwd

# List users who can log in (have a real shell)
grep -v "nologin\|false" /etc/passwd | awk -F: '{print $1, $7}'

# Check the last time users logged in
last | head -20
lastlog | grep -v "Never logged in" | head -20
```

## Batch User Creation

For adding multiple users at once:

```bash
#!/bin/bash
# add-users.sh - Create multiple user accounts from a list

USERS_FILE="users.txt"  # One username per line, or "username:fullname" format

while IFS=: read -r username fullname; do
    if id "$username" &>/dev/null; then
        echo "User $username already exists, skipping"
        continue
    fi

    # Create the user
    sudo adduser --disabled-password \
                 --gecos "$fullname" \
                 "$username"

    echo "Created user: $username"

    # Set up SSH directory
    sudo mkdir -p /home/$username/.ssh
    sudo chmod 700 /home/$username/.ssh
    sudo chown $username:$username /home/$username/.ssh

    echo "Ready for SSH key upload: $username"
done < "$USERS_FILE"
```

```bash
# users.txt format:
# alice:Alice Smith
# bob:Bob Jones
# charlie:Charlie Brown

chmod +x add-users.sh
sudo ./add-users.sh
```

User management on Ubuntu Server is straightforward with these tools. The key principle is using `adduser` and `deluser` for interactive management and `useradd`/`userdel` for scripting, always setting correct permissions on SSH directories, and archiving user data before removal rather than deleting it immediately.
