# How to Configure Password Complexity Rules with PAM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, PAM, Authentication, Hardening

Description: Step-by-step guide to configuring password complexity requirements on Ubuntu using PAM and the pwquality module, including minimum length, character classes, and history enforcement.

---

Weak passwords remain one of the most common entry points for unauthorized access. Ubuntu uses the Pluggable Authentication Modules (PAM) framework to handle authentication, and the `pam_pwquality` module gives administrators fine-grained control over what passwords users can set. Properly configured, it rejects passwords that are too short, lack complexity, or have been used recently.

## Understanding PAM and pam_pwquality

PAM is a framework that allows system administrators to configure authentication without modifying individual applications. Each application that uses PAM reads its configuration from `/etc/pam.d/`. When a user changes their password, PAM calls the configured modules in sequence.

The `pam_pwquality` module replaced the older `pam_cracklib` module in modern Ubuntu releases. It enforces rules at password-change time, not at login - meaning it cannot prevent someone from using a weak password set by root directly, only passwords changed through the PAM interface (passwd, chpasswd, etc.).

## Installing pam_pwquality

On Ubuntu 20.04 and later, `libpam-pwquality` is usually already installed:

```bash
# Check if the package is installed
dpkg -l libpam-pwquality

# Install if not present
sudo apt-get update
sudo apt-get install -y libpam-pwquality
```

## PAM Configuration Files

Password policy configuration lives in two places:

- `/etc/pam.d/common-password` - the PAM stack that applies to all password changes
- `/etc/security/pwquality.conf` - the primary configuration file for pwquality parameters

It is better practice to configure rules in `/etc/security/pwquality.conf` and keep the PAM line simple rather than putting all options inline in the PAM file.

## Configuring pwquality.conf

The main configuration file controls all complexity rules:

```bash
sudo cp /etc/security/pwquality.conf /etc/security/pwquality.conf.bak
sudo nano /etc/security/pwquality.conf
```

A strong but practical configuration:

```ini
# /etc/security/pwquality.conf

# Minimum password length (14 characters is a common enterprise baseline)
minlen = 14

# Minimum number of character classes required (lowercase, uppercase, digits, special)
# A value of 3 means at least 3 different classes must be present
minclass = 3

# Maximum credit for uppercase letters
# Negative value means this many uppercase chars are REQUIRED
ucredit = -1

# Maximum credit for lowercase letters
lcredit = -1

# Maximum credit for digits
dcredit = -1

# Maximum credit for other characters (special characters)
ocredit = -1

# Reject passwords containing the user's account name
usercheck = 1

# Reject passwords similar to old password (0 disables, higher = stricter)
difok = 5

# Maximum consecutive repeated characters allowed
maxrepeat = 3

# Maximum consecutive characters from same character class
maxclassrepeat = 4

# Check the password against a dictionary of common words
dictcheck = 1

# Reject passwords containing words 3 or more characters long from the user's GECOS field
gecoscheck = 1

# Number of attempts before returning an error
retry = 3

# Enforce rules even for root (0 = root can bypass, 1 = root must comply)
enforce_for_root = 1
```

## Configuring the PAM Stack

The `/etc/pam.d/common-password` file controls the password change flow. Back it up before editing:

```bash
sudo cp /etc/pam.d/common-password /etc/pam.d/common-password.bak
```

View the current configuration:

```bash
cat /etc/pam.d/common-password
```

Locate the line containing `pam_pwquality.so`. It should look similar to:

```text
password  requisite  pam_pwquality.so retry=3
```

The `requisite` control flag means if this module fails, the password change is rejected immediately without trying further modules. Change it to include retry and ensure pwquality is invoked:

```text
password  requisite  pam_pwquality.so retry=3 local_users_only
```

The `local_users_only` option skips the check for non-local users (like LDAP accounts), which is often desirable.

## Password History Enforcement

To prevent users from cycling back to old passwords, use `pam_pwhistory`:

```bash
sudo nano /etc/pam.d/common-password
```

Add the history module before the password update module:

```text
# Enforce password quality requirements
password  requisite   pam_pwquality.so retry=3 local_users_only

# Remember the last 12 passwords and prevent reuse
password  required    pam_pwhistory.so remember=12 use_authok enforce_for_root

# Write the new password to the shadow file
password  [success=1 default=ignore]  pam_unix.so obscure use_authtok \
          try_first_pass yescrypt
```

The password history is stored in `/etc/security/opasswd`. Each line contains the username and a list of hashed previous passwords.

## Password Expiration Policies

Complement complexity rules with expiration using `chage`:

```bash
# Set password to expire every 90 days, warn 14 days before, with 7-day grace period
sudo chage -M 90 -W 14 -I 7 username

# Set minimum days between password changes (prevents cycling through passwords quickly)
sudo chage -m 1 username

# View the current expiration settings for a user
sudo chage -l username

# Set a policy for all future accounts by editing /etc/login.defs
sudo nano /etc/login.defs
```

Key settings in `/etc/login.defs`:

```ini
# /etc/login.defs - affects new accounts created with useradd

PASS_MAX_DAYS   90      # Maximum password age in days
PASS_MIN_DAYS   1       # Minimum days between changes
PASS_WARN_AGE   14      # Days before expiry to warn user
PASS_MIN_LEN    14      # Minimum length (backup for PAM)
```

Note: `PASS_MIN_LEN` in `login.defs` is independent of PAM's `minlen`. Both should be set consistently.

## Testing the Configuration

Test that the policy works correctly before locking yourself out:

```bash
# Test as a regular user
passwd

# Try a simple password - should be rejected
# New password: password123
# BAD PASSWORD: The password fails the dictionary check

# Try a password without special characters
# New password: AbcdefghijKlmn
# BAD PASSWORD: The password must contain at least 1 other character

# A compliant password should succeed
# New password: C0mpl3x!P@ssw0rd
```

As root, you can test password strength without actually changing a password:

```bash
# Check password quality for a specific user
echo "TestPassword123!" | pwscore

# Output shows score out of 100
# Higher is better
```

## Applying to SSH and Other Services

For SSH logins, password complexity only matters if password authentication is enabled. However, the rules apply when setting passwords regardless. To check PAM is used for SSH when PasswordAuthentication is on:

```bash
grep UsePAM /etc/ssh/sshd_config
# Should show: UsePAM yes
```

## Verifying the Configuration

```bash
# Test password change as a non-privileged user
su - testuser
passwd

# Check that weak passwords are rejected with meaningful error messages
```

Review the PAM configuration to ensure modules are in the correct order:

```bash
# View the effective password PAM stack
cat /etc/pam.d/common-password

# Check pwquality configuration
sudo cat /etc/security/pwquality.conf
```

## Common Mistakes

**Setting enforce_for_root=0**: Root can then bypass complexity rules, which is a security gap especially on shared systems.

**Not setting difok**: Without it, users can change their password to something that differs by only one character from their old password.

**Setting minlen too low**: The NIST guidelines (SP 800-63B) now recommend length over complexity. A minimum of 12-14 characters is more effective than complex 8-character passwords.

**Forgetting pam_pwhistory**: Without password history, users often toggle between two passwords to satisfy the complexity requirement while effectively keeping the same password.

Configuring PAM password complexity is one of the most direct steps you can take to raise the baseline security of local accounts on Ubuntu systems.
