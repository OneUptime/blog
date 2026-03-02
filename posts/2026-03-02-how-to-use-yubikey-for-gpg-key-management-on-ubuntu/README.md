# How to Use YubiKey for GPG Key Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, YubiKey, GPG, Cryptography

Description: Set up a YubiKey as a GPG smartcard on Ubuntu for secure key storage, signing, encryption, and SSH authentication with hardware-protected private keys.

---

Storing GPG private keys on a YubiKey means the keys never touch your disk in usable form. Signing, encryption, and decryption operations happen on the YubiKey itself, and the private key cannot be extracted even if your computer is compromised. This guide covers setting up GPG with a YubiKey on Ubuntu, including SSH authentication using the GPG agent.

## Required Packages

```bash
sudo apt update
sudo apt install gnupg2 gnupg-agent scdaemon pcscd pcsc-tools

# For YubiKey-specific management
sudo apt install yubikey-manager

# Verify GPG version (2.1+ required for smartcard support)
gpg --version
```

## Verify YubiKey is Detected

```bash
# Start and enable pcscd
sudo systemctl enable pcscd
sudo systemctl start pcscd

# List readers
pcsc_scan

# Check GPG sees the card
gpg --card-status
```

The `gpg --card-status` output shows the YubiKey's slots and any keys already loaded.

## Generating GPG Keys

You can either generate keys directly on the YubiKey (most secure, keys never leave hardware) or generate on the computer and transfer to the YubiKey.

### Option A: Generate Keys Directly on YubiKey

```bash
# Enter GPG card administration
gpg --card-edit

# At the gpg/card> prompt:
gpg/card> admin
gpg/card> generate
```

GPG will guide you through generating keys on the card. Key type choices depend on your YubiKey firmware version. ed25519 and RSA4096 are common options.

### Option B: Generate on Computer, Transfer to YubiKey

This approach lets you keep backup copies of the key material:

```bash
# Generate a master key (certification only)
gpg --full-gen-key

# Select: (1) RSA and RSA or (9) ECC and ECC
# Choose 4096 bits for RSA or curve 25519 for ECC
# Set expiry (1-2 years recommended)
# Enter your name and email
```

After creating the master key, add subkeys for signing, encryption, and authentication:

```bash
# Get your key ID
gpg --list-secret-keys --keyid-format=long

# Edit the key to add subkeys
gpg --expert --edit-key YOUR_KEY_ID

# At gpg> prompt:
gpg> addkey
# Select (4) RSA (sign only) - for signing subkey
# Select key size and expiry
# Repeat for encryption and authentication subkeys

gpg> save
```

Export and backup before moving to YubiKey:

```bash
# Backup master key and subkeys
gpg --export-secret-keys --armor YOUR_KEY_ID > master-key-backup.asc
gpg --export-secret-subkeys --armor YOUR_KEY_ID > subkeys-backup.asc

# Store backups securely offline
```

Transfer subkeys to YubiKey:

```bash
gpg --edit-key YOUR_KEY_ID

# Select the first subkey
gpg> key 1
gpg> keytocard
# Select slot: (1) Signature key
gpg> key 1    # deselect
gpg> key 2
gpg> keytocard
# Select slot: (2) Encryption key
gpg> key 2
gpg> key 3
gpg> keytocard
# Select slot: (3) Authentication key
gpg> save
```

## Verifying Keys Are on YubiKey

```bash
# Check card status - should show fingerprints in all slots
gpg --card-status

# List local keys - subkeys on card show with '>' symbol
gpg --list-secret-keys --keyid-format=long
# sec#  indicates master key is NOT on this machine (good, it's backed up offline)
# ssb>  indicates subkey is on the YubiKey
```

## Setting YubiKey PIN and Admin PIN

The YubiKey GPG applet uses two PINs:
- **PIN**: Used for daily operations (signing, decryption)
- **Admin PIN**: Used for administrative changes

Default PINs are `123456` (PIN) and `12345678` (Admin PIN). Change them immediately:

