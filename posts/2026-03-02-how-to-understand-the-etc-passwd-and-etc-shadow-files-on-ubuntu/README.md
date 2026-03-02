# How to Understand the /etc/passwd and /etc/shadow Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Security, User Management, System Administration

Description: A detailed explanation of the /etc/passwd and /etc/shadow files on Ubuntu, covering their formats, fields, security implications, and how to read and safely modify them.

---

The `/etc/passwd` and `/etc/shadow` files are the foundational user account database on Linux systems. Every user account, every system service, every daemon has an entry in these files. Understanding what each field means and how these files work together is fundamental knowledge for any Linux administrator.

## The /etc/passwd File

Despite its name, `/etc/passwd` doesn't store passwords (those moved to `/etc/shadow` decades ago). It stores the basic user account information that many system utilities need to function.

```bash
# View the passwd file
cat /etc/passwd

# Or view with line numbers for reference
cat -n /etc/passwd | head -30

# Look at a specific user's entry
grep "^alice:" /etc/passwd
# alice:x:1001:1001:Alice Smith,,,:/home/alice:/bin/bash
```

### File Permissions

```bash
ls -la /etc/passwd
# -rw-r--r-- 1 root root 2847 Mar  2 10:00 /etc/passwd
```

The passwd file is readable by everyone (644 permissions). This is intentional - many programs need to look up UIDs to display file ownership, running process owners, and similar information. The actual security-sensitive data (password hashes) lives in `/etc/shadow`, which is readable only by root.

### The Seven Fields of /etc/passwd

Each line represents one account, with seven colon-separated fields:

```
username:password:UID:GID:GECOS:home_directory:login_shell
```

Let's examine each field:

```bash
# Example entry:
alice:x:1001:1001:Alice Smith,,,:/home/alice:/bin/bash
```

**Field 1 - Username** (`alice`):
The login name. Must be unique on the system, and by convention uses lowercase letters, digits, hyphens, and underscores. Maximum length varies by system but is typically 32 characters.

```bash
# List all usernames
cut -d: -f1 /etc/passwd

# Find if a username exists
getent passwd alice
```

**Field 2 - Password** (`x`):
The literal character `x` means the password is stored in `/etc/shadow` (the secure location). If this field contains `*`, the account is disabled. If it's empty, login without a password is allowed (very rare and insecure).

**Field 3 - UID** (`1001`):
The User ID number. Conventions on Ubuntu:
- 0: root (the superuser)
- 1-999: system accounts (daemons, service users)
- 1000-65533: regular user accounts
- 65534: nobody (anonymous/unmapped)

```bash
# Find a user by UID
getent passwd 1001

# List all users and their UIDs
awk -F: '{printf "%-20s %s\n", $1, $3}' /etc/passwd | sort -t' ' -k2 -n
```

**Field 4 - GID** (`1001`):
The primary Group ID. References an entry in `/etc/group`. When a user creates a file, this GID is assigned as the file's group (unless setgid is involved).

```bash
# Find the group name for GID 1001
getent group 1001
```

**Field 5 - GECOS** (`Alice Smith,,,`):
The General Electric Comprehensive Operating System field (historical name, now just called the comment field). Typically contains the user's full name, office location, phone number. The commas separate sub-fields; unused sub-fields are left empty.

```bash
# View the GECOS field for all users
cut -d: -f5 /etc/passwd | sort | uniq -c | sort -rn

# Change a user's GECOS information
sudo chfn alice
# Or directly:
sudo usermod -c "Alice Smith, Engineering" alice
```

**Field 6 - Home Directory** (`/home/alice`):
The absolute path to the user's home directory. The shell sets `$HOME` to this value on login.

```bash
# Find users without home directories
awk -F: '{if ($6 != "" && !system("test -d "$6)) print $1" has home "$6; else print $1" missing home "$6}' /etc/passwd 2>/dev/null
```

**Field 7 - Login Shell** (`/bin/bash`):
The shell to start when the user logs in. For accounts that shouldn't have interactive login (service accounts), this is typically `/usr/sbin/nologin` or `/bin/false`.

```bash
# List all login shells in use on the system
cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn

# Find service accounts (no login shell)
grep "nologin\|false" /etc/passwd | cut -d: -f1

# Change a user's shell
sudo chsh -s /bin/zsh alice
# Or:
sudo usermod -s /bin/zsh alice

# List valid shells on the system
cat /etc/shells
```

## The /etc/shadow File

