# How to Set Up FIDO2 Security Keys for Login on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, FIDO2, Authentication, PAM

Description: Configure FIDO2 hardware security keys for user login on Ubuntu, covering PAM setup, SSH authentication, sudo, and system login using YubiKey and compatible devices.

---

FIDO2 hardware security keys provide strong two-factor or passwordless authentication. They're phishing-resistant because the key performs a cryptographic handshake that's tied to the specific origin, making the credentials useless on fake sites. Ubuntu supports FIDO2 keys through PAM (Pluggable Authentication Modules) and through OpenSSH's native support.

## FIDO2 Key Compatibility

Any FIDO2-compliant key works. Common options:
- YubiKey 5 series (USB-A, USB-C, NFC)
- Google Titan Security Key
- Solo 2 (open source)
- Nitrokey FIDO2

The key needs to support FIDO2/WebAuthn. Keys that only support FIDO U2F (older standard) work for two-factor but not passwordless.

## Installing Required Packages

```bash
# Install libpam-u2f for PAM integration
sudo apt update
sudo apt install libpam-u2f

# Install pamu2fcfg tool for enrollment
sudo apt install pamu2fcfg

# For YubiKey management
sudo apt install yubikey-manager

# Optional: GUI tool for YubiKey
sudo apt install yubikey-personalization-gui
```

## Setting Up udev Rules

By default, FIDO2 keys may not be accessible without root. Add udev rules:

```bash
# For YubiKey (if not automatically detected)
# Most modern Ubuntu versions have these rules already

# Check if your key is detected
lsusb | grep Yubico

# If not accessible, add rules
# YubiKey udev rules (adjust vendor/product IDs for your key)
cat /lib/udev/rules.d/70-u2f.rules | head -20

# Or install the comprehensive udev rules
sudo apt install libu2f-udev

# After installing, replug the key
```

## Enrolling Your FIDO2 Key

The enrollment creates a mapping between your user account and the key's credential:

```bash
# Create the u2f authentication directory
mkdir -p ~/.config/Yubico

# Enroll the key (you'll need to touch the key when prompted)
pamu2fcfg > ~/.config/Yubico/u2f_keys

# If you have multiple keys, add the second as backup
pamu2fcfg -n >> ~/.config/Yubico/u2f_keys

# View the enrollment file
cat ~/.config/Yubico/u2f_keys
```

The enrollment file contains your username and the key's public credential data. It looks like:

```text
username:credential_id,public_key,options
```

For system-wide (all users) enrollment, store in a centralized location:

```bash
# System-wide file (requires root)
sudo mkdir -p /etc/u2f-mappings

# Enroll for a specific user
sudo -u username pamu2fcfg | sudo tee /etc/u2f-mappings/u2f_keys

# Or create a combined file with multiple users
sudo pamu2fcfg -u username >> /etc/u2f-mappings/u2f_keys
```

## Configure PAM for Two-Factor Authentication

For two-factor authentication (password + key), edit the PAM configuration. The safest approach is to test in a separate terminal with root access open before logging out.

**Important**: Keep a root terminal open while making these changes to recover if something goes wrong.

```bash
# First, open a backup root terminal
sudo bash

# Do NOT close this until you've confirmed everything works
```

Configure PAM for sudo (a good starting point):

```bash
# Edit sudo PAM configuration
sudo nano /etc/pam.d/sudo
```

Add this line after the first `@include` or at the top of auth section:

```text
# Two-factor: require key touch after password
auth required pam_u2f.so authfile=/etc/u2f-mappings/u2f_keys
```

Or for your home directory enrollment:

```text
auth required pam_u2f.so authfile=/home/USERNAME/.config/Yubico/u2f_keys
```

Test immediately (in a new terminal, not the backup root one):

```bash
sudo whoami
# Should prompt for password, then require a key touch
```

## Configure PAM for System Login

For console and display manager login:

```bash
# Edit common authentication
sudo nano /etc/pam.d/common-auth
```

Add the u2f line. For two-factor (password AND key):

```text
# Add after the existing auth line
auth required pam_u2f.so authfile=/etc/security/u2f_keys
```

For optional key (password OR key, key preferred):

```text
auth sufficient pam_u2f.so authfile=/etc/security/u2f_keys
auth required pam_unix.so try_first_pass
```

For two-factor where key is required in addition to password:

```text
auth required pam_unix.so
auth required pam_u2f.so authfile=/etc/security/u2f_keys
```

## Configure PAM for SSH Password Login

For SSH sessions using password authentication + key:

```bash
sudo nano /etc/pam.d/sshd
```

Add:

```text
auth required pam_u2f.so authfile=/etc/security/u2f_keys
```

Also ensure SSH is configured for PAM:

```bash
sudo nano /etc/ssh/sshd_config
```

```text
UsePAM yes
ChallengeResponseAuthentication yes
# For keyboard-interactive (needed for FIDO2 PAM)
AuthenticationMethods keyboard-interactive
```

```bash
sudo systemctl restart sshd
```

## FIDO2 Keys for SSH Public Key Authentication

OpenSSH supports FIDO2 natively for SSH key pairs - the private key is stored on the hardware key:

```bash
# Generate an SSH key backed by FIDO2 hardware key
ssh-keygen -t ed25519-sk -C "yubikey-ssh"

# If the above doesn't work (older OpenSSH), try:
ssh-keygen -t ecdsa-sk -C "yubikey-ssh"
```

You'll need to touch the key during generation. This creates:
- `~/.ssh/id_ed25519_sk` - the key handle (useless without the hardware)
- `~/.ssh/id_ed25519_sk.pub` - the public key

Copy the public key to remote servers as normal:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519_sk.pub user@remote-server
```

When connecting, SSH will prompt you to touch the key:

```bash
ssh user@remote-server
# Confirm user presence for key ...
# [touch the key]
```

This provides hardware-backed SSH authentication where the private key never leaves the physical device.

## Discoverable Credentials (Resident Keys)

For passwordless login, use discoverable credentials that are stored on the key itself:

```bash
# Generate a resident key (stored on the hardware)
ssh-keygen -t ed25519-sk -O resident -C "my-resident-key"

# Load resident keys from the hardware
ssh-add -K

# List keys on the YubiKey
ssh-keygen -K
```

## Troubleshooting

```bash
# Check if the key is detected
lsusb | grep -i yubico

# Test pamu2fcfg enrollment
pamu2fcfg -1

# Debug PAM authentication
sudo pam_u2f --debug --authfile=/etc/security/u2f_keys

# Check syslog for PAM errors
sudo journalctl -u sshd -f

# Verify the enrollment file format
cat /etc/security/u2f_keys
# Should be: username:keyhandle,public_key,options
```

## Backup Keys

Always enroll at least two keys. If you lose your only key, you're locked out:

```bash
# Enroll primary key
pamu2fcfg > ~/.config/Yubico/u2f_keys

# Enroll backup key (append with -n flag)
pamu2fcfg -n >> ~/.config/Yubico/u2f_keys

# Verify both are enrolled
cat ~/.config/Yubico/u2f_keys
# Should show two entries for your username
```

Store the backup key somewhere safe - a safe, a lockbox, with a trusted person. The investment in proper hardware key authentication pays off significantly in account security.
