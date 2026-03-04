# How to Configure Minimum Password Length and Character Requirements on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Password Policy, Security, Linux

Description: Configure minimum password length and character class requirements on RHEL 9 using pam_pwquality and login.defs for a robust password policy.

---

Setting the right minimum password length is one of the simplest and most effective things you can do for system security. RHEL 9 gives you two places to configure this: `pam_pwquality` for quality enforcement during password changes, and `/etc/login.defs` for system-wide defaults. Getting both aligned is important.

## Where Password Length Is Configured

There are two separate mechanisms, and they serve different purposes:

```mermaid
graph TD
    A[Password Policy] --> B[/etc/security/pwquality.conf]
    A --> C[/etc/login.defs]
    B --> D[Checked during passwd command]
    C --> E[Default for useradd]
    C --> F[Checked by some applications]
```

- `/etc/security/pwquality.conf` - Enforced by PAM when users change passwords.
- `/etc/login.defs` - Provides system defaults used by `useradd` and `passwd`.

You should configure both to be consistent.

## Setting Minimum Length in pwquality.conf

```bash
sudo vi /etc/security/pwquality.conf
```

The `minlen` parameter controls the minimum length:

```
# Minimum acceptable password length
minlen = 14
```

### How minlen interacts with credits

If you use positive credit values, the effective minimum length can be lower than `minlen`. For example:

```
minlen = 14
dcredit = 1
ucredit = 1
lcredit = 1
ocredit = 1
```

With these settings, a password with one character from each class gets +4 credits, so the actual minimum number of characters required is 14 - 4 = 10.

To avoid this confusion, use negative credit values or set credits to 0:

```
# Strict minimum length of 14 characters, no credits
minlen = 14
dcredit = 0
ucredit = 0
lcredit = 0
ocredit = 0
```

With negative credits, the length requirement stays firm:

```
# Require 14 characters AND at least one of each type
minlen = 14
dcredit = -1
ucredit = -1
lcredit = -1
ocredit = -1
```

## Setting Minimum Length in login.defs

```bash
sudo vi /etc/login.defs
```

Find and update the `PASS_MIN_LEN` setting:

```
# Minimum password length
PASS_MIN_LEN    14
```

While you are editing login.defs, also check these related settings:

```
# Minimum number of days between password changes
PASS_MIN_DAYS   1

# Maximum number of days a password is valid
PASS_MAX_DAYS   90

# Number of days before expiration to warn the user
PASS_WARN_AGE   14

# Encryption algorithm for passwords
ENCRYPT_METHOD SHA512
```

## Configuring Character Class Requirements

### Require specific character types

In `/etc/security/pwquality.conf`:

```
# Require at least 1 digit
dcredit = -1

# Require at least 1 uppercase letter
ucredit = -1

# Require at least 1 lowercase letter
lcredit = -1

# Require at least 1 special character
ocredit = -1
```

### Require a minimum number of character classes

Instead of requiring specific types, you can require a minimum number of different classes:

```
# Require characters from at least 3 of 4 classes
minclass = 3
```

This is more flexible for users, as they can choose which three classes to include.

### Limit consecutive repeated characters

```
# No more than 3 consecutive identical characters
maxrepeat = 3

# No more than 4 consecutive characters from the same class
maxclassrepeat = 4
```

## Verifying Your Configuration

### Test with pwscore

```bash
# Test a short password (should fail)
echo "short" | pwscore

# Test a password that meets requirements
echo "MyStr0ng!Pass2026" | pwscore
```

### Test with an actual user account

```bash
# Create a test user
sudo useradd testpolicy

# Try setting a weak password (should be rejected)
sudo passwd testpolicy
# Enter: abc123

# Try setting a compliant password (should succeed)
sudo passwd testpolicy
# Enter: C0mpl3x!Pass#2026
```

### Check effective settings

```bash
# View the compiled pwquality configuration
grep -v "^#" /etc/security/pwquality.conf | grep -v "^$"
```

## Applying Different Policies to Different Users

You might want different password requirements for admin users versus regular users. While pam_pwquality does not directly support per-user policies, you can achieve this with PAM stacking:

```bash
sudo vi /etc/pam.d/system-auth
```

Use `pam_succeed_if` to branch based on group membership:

```
# For admin users, use stricter requirements
password    [success=1 default=ignore]    pam_succeed_if.so user notingroup admins
password    requisite     pam_pwquality.so retry=3 minlen=20 minclass=4

# For regular users, use standard requirements
password    requisite     pam_pwquality.so retry=3 minlen=14 minclass=3
```

## Common Policy Configurations

### Strong policy for internet-facing servers

```
minlen = 16
minclass = 4
dcredit = -1
ucredit = -1
lcredit = -1
ocredit = -1
maxrepeat = 2
dictcheck = 1
usercheck = 1
enforce_for_root
```

### NIST-aligned policy (length over complexity)

Modern NIST guidelines emphasize length over character complexity:

```
minlen = 15
minclass = 0
dcredit = 0
ucredit = 0
lcredit = 0
ocredit = 0
dictcheck = 1
usercheck = 1
```

### Moderate policy for internal workstations

```
minlen = 12
minclass = 3
maxrepeat = 3
dictcheck = 1
```

## Communicating Password Requirements to Users

When users try to change their password and it fails, pam_pwquality provides error messages. You can customize the number of retries:

```
# Allow 3 attempts to set a compliant password
retry = 3
```

The error messages are descriptive, telling the user exactly why their password was rejected:

```
BAD PASSWORD: The password is shorter than 14 characters
BAD PASSWORD: The password contains less than 1 uppercase letters
BAD PASSWORD: The password fails the dictionary check
```

## Troubleshooting

### passwd command does not enforce the new policy

```bash
# Verify pam_pwquality is in the PAM stack
grep pam_pwquality /etc/pam.d/system-auth

# Check that the config file syntax is correct
grep -n "." /etc/security/pwquality.conf | grep -v "^.*:#"
```

### Root can bypass the policy

By default, root is exempt. Add `enforce_for_root` to the config file to change this:

```
enforce_for_root
```

### Settings appear ignored

Check if options are being overridden on the PAM line. Options specified directly on the `pam_pwquality.so` line in the PAM stack take precedence over the config file.

## Wrapping Up

A good password length and complexity policy balances security with usability. Set `minlen` in both `/etc/security/pwquality.conf` and `/etc/login.defs` to keep things consistent. Use negative credit values when you need to require specific character types, and use `minclass` for a more flexible approach. Test your policy with `pwscore` before rolling it out, and remember that modern security guidance increasingly favors longer passwords over complex character requirements.