The shadow file stores password hashes and password aging information. It was separated from `/etc/passwd` to allow `/etc/passwd` to be world-readable while keeping password hashes secure.

```bash
# View the shadow file (requires root)
sudo cat /etc/shadow

# View a specific user's shadow entry
sudo grep "^alice:" /etc/shadow
# alice:$y$j9T$abc123...:19400:7:90:14:30::
```

### File Permissions

```bash
ls -la /etc/shadow
# -rw-r----- 1 root shadow 1596 Mar  2 10:00 /etc/shadow
```

The shadow file is readable by root and the `shadow` group. Only root can write to it. Never change these permissions.

### The Nine Fields of /etc/shadow

```
username:hashed_password:last_changed:min_days:max_days:warn_days:inactive_days:expires:reserved
```

**Field 1 - Username** (`alice`):
Matches the entry in `/etc/passwd`.

**Field 2 - Hashed Password** (`$y$j9T$abc123...`):
The password hash. The format is `$id$salt$hash`:
- `$1$` = MD5 (obsolete, insecure)
- `$5$` = SHA-256
- `$6$` = SHA-512
- `$y$` = yescrypt (Ubuntu 22.04+ default)

Special values:
- `*` or `!` = Account locked, cannot login with password (SSH keys may still work)
- `!!` = Password never set (account created but no password assigned)
- `!$6$...` = Password locked with `passwd -l` (the `!` prefix disables it)

```bash
# Identify the hash algorithm in use for a user
sudo grep "^alice:" /etc/shadow | cut -d: -f2 | cut -d$ -f2
# y = yescrypt, 6 = SHA-512, 5 = SHA-256

# Check if any accounts use weak hash algorithms
sudo grep -E '^\w+:\$1\$' /etc/shadow | cut -d: -f1
# (any output means MD5 hashes in use - should be updated)
```

**Fields 3-8 - Aging Information**:

```bash
# Field 3: Last password change (days since Jan 1, 1970)
# Field 4: Minimum days between changes
# Field 5: Maximum days before change required
# Field 6: Warning days before expiration
# Field 7: Inactive days after expiration before lockout
# Field 8: Account expiration (absolute date, days since epoch)

# Read these in human form with chage
sudo chage -l alice
```

## Safely Editing These Files

Never edit `/etc/passwd` or `/etc/shadow` directly with a text editor during production use. Use the appropriate tools:

```bash
# Use vipw to edit /etc/passwd safely (locks the file during edit)
sudo vipw

# Use vipw -s to edit /etc/shadow safely
sudo vipw -s

# These commands lock the file, preventing concurrent modifications
# that could corrupt the database
```

For adding users, always use `adduser` or `useradd`. For modifying, use `usermod` and `chage`. These tools understand the file format and maintain consistency between `/etc/passwd`, `/etc/shadow`, and `/etc/group`.

## Security Checks

```bash
# Find accounts with no password set (!! in shadow)
sudo awk -F: '$2 == "!!" {print "No password set: "$1}' /etc/shadow

# Find accounts with empty passwords (dangerous)
sudo awk -F: '$2 == "" {print "Empty password: "$1}' /etc/shadow

# Find accounts that can login without a shell restriction
grep -v "nologin\|false" /etc/passwd | awk -F: '$3 != 0 {print $1}'

# Find duplicate UIDs (should never happen)
awk -F: '{print $3}' /etc/passwd | sort | uniq -d

# Find duplicate usernames (should never happen)
awk -F: '{print $1}' /etc/passwd | sort | uniq -d

# Verify passwd and shadow are in sync
sudo pwck
sudo grpck
```

## Backing Up These Files

Before making any user account changes:

```bash
# Backup authentication files
sudo cp /etc/passwd /etc/passwd.bak.$(date +%Y%m%d)
sudo cp /etc/shadow /etc/shadow.bak.$(date +%Y%m%d)
sudo cp /etc/group /etc/group.bak.$(date +%Y%m%d)
sudo cp /etc/gshadow /etc/gshadow.bak.$(date +%Y%m%d)

# Set appropriate permissions on backups
sudo chmod 600 /etc/shadow.bak.*
sudo chown root:root /etc/shadow.bak.*
```

Understanding these files lets you interpret what tools like `id`, `whoami`, `ls -l`, `ps aux`, and many others display, and helps diagnose authentication issues when users can't log in or when ownership looks wrong. The password hash format, in particular, tells you at a glance whether your system is using modern, secure hashing algorithms or outdated ones that need upgrading.
