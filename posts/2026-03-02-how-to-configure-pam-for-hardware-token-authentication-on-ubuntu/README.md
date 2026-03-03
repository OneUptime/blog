# How to Configure PAM for Hardware Token Authentication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, PAM, Authentication, Hardware Tokens

Description: Configure PAM on Ubuntu to require hardware token authentication for login, sudo, and SSH, covering TOTP, FIDO2, and PKCS11 token types with practical PAM module configurations.

---

PAM (Pluggable Authentication Modules) is the authentication framework on Linux that controls how users prove their identity. By adding hardware token PAM modules to the authentication stack, you can require physical token presence for login, sudo, SSH, and any other PAM-controlled service. This guide covers the main hardware token types and how to configure PAM for each.

## Understanding PAM Stack Order

PAM configuration files live in `/etc/pam.d/`. Each service (sudo, sshd, login, etc.) has its own file. Within each file, module entries have a control flag that determines what happens on success or failure:

- `required` - Must succeed, but all other modules still run. Failure causes authentication to fail.
- `requisite` - Must succeed. If it fails, immediately return failure.
- `sufficient` - If it succeeds (and no previous required has failed), authentication succeeds immediately.
- `optional` - Doesn't affect the overall result.

For adding hardware tokens to an existing password system, the typical patterns are:

```text
# Pattern 1: Password AND token required (two-factor)
auth required pam_unix.so
auth required pam_token.so

# Pattern 2: Token sufficient (token alone works, password as fallback)
auth sufficient pam_token.so
auth required pam_unix.so

# Pattern 3: Either password or token, but token is checked first
auth sufficient pam_token.so
auth required pam_unix.so try_first_pass
```

## Safety Precautions Before Editing PAM

PAM misconfiguration locks you out. Always:

```bash
# Keep a root shell open in a separate terminal
sudo bash

# Test in a non-critical service first (like sudo)
# before touching common-auth or sshd

# Make backups before editing
sudo cp /etc/pam.d/sudo /etc/pam.d/sudo.bak
sudo cp /etc/pam.d/common-auth /etc/pam.d/common-auth.bak
```

## FIDO2/U2F Hardware Tokens

Install and configure `pam_u2f` for FIDO2 keys (YubiKey, Google Titan, Solo, etc.):

```bash
# Install
sudo apt install libpam-u2f pamu2fcfg

# Enroll your key (creates the mapping file)
mkdir -p ~/.config/Yubico
pamu2fcfg > ~/.config/Yubico/u2f_keys

# For multiple keys, append additional keys
pamu2fcfg -n >> ~/.config/Yubico/u2f_keys

# For system-wide central mapping
sudo mkdir -p /etc/u2f-mappings
pamu2fcfg | sudo tee -a /etc/u2f-mappings/u2f_keys
```

Configure PAM for sudo:

```bash
sudo nano /etc/pam.d/sudo
```

```text
# Standard password
@include common-auth

# Add FIDO2 requirement after password (two-factor)
auth required pam_u2f.so authfile=/etc/u2f-mappings/u2f_keys cue
```

The `cue` option shows a message prompting the user to touch the key.

For passwordless login with FIDO2:

```text
# FIDO2 alone is sufficient for sudo
auth sufficient pam_u2f.so authfile=/etc/u2f-mappings/u2f_keys
# Fallback to password if no key
auth required pam_unix.so
```

## TOTP Software Tokens (Google Authenticator)

For TOTP-based two-factor (works with Authy, Google Authenticator, Aegis):

```bash
# Install Google Authenticator PAM module
sudo apt install libpam-google-authenticator

# Set up TOTP for your user
google-authenticator
# Answer the questions:
# - Time-based? YES
# - Update .google_authenticator? YES
# - Disallow reuse? YES
# - Rate limiting? YES
```

This creates `~/.google_authenticator` with the TOTP secret and backup codes.

Configure PAM:

```bash
sudo nano /etc/pam.d/sudo
```

```text
# Require password AND TOTP code
@include common-auth
auth required pam_google_authenticator.so
```

For SSH with TOTP (requires `ChallengeResponseAuthentication yes` in sshd_config):

