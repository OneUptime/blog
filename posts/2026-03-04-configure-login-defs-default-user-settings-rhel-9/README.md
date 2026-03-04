# How to Configure the /etc/login.defs File for Default User Settings on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, login.defs, User Settings, Security, Linux

Description: A detailed walkthrough of the /etc/login.defs file on RHEL, explaining each important setting and how to configure UID/GID ranges, password policies, umask, and more for new user accounts.

---

## What is /etc/login.defs?

Every time you run `useradd` on RHEL, the system reads `/etc/login.defs` to figure out the defaults: what UID to assign, how long passwords last, what umask to apply, and a bunch of other settings. Most admins never touch this file, which means they are running with defaults that might not match their security policy.

This is one of those files that is worth reviewing once, getting right, and then forgetting about. Let me walk through the important parts.

## The Full Picture

Here is how `/etc/login.defs` fits into the user creation process:

```mermaid
flowchart LR
    A[useradd command] --> B[/etc/login.defs]
    A --> C[/etc/default/useradd]
    A --> D[/etc/skel/]
    B --> E[UID/GID ranges]
    B --> F[Password aging]
    B --> G[UMASK]
    B --> H[Encryption method]
    C --> I[Default shell, home dir]
    D --> J[Home directory skeleton files]
```

`/etc/login.defs` provides system-wide defaults, `/etc/default/useradd` provides `useradd`-specific defaults, and `/etc/skel/` provides the template files copied into new home directories.

## UID and GID Ranges

These settings control what user IDs and group IDs get assigned to new accounts.

```bash
# View the current UID/GID range settings
grep -E '^(UID|GID)' /etc/login.defs
```

The relevant settings:

```
# Minimum and maximum UID for regular users
UID_MIN                  1000
UID_MAX                 60000

# Minimum and maximum UID for system accounts
SYS_UID_MIN               201
SYS_UID_MAX               999

# Minimum and maximum GID for regular groups
GID_MIN                  1000
GID_MAX                 60000

# Minimum and maximum GID for system groups
SYS_GID_MIN               201
SYS_GID_MAX               999
```

When you run `useradd jsmith`, the system picks the first available UID at or above `UID_MIN`. System accounts created with `useradd -r` get UIDs between `SYS_UID_MIN` and `SYS_UID_MAX`.

**When to change these:**
- If you use a centralized identity system (LDAP, FreeIPA) and need to reserve UID ranges to avoid conflicts
- If you have more than 59,000 local users (unlikely but I have seen it in academic environments)

```bash
# Example: Reserve UIDs 1000-4999 for LDAP users, local users start at 5000
sudo vi /etc/login.defs
```

Change `UID_MIN` to `5000` and LDAP users can safely use the 1000-4999 range without collisions.

## Password Aging Settings

These control how long passwords last and when users get warned.

```bash
# View password aging defaults
grep -E '^PASS' /etc/login.defs
```

```
# Maximum number of days a password may be used
PASS_MAX_DAYS   99999

# Minimum number of days allowed between password changes
PASS_MIN_DAYS   0

# Minimum acceptable password length
PASS_MIN_LEN    5

# Number of days warning given before a password expires
PASS_WARN_AGE   7
```

The defaults are very permissive. `PASS_MAX_DAYS` at 99999 means passwords essentially never expire. Here is what I typically set on production servers:

```
# Require password change every 90 days
PASS_MAX_DAYS   90

# Prevent password changes more than once per day (stops rapid cycling)
PASS_MIN_DAYS   1

# Minimum password length (pam_pwquality handles actual enforcement)
PASS_MIN_LEN    12

# Warn users 14 days before expiry
PASS_WARN_AGE   14
```

**Important:** These settings only apply to accounts created after the change. Existing accounts keep their old aging values. To update existing accounts:

```bash
# Apply new aging policy to an existing user
sudo chage -M 90 -m 1 -W 14 jsmith

# Verify the change
sudo chage -l jsmith
```

To apply to all existing users in bulk:

```bash
# Update password aging for all regular users (UID >= 1000)
for user in $(awk -F: '$3 >= 1000 && $3 < 60000 {print $1}' /etc/passwd); do
    sudo chage -M 90 -m 1 -W 14 "$user"
done
```

## UMASK Setting

