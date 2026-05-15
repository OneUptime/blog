# How to Configure the /etc/login.defs File for Default User Settings on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Login.defs, User Setting, Security, Linux

Description: A detailed walkthrough of the /etc/login.defs file on RHEL, explaining each important setting and how to configure UID/GID ranges, password policies, umask, and more for new user accounts.

---

## What is /etc/login.defs?

Every time you run `useradd` on RHEL, the system reads `/etc/login.defs` to figure out account defaults: what UID to assign, how long passwords last for newly created accounts, what permissions to use when creating home directories, and a bunch of other settings. Most admins never touch this file, which means they are running with defaults that might not match their security policy.

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
    B --> H[Selected shadow-utils defaults]
    C --> I[Default shell, home dir]
    D --> J[Home directory skeleton files]
```

`/etc/login.defs` provides system-wide defaults, `/etc/default/useradd` provides `useradd`-specific defaults, and `/etc/skel/` provides the template files copied into new home directories.

## UID and GID Ranges

These settings control what user IDs and group IDs get assigned to new accounts.

```bash
# View the current UID/GID range settings

grep -E '^(SYS_)?(UID|GID)' /etc/login.defs
```

The relevant settings:

```bash
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

```bash
# Maximum number of days a password may be used
PASS_MAX_DAYS   99999

# Minimum number of days allowed between password changes
PASS_MIN_DAYS   0

# Number of days warning given before a password expires
PASS_WARN_AGE   7
```

The defaults are very permissive. `PASS_MAX_DAYS` at 99999 means passwords essentially never expire. Here is what I typically set on production servers:

```bash
# Require password change every 90 days
PASS_MAX_DAYS   90

# Prevent password changes more than once per day (stops rapid cycling)
PASS_MIN_DAYS   1

# Warn users 14 days before expiry
PASS_WARN_AGE   14
```

On RHEL 9, password length and complexity are enforced through PAM, normally with `pam_pwquality` and `/etc/security/pwquality.conf`. You might still see `PASS_MIN_LEN` in older examples or compliance content, but it is not the setting that enforces password length for normal password changes on RHEL 9.

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

The `UMASK` in login.defs is used by `useradd` and `newusers` when creating home directories if `HOME_MODE` is not set, and it can also be used by `pam_umask` as the default login umask.

```bash
# Check the current UMASK setting
grep -E '^UMASK' /etc/login.defs
```

```bash
# Default UMASK value
UMASK           022
```

With `UMASK 022`:
- New files get permissions `644` (rw-r--r--)
- New directories get permissions `755` (rwxr-xr-x)

For tighter security:

```bash
# Restrictive umask - files are owner-only by default
UMASK           077
```

With `UMASK 077`:
- New files get permissions `600` (rw-------)
- New directories get permissions `700` (rwx------)

Note that on RHEL, the umask is also set in `/etc/profile` and `/etc/bashrc`, which may override this value. The `pam_umask` module reads from login.defs and applies it during login.

## CREATE_HOME

This controls whether `useradd` creates a home directory by default.

```bash
# Automatically create home directories for new users
CREATE_HOME     yes
```

On RHEL, this is `yes` by default. If you set it to `no`, you need to pass `-m` to `useradd` to create a home directory. Some environments with centralized home directories (NFS/autofs) set this to `no` since the home directories are managed elsewhere.

## ENCRYPT_METHOD

This setting is often misunderstood. On RHEL 9, user password hashing is handled through PAM/authselect, not directly by `ENCRYPT_METHOD` in `/etc/login.defs`. The `login.defs` setting is still used by some shadow-utils tools for group passwords and batch-style account tools, so it is worth keeping consistent with the system authentication policy.

```bash
# Check the encryption method setting
grep -E '^ENCRYPT_METHOD' /etc/login.defs
```

```bash
# Password hashing algorithm
ENCRYPT_METHOD SHA512
```

RHEL 9 uses SHA-512 for system authentication. The common `login.defs` values are:

| Method | Security | Notes |
|--------|----------|-------|
| DES | Very weak | Legacy, do not use |
| MD5 | Weak | Deprecated |
| SHA256 | Good | Acceptable |
| SHA512 | Good | RHEL default |

For RHEL 9, keep this aligned with SHA-512 unless your authentication stack and support requirements explicitly call for something else.

## USERGROUPS_ENAB

This controls the User Private Group (UPG) scheme.

```bash
# Enable the user private group scheme
USERGROUPS_ENAB yes
```

When set to `yes`:
- Each new user gets their own group with the same name as their username
- `userdel` will also delete the user's private group (if no other users are in it)
- The umask behavior interacts with this (see the UPG blog post for details)

## LOG_UNKFAIL_ENAB

This controls whether unknown usernames are logged on failed login attempts.

```bash
# Log unknown usernames on failed login attempts
LOG_UNKFAIL_ENAB no
```

Setting this to `yes` logs the actual username that was attempted. This is useful for security auditing but can be a privacy concern since users occasionally type their password in the username field.

## Other Useful Settings

```bash
# Number of login retries before giving up
LOGIN_RETRIES   5

# Timeout in seconds for login
LOGIN_TIMEOUT   60

# Log successful logins
LOG_OK_LOGINS   no
```

I recommend setting `LOG_OK_LOGINS` to `yes` on production servers. It gives you an audit trail of who logged in and when.

## Viewing the Effective Configuration

After making changes, verify the active settings:

```bash
# Show all active (non-comment) settings
awk 'NF && $1 !~ /^#/' /etc/login.defs
```

## A Security-Hardened Configuration

Here is what I typically set on production RHEL servers:

```bash
PASS_MAX_DAYS   90
PASS_MIN_DAYS   1
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

`/etc/login.defs` is not glamorous, but getting it right means every new account on your system starts with a reasonable security baseline. Review it when you set up a new server, set the password aging policy your organization requires, choose an appropriate umask, and move on. The few minutes you spend here save you from chasing down per-account settings later. And remember, account-creation defaults only affect new accounts. Use `chage` and `chmod` to bring existing accounts in line.
