# How to Configure SSH with Two-Factor Authentication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, 2FA, Security, Linux

Description: Add two-factor authentication to SSH on RHEL using TOTP with the Google Authenticator PAM module, requiring both a key/password and a one-time code.

---

Two-factor authentication (2FA) for SSH means even if an attacker steals a user's password or SSH key, they still cannot get in without the second factor. On RHEL, the most common approach uses TOTP (Time-based One-Time Passwords) through the Google Authenticator PAM module.

## Choosing Your 2FA Method

There are several ways to combine factors:

| Method | Factors | Use Case |
|---|---|---|
| Password + TOTP | Something you know + something you have | Standard 2FA |
| SSH Key + TOTP | Something you have (key) + something you have (phone) | Strong 2FA |
| SSH Key + Password | Something you have + something you know | Simpler 2FA |

## Installing Google Authenticator

```bash
# Enable EPEL repository
sudo dnf install epel-release -y

# Install the PAM module
sudo dnf install google-authenticator -y
```

## Setting Up TOTP for Users

Each user runs the setup interactively:

```bash
# As the user (not root)
google-authenticator -t -d -f -r 3 -R 30 -w 3
```

Flags explained:
- `-t` - Time-based tokens
- `-d` - Disallow token reuse
- `-f` - Force overwrite of existing config
- `-r 3` - Rate limit to 3 login attempts
- `-R 30` - Rate limit window of 30 seconds
- `-w 3` - Allow 3 window codes (1 before and 1 after current)

The output includes a QR code and emergency scratch codes. Users should scan the QR code with their authenticator app.

## Method 1: Password + TOTP

### Configure PAM

```bash
sudo vi /etc/pam.d/sshd
```

Add after the existing auth lines:

```
auth       required     pam_google_authenticator.so nullok
```

### Configure SSH

```bash
sudo vi /etc/ssh/sshd_config.d/30-2fa.conf
```

```
# Enable challenge-response for TOTP prompt
KbdInteractiveAuthentication yes

# Set authentication methods
AuthenticationMethods keyboard-interactive
```

```bash
sudo sshd -t && sudo systemctl restart sshd
```

The user will be prompted for their password, then for the verification code.

## Method 2: SSH Key + TOTP (Recommended)

This is the strongest common configuration.

### Configure PAM

```bash
sudo vi /etc/pam.d/sshd
```

Comment out the password auth substack and add the TOTP module:

```
# auth       substack     password-auth
auth       required     pam_google_authenticator.so nullok
```

### Configure SSH

```bash
sudo vi /etc/ssh/sshd_config.d/30-2fa.conf
```

```
# Require public key first, then TOTP via keyboard-interactive
AuthenticationMethods publickey,keyboard-interactive:pam
KbdInteractiveAuthentication yes
PubkeyAuthentication yes
```

```bash
sudo sshd -t && sudo systemctl restart sshd
```

The login flow: SSH key authentication happens first, then the user is prompted for the TOTP code.

## Method 3: SSH Key + Password

If you prefer password as the second factor instead of TOTP:

```bash
sudo vi /etc/ssh/sshd_config.d/30-2fa.conf
```

```
AuthenticationMethods publickey,keyboard-interactive:pam
KbdInteractiveAuthentication yes
PubkeyAuthentication yes
PasswordAuthentication yes
```

## Handling the Transition Period

Use `nullok` in the PAM configuration during rollout. This allows users who have not set up TOTP yet to log in with just their existing authentication:

```
auth    required    pam_google_authenticator.so nullok
```

Once all users have enrolled, remove `nullok` to enforce 2FA for everyone:

```
auth    required    pam_google_authenticator.so
```

## Exempting Service Accounts

Service accounts and automation should not need TOTP. Use PAM to skip the check:

```bash
sudo vi /etc/pam.d/sshd
```

```
# Skip TOTP for service accounts group
auth    [success=1 default=ignore]    pam_succeed_if.so user ingroup service-accounts
auth    required                       pam_google_authenticator.so
```

## Emergency Access

When a user loses their phone:

### Use scratch codes

Emergency scratch codes were generated during setup. Each code can be used once:

```bash
# View remaining codes (as the user)
tail -5 ~/.google_authenticator
```

### Generate new TOTP setup

```bash
# As the user, re-run the setup
google-authenticator -t -d -f -r 3 -R 30 -w 3
```

### Admin override

An admin can temporarily disable 2FA for a user by removing their config:

```bash
sudo mv /home/username/.google_authenticator /home/username/.google_authenticator.bak
```

## Testing

### Keep an existing session open

Always test from a new terminal:

```bash
# Test SSH with 2FA
ssh user@server
# Enter TOTP code when prompted
```

### Check the logs for issues

```bash
sudo grep -E "google_authenticator|pam_" /var/log/secure | tail -20
```

## Wrapping Up

SSH 2FA on RHEL with Google Authenticator is production-ready and handles most use cases well. The SSH key + TOTP combination is the strongest option for interactive logins. Use `nullok` during the rollout phase, exempt service accounts with PAM rules, and keep emergency scratch codes stored securely. Always test from a separate terminal and keep your current session open until you confirm 2FA is working correctly.