The `UMASK` in login.defs sets the default file creation mask for new users.

```bash
# Check the current UMASK setting
grep -E '^UMASK' /etc/login.defs
```

```
# Default umask for new users
UMASK           022
```

With `UMASK 022`:
- New files get permissions `644` (rw-r--r--)
- New directories get permissions `755` (rwxr-xr-x)

For tighter security:

```
# Restrictive umask - files are owner-only by default
UMASK           077
```

With `UMASK 077`:
- New files get permissions `600` (rw-------)
- New directories get permissions `700` (rwx------)

Note that on RHEL, the umask is also set in `/etc/profile` and `/etc/bashrc`, which may override this value. The `pam_umask` module reads from login.defs and applies it during login.

## CREATE_HOME

This controls whether `useradd` creates a home directory by default.

```
# Automatically create home directories for new users
CREATE_HOME     yes
```

On RHEL, this is `yes` by default. If you set it to `no`, you need to pass `-m` to `useradd` to create a home directory. Some environments with centralized home directories (NFS/autofs) set this to `no` since the home directories are managed elsewhere.

## ENCRYPT_METHOD

This determines the hashing algorithm used for passwords in `/etc/shadow`.

```bash
# Check the encryption method
grep ENCRYPT_METHOD /etc/login.defs
```

```
# Password hashing algorithm
ENCRYPT_METHOD SHA512
```

RHEL defaults to `SHA512`, which is solid. The options are:

| Method | Security | Notes |
|--------|----------|-------|
| DES | Very weak | Legacy, do not use |
| MD5 | Weak | Deprecated |
| SHA256 | Good | Acceptable |
| SHA512 | Good | RHEL default |
| YESCRYPT | Strong | Available on RHEL |

If you want the strongest option:

```
ENCRYPT_METHOD YESCRYPT
```

YESCRYPT is a modern password hashing scheme designed to be resistant to GPU and ASIC attacks. It is available on RHEL and is a good choice for new deployments.

## USERGROUPS_ENAB

This controls the User Private Group (UPG) scheme.

```
# Enable the user private group scheme
USERGROUPS_ENAB yes
```

When set to `yes`:
- Each new user gets their own group with the same name as their username
- `userdel` will also delete the user's private group (if no other users are in it)
- The umask behavior interacts with this (see the UPG blog post for details)

## LOG_UNKFAIL_ENAB

This controls whether unknown usernames are logged on failed login attempts.

```
# Log unknown usernames on failed login attempts
LOG_UNKFAIL_ENAB no
```

Setting this to `yes` logs the actual username that was attempted. This is useful for security auditing but can be a privacy concern since users occasionally type their password in the username field.

## Other Useful Settings

```
# Number of login retries before giving up
LOGIN_RETRIES   5

# Timeout in seconds for login
LOGIN_TIMEOUT   60

# Log successful logins
LOG_OK_LOGINS   no
```

I recommend setting `LOG_OK_LOGINS` to `yes` on production servers. It gives you an audit trail of who logged in and when.

## Viewing the Effective Configuration

After making changes, verify the full effective configuration:

```bash
# Show all active (non-comment) settings
grep -v '^#' /etc/login.defs | grep -v '^$'
```

## A Security-Hardened Configuration

Here is what I typically set on production RHEL servers:

```
PASS_MAX_DAYS   90
PASS_MIN_DAYS   1
PASS_MIN_LEN    12
PASS_WARN_AGE   14
UID_MIN         1000
UID_MAX         60000
GID_MIN         1000
GID_MAX         60000
UMASK           027
CREATE_HOME     yes
ENCRYPT_METHOD  SHA512
USERGROUPS_ENAB yes
LOG_OK_LOGINS   yes
LOG_UNKFAIL_ENAB no
LOGIN_RETRIES   3
LOGIN_TIMEOUT   60
```

The `UMASK 027` is a middle ground - owner gets full access, group gets read/execute, and others get nothing.

## Wrapping Up

`/etc/login.defs` is not glamorous, but getting it right means every new account on your system starts with a reasonable security baseline. Review it when you set up a new server, set the password aging policy your organization requires, choose an appropriate umask, and move on. The few minutes you spend here save you from chasing down per-account settings later. And remember, changes only affect new accounts. Use `chage` and `chmod` to bring existing accounts in line.