```bash
sudo nano /etc/pam.d/sshd
```

```text
# Add TOTP to SSH
auth required pam_google_authenticator.so
```

```bash
# Also configure sshd
sudo nano /etc/ssh/sshd_config
```

```text
ChallengeResponseAuthentication yes
AuthenticationMethods publickey,keyboard-interactive
UsePAM yes
```

```bash
sudo systemctl restart sshd
```

## PKCS11 Smart Cards and Tokens

For PIV smart cards, YubiKey PIV, or any PKCS11 token:

```bash
# Install
sudo apt install libpam-pkcs11 opensc

# Configure pam_pkcs11
sudo cp /usr/share/doc/libpam-pkcs11/examples/pam_pkcs11.conf.example \
  /etc/pam_pkcs11/pam_pkcs11.conf

sudo nano /etc/pam_pkcs11/pam_pkcs11.conf
```

Minimum configuration:

```text
# pam_pkcs11.conf
use_pkcs11_module = opensc;

pkcs11_module opensc {
    module = /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so;
    description = "OpenSC PKCS#11 module";
    slot_num = 0;
}

# Map certificate CN to username
use_mappers = cn;
```

Create the subject mapping:

```bash
sudo nano /etc/pam_pkcs11/subject_mapping
```

```text
# Certificate Subject -> Unix username
CN=John Doe, O=Company, C=US -> johndoe
CN=Jane Smith, O=Company, C=US -> janesmith
```

Configure PAM:

```bash
sudo nano /etc/pam.d/sudo
```

```text
# Smart card authentication
auth sufficient pam_pkcs11.so
# Password fallback
auth required pam_unix.so try_first_pass
```

## Combining Multiple Token Types

You might want to support multiple token types. PAM handles this with the `sufficient` control:

```bash
# Support either FIDO2 or smart card, with password fallback
# /etc/pam.d/sudo

# Try FIDO2 first
auth sufficient pam_u2f.so authfile=/etc/u2f-mappings/u2f_keys

# Or try smart card
auth sufficient pam_pkcs11.so

# Fall back to password
auth required pam_unix.so
```

Or for strict two-factor where both password AND token are required:

```bash
# Require password
auth required pam_unix.so

# AND require one of: FIDO2 or smart card
# Using substack to allow either token type
# This requires a sub-configuration
```

## Testing PAM Changes

Test each change carefully:

```bash
# Test sudo PAM (keep root terminal open)
sudo whoami

# Test login PAM (test by SSH as another user, not current session)
ssh testuser@localhost

# Test a specific PAM service
pamtester sudo username authenticate

# Show what PAM modules are loaded for a service
sudo pam_list sudo
```

## Debugging PAM Issues

When authentication fails unexpectedly:

```bash
# Enable PAM debug logging (careful - shows sensitive info)
# Add to the PAM file you're testing:
# auth required pam_debug.so

# Check syslog for PAM messages
sudo journalctl -f | grep -i "pam\|auth"

# Specific service logs
sudo journalctl -u sshd -f

# For GUI login issues
sudo journalctl -u gdm -f

# Verbose u2f debug
auth required pam_u2f.so authfile=/etc/u2f-mappings/u2f_keys debug
```

## System-wide Common Auth

For changes that affect all services, edit `common-auth`:

```bash
sudo nano /etc/pam.d/common-auth
```

The default looks like:

```text
auth [success=1 default=ignore] pam_unix.so nullok_secure
auth requisite pam_deny.so
auth required pam_permit.so
```

The `success=1` means if `pam_unix.so` succeeds, skip the next 1 module (`pam_deny.so`). Understanding this jump logic is key to safely modifying common-auth.

To add FIDO2 as a second factor for everything:

```text
auth [success=1 default=ignore] pam_unix.so nullok_secure
auth requisite pam_deny.so
auth required pam_permit.so
# Add FIDO2 requirement after successful password auth
auth required pam_u2f.so authfile=/etc/u2f-mappings/u2f_keys
```

Test this thoroughly. Adding to common-auth affects every PAM service on the system - getting locked out here means no login, no sudo, no SSH.

Always have a recovery plan: live USB, physical console access, or a separate admin account that uses different auth.