```bash
gpg --card-edit
gpg/card> admin
gpg/card> passwd

# Select (1) change PIN - change from 123456
# Select (3) change Admin PIN - change from 12345678
# Select (Q) quit
```

The PIN locks after 3 wrong attempts. The Admin PIN locks after 3 wrong attempts and requires factory reset to recover.

## Signing and Encryption Operations

With keys on the YubiKey, GPG operations work normally but require physical touch or PIN:

```bash
# Sign a file (YubiKey prompts for touch if configured)
gpg --armor --detach-sign document.txt

# Encrypt a file
gpg --armor --encrypt --recipient recipient@email.com document.txt

# Decrypt a file (requires PIN)
gpg --decrypt document.txt.asc

# Sign and encrypt
gpg --armor --sign --encrypt --recipient recipient@email.com document.txt
```

## SSH Authentication via GPG Agent

GPG can act as an SSH agent, using the Authentication subkey on the YubiKey for SSH:

```bash
# Configure GPG agent to support SSH
echo "enable-ssh-support" >> ~/.gnupg/gpg-agent.conf

# Get the authentication subkey's keygrip
gpg --with-keygrip --list-secret-keys YOUR_KEY_ID

# Add the authentication subkey's keygrip to sshcontrol
# (find the keygrip for the [A] authentication key)
echo "KEYGRIP_HERE" >> ~/.gnupg/sshcontrol

# Configure SSH to use GPG agent
# Add to ~/.bashrc or ~/.zshrc
export SSH_AUTH_SOCK=$(gpgconf --list-dirs agent-ssh-socket)
gpgconf --launch gpg-agent
```

Make it persistent across sessions:

```bash
# Add to ~/.profile or ~/.bash_profile
cat >> ~/.profile << 'EOF'
# GPG agent for SSH
export GPG_TTY=$(tty)
export SSH_AUTH_SOCK=$(gpgconf --list-dirs agent-ssh-socket)
gpgconf --launch gpg-agent
EOF
```

Get your SSH public key:

```bash
# Export the SSH public key from GPG
ssh-add -L

# Copy to remote servers
ssh-add -L | ssh user@remote-server "cat >> ~/.ssh/authorized_keys"
```

Now SSH connections use the YubiKey for authentication.

## Configuring Touch Policy

Require a physical touch for every operation (prevents malware from using the key while it's plugged in):

```bash
# Set touch required for signature operations
ykman openpgp keys set-touch sig on

# Set touch required for encryption
ykman openpgp keys set-touch enc on

# Set touch required for authentication (SSH)
ykman openpgp keys set-touch aut on

# Verify touch policies
ykman openpgp info
```

With touch enabled, every GPG or SSH operation requires physical key touch within a few seconds, which prevents remote exploitation.

## Setting Up on Multiple Machines

Move the YubiKey to a new machine and import the public key:

```bash
# On new machine, import public key
gpg --recv-keys YOUR_KEY_ID

# Or import from file
gpg --import public-key.asc

# Plug in YubiKey and verify it's recognized
gpg --card-status

# GPG will automatically link the card's keys to the imported public key
# Verify
gpg --list-secret-keys YOUR_KEY_ID
# Should show ssb> for card keys
```

## Troubleshooting

```bash
# GPG can't see the card
sudo systemctl restart pcscd
gpg --card-status

# Kill and restart GPG agent
gpgconf --kill gpg-agent
gpgconf --launch gpg-agent

# Permission issues with the reader
ls -la /dev/bus/usb/
# Add udev rules if needed for your card reader

# SSH not using GPG agent
echo $SSH_AUTH_SOCK   # should point to gpg-agent socket
ssh-add -L            # should list your key

# Reset connection if card gets stuck
gpg-connect-agent "scd reset" /bye
```

Using GPG with YubiKey hardware storage is one of the most effective ways to protect signing keys. Even if your laptop is stolen or compromised remotely, the private keys remain on the hardware token and require both physical possession and a PIN to use.
