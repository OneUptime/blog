# How to Create and Manage User Accounts and Groups on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, User Management, Groups, Linux, System Administration

Description: A complete guide to creating, modifying, and managing user accounts and groups on RHEL, covering the essential commands and the configuration files that drive it all.

---

User and group management is one of those fundamental sysadmin tasks that you do constantly but rarely think about deeply. Get it right, and access control just works. Get it wrong, and you'll spend hours debugging permission issues or, worse, dealing with a security incident. This guide covers the commands and files you need to manage users and groups properly on RHEL.

## The Key Files

Before diving into commands, it helps to understand where user and group information lives on disk:

| File | Purpose |
|------|---------|
| `/etc/passwd` | User account information (name, UID, GID, home, shell) |
| `/etc/shadow` | Encrypted passwords and password aging info |
| `/etc/group` | Group definitions and membership |
| `/etc/gshadow` | Encrypted group passwords (rarely used) |
| `/etc/login.defs` | Default settings for new accounts |
| `/etc/skel/` | Template files copied into new home directories |

```mermaid
flowchart LR
    A[useradd command] --> B[/etc/passwd]
    A --> C[/etc/shadow]
    A --> D[/etc/group]
    A --> E[Home directory created from /etc/skel]
    F[passwd command] --> C
    G[groupadd command] --> D
```

## Creating User Accounts

The `useradd` command is the standard way to create accounts. Here are the patterns I use regularly.

Create a basic user with default settings:

```bash
# Create a new user with defaults from /etc/login.defs
sudo useradd jsmith

# Set a password for the new user
sudo passwd jsmith
```

Create a user with specific options:

```bash
# Create a user with a custom home directory, shell, comment, and UID
sudo useradd -m \
  -d /home/jsmith \
  -s /bin/bash \
  -c "John Smith - DevOps Team" \
  -u 1500 \
  jsmith
```

Here's what each flag does:

- `-m` - Create the home directory if it doesn't exist
- `-d` - Specify the home directory path
- `-s` - Set the login shell
- `-c` - Add a comment (usually the full name)
- `-u` - Set a specific UID

Create a system account (for services, not humans):

```bash
# System accounts get a low UID, no home directory by default,
# and /sbin/nologin as their shell
sudo useradd -r -s /sbin/nologin myapp
```

## Modifying User Accounts

The `usermod` command changes existing accounts. The flags mirror `useradd` for the most part.

```bash
# Change a user's login shell
sudo usermod -s /bin/zsh jsmith

# Change the user's home directory and move existing files there
sudo usermod -d /home/newpath -m jsmith

# Change the user's comment/description
sudo usermod -c "John Smith - SRE Team" jsmith

# Lock a user account (prefix the password hash with !)
sudo usermod -L jsmith

# Unlock a locked account
sudo usermod -U jsmith

# Set an account expiration date (useful for contractors)
sudo usermod -e 2026-12-31 jsmith
```

## Deleting User Accounts

```bash
# Delete a user but keep their home directory
sudo userdel jsmith

# Delete a user AND remove their home directory and mail spool
sudo userdel -r jsmith
```

I generally recommend keeping home directories around for a while after removing accounts, in case you need to recover files. Delete them manually once you're sure nothing is needed.

## Managing Passwords

The `passwd` command handles password changes and account locking.

```bash
# Change your own password
passwd

# Change another user's password (requires root)
sudo passwd jsmith

# Force a user to change their password on next login
sudo passwd -e jsmith

# Lock an account (same as usermod -L)
sudo passwd -l jsmith

# Unlock an account
sudo passwd -u jsmith

# Check password status for a user
sudo passwd -S jsmith
```

### Password Aging Policies

Use `chage` to manage password aging and expiration:

```bash
# View password aging info for a user
sudo chage -l jsmith

# Set maximum password age to 90 days
sudo chage -M 90 jsmith

# Set minimum days between password changes to 7
sudo chage -m 7 jsmith

# Set warning period to 14 days before expiry
sudo chage -W 14 jsmith

# Force password change on next login
sudo chage -d 0 jsmith
```

## Working with Groups

Groups simplify permission management. Instead of granting access to individual users, assign users to groups and grant access to the group.

### Creating and Deleting Groups

```bash
# Create a new group
sudo groupadd developers

# Create a group with a specific GID
sudo groupadd -g 2000 developers

# Delete a group
sudo groupdel developers
```

### Adding Users to Groups

Every user has a primary group (set at creation) and can belong to multiple supplementary groups.

```bash
# Add a user to a supplementary group
sudo usermod -aG developers jsmith

# Add a user to multiple supplementary groups at once
sudo usermod -aG developers,docker,wheel jsmith

# IMPORTANT: always use -aG (append). Without -a, the user
# gets REMOVED from all groups not listed:
# BAD:  sudo usermod -G developers jsmith  (removes from other groups!)
# GOOD: sudo usermod -aG developers jsmith (adds to developers, keeps others)

# Change a user's primary group
sudo usermod -g developers jsmith
```

### Checking Group Membership

```bash
# Show all groups a user belongs to
groups jsmith

# Same info using the id command (includes UIDs and GIDs)
id jsmith

# List all members of a specific group
getent group developers
```

## Understanding /etc/passwd

Each line in `/etc/passwd` has seven colon-separated fields:

```
jsmith:x:1001:1001:John Smith:/home/jsmith:/bin/bash
```

| Field | Value | Meaning |
|-------|-------|---------|
| 1 | jsmith | Username |
| 2 | x | Password placeholder (actual hash is in /etc/shadow) |
| 3 | 1001 | User ID (UID) |
| 4 | 1001 | Primary Group ID (GID) |
| 5 | John Smith | Comment (GECOS field) |
| 6 | /home/jsmith | Home directory |
| 7 | /bin/bash | Login shell |

## Understanding /etc/shadow

The shadow file stores password hashes and aging info. Only root can read it.

```
jsmith:$6$rounds=...:19500:0:99999:7:::
```

| Field | Meaning |
|-------|---------|
| 1 | Username |
| 2 | Encrypted password hash |
| 3 | Days since epoch of last password change |
| 4 | Minimum days between changes |
| 5 | Maximum days before change required |
| 6 | Warning days before expiry |
| 7 | Days after expiry until account is disabled |
| 8 | Days since epoch when account expires |

## Understanding /etc/group

Each line in `/etc/group` has four fields:

```
developers:x:2000:jsmith,ajones,bwilson
```

| Field | Value | Meaning |
|-------|-------|---------|
| 1 | developers | Group name |
| 2 | x | Group password placeholder |
| 3 | 2000 | Group ID (GID) |
| 4 | jsmith,ajones,bwilson | Comma-separated member list |

## Customizing Default Settings

### /etc/login.defs

This file controls defaults for new accounts:

```bash
# View key settings in login.defs
grep -E '^(UID_MIN|UID_MAX|GID_MIN|GID_MAX|CREATE_HOME|UMASK|PASS_)' /etc/login.defs
```

Key settings you might want to adjust:

- `UID_MIN` / `UID_MAX` - Range for regular user UIDs
- `PASS_MAX_DAYS` - Default password expiry
- `PASS_MIN_DAYS` - Minimum days between password changes
- `PASS_MIN_LEN` - Minimum password length
- `CREATE_HOME` - Whether to create home directories by default

### /etc/skel

Files placed in `/etc/skel/` get copied to every new user's home directory. This is handy for distributing default configurations:

```bash
# See what's in skel by default
ls -la /etc/skel/

# Add a custom .bashrc that all new users will get
sudo cp /path/to/custom-bashrc /etc/skel/.bashrc
```

## Practical Tips

**Always use -aG with usermod.** Forgetting the `-a` flag when adding someone to a group will silently remove them from all their other supplementary groups. I've seen this cause outages when someone lost their `docker` or `wheel` group membership unexpectedly.

**Use system accounts for services.** Don't run application processes as root or as a real user's account. Create dedicated system accounts with `useradd -r -s /sbin/nologin`.

**Audit accounts regularly.** Check for accounts with no password, accounts that haven't logged in for months, and accounts with UID 0 (root equivalents):

```bash
# Find accounts with empty passwords
sudo awk -F: '($2 == "" ) {print $1}' /etc/shadow

# Find accounts with UID 0 (should only be root)
awk -F: '($3 == 0) {print $1}' /etc/passwd

# List users who have never logged in
lastlog | grep "Never logged in"
```

**Set expiration dates for temporary accounts.** Contractors, interns, and temporary access should always have an expiry date set with `usermod -e`.

## Wrapping Up

User and group management on RHEL is straightforward once you know the commands and understand the underlying files. The most important habit is consistency: use groups for access control, set password policies that match your organization's requirements, and clean up accounts when people leave. Small disciplines like these prevent big security problems later.
