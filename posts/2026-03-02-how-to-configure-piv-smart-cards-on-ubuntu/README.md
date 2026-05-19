# How to Configure PIV Smart Cards on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Smart Card, PIV, Authentication

Description: Configure PIV-compatible smart cards on Ubuntu for certificate-based authentication, including driver setup, certificate enrollment, PAM configuration, and SSH key extraction.

---

PIV (Personal Identity Verification) smart cards store X.509 certificates and private keys in tamper-resistant hardware. They're widely used in government and enterprise environments for strong authentication. YubiKeys with PIV support, PIV-compatible physical cards, and similar hardware all speak the PIV standard. Ubuntu has solid support for PIV through the PCSC (PC/SC) subsystem and OpenSC.

## Hardware Requirements

You need:
- A PIV-compatible device (YubiKey 5, Gemalto card, SafeNet token, etc.)
- A card reader if using a physical smart card (USB smart card readers work out of the box on most systems)

## Install Required Software

```bash
# Install PC/SC daemon and tools

sudo apt update
sudo apt install pcscd pcsc-tools

# Install OpenSC for PIV card management
sudo apt install opensc opensc-pkcs11

# For YubiKey PIV
sudo apt install yubikey-manager

# For certificate-based authentication via PAM
sudo apt install libpam-pkcs11

# Start and enable the PC/SC daemon
sudo systemctl enable pcscd
sudo systemctl start pcscd
```

## Verify the Card is Detected

```bash
# List connected readers and cards
pcsc_scan

# Should show something like:
# PC/SC device scanner
# Waiting for the first reader... found one
# Trying to connect to YubiKey FIDO+CCID 0
# ...

# Also check via OpenSC
opensc-tool -l

# Or with pkcs11-tool
pkcs11-tool --module /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so --list-slots
```

If `pcsc_scan` hangs without showing a card, check that pcscd is running:

```bash
sudo systemctl status pcscd
sudo journalctl -u pcscd -n 20
```

## Checking PIV Card Contents

```bash
# List objects on the card (certificates, keys)
pkcs11-tool --module /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so \
  --list-objects --login

# List slots
pkcs11-tool --module /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so \
  --list-slots

# For YubiKey PIV specifically
ykman piv info

# Export a certificate from a specific YubiKey PIV slot
ykman piv certificates export 9a - | openssl x509 -noout -subject -issuer
```

## Generating Keys on the PIV Card

If the card doesn't have keys yet, generate them on the device (private key never leaves the hardware):

```bash
# Generate a key in PIV slot 9a (Authentication slot)
# Using YubiKey
ykman piv keys generate --algorithm RSA2048 9a public_key.pem

# Or with pkcs11-tool
pkcs11-tool --module /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so \
  --login \
  --keypairgen \
  --key-type RSA:2048 \
  --id 01 \
  --label "Authentication Key"
```

PIV slots have defined purposes:
- `9a` - PIV Authentication (login)
- `9c` - Digital Signature
- `9d` - Key Management
- `9e` - Card Authentication (no PIN required)

## Generating or Importing a Certificate

After generating a key, you need a certificate. For self-signed testing:

```bash
# Generate a self-signed certificate for the key
ykman piv certificates generate \
  --subject "CN=John Doe,OU=IT,O=Company,C=US" \
  9a public_key.pem

# Import an existing certificate (from a CA)
ykman piv certificates import 9a certificate.pem

# View the certificate
ykman piv certificates export 9a - | openssl x509 -text -noout
```

## Configure PAM for Smart Card Login

Install and configure libpam-pkcs11:

```bash
sudo apt install libpam-pkcs11

# Set up the PAM PKCS11 configuration
sudo cp /usr/share/doc/libpam-pkcs11/examples/pam_pkcs11.conf.example \
  /etc/pam_pkcs11/pam_pkcs11.conf

sudo nano /etc/pam_pkcs11/pam_pkcs11.conf
```

Key configuration in `pam_pkcs11.conf`:

```text
# Specify the PKCS11 module to use
use_pkcs11_module = opensc;

pkcs11_module opensc {
    module = /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so;
    description = "OpenSC PKCS#11 module";
    slot_num = 0;
}

# Certificate-to-user mapping method
use_mappers = subject;

mapper subject {
    module = internal;
    ignorecase = false;
    mapfile = file:///etc/pam_pkcs11/subject_mapping;
}
```

Configure the mapper:

```bash
# Create the certificate subject mapping file
sudo nano /etc/pam_pkcs11/subject_mapping
```

Add a line mapping the certificate subject to your username:

```text
# Format: certificate subject -> unix username
CN=John Doe, OU=IT, O=Company, C=US -> johndoe
```

Or use digest mapping:

```bash
# Temporarily enable the digest mapper, then print certificate fields
pkcs11_inspect config_file=/etc/pam_pkcs11/pam_pkcs11.conf

# Copy the digest output to /etc/pam_pkcs11/digest_mapping
# when the digest mapper is enabled
```

## Add Smart Card to PAM

**Keep a root terminal open before editing PAM:**

```bash
# Edit sudo PAM for initial testing
sudo nano /etc/pam.d/sudo
```

Add:

```text
# Add before @include common-auth
auth sufficient pam_pkcs11.so
```

Test with sudo in a new terminal - it should ask for your PIN instead of password.

For login:

```bash
sudo nano /etc/pam.d/common-auth
```

```text
# Add before the existing pam_unix entry so smart card OR password works
auth sufficient pam_pkcs11.so
```

## SSH with PIV Smart Cards

Use the certificate on the PIV card for SSH authentication:

```bash
# Method 1: Extract the public key from the PKCS11 module
ssh-keygen -D /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so

# Copy the output to authorized_keys on the server
ssh-keygen -D /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so | \
  ssh user@remote-server "cat >> ~/.ssh/authorized_keys"

# Connect using the smart card
ssh -I /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so user@remote-server
```

To make this permanent, configure SSH to always use the smart card:

```bash
# Add to ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'
Host *
  PKCS11Provider /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so
EOF
```

Now regular `ssh user@host` will offer the smart card key.

## PIN Management

PIV cards use PINs rather than passwords. Manage them with:

```bash
# Change PIN
ykman piv access change-pin

# Set PUK (PIN Unblocking Key)
ykman piv access change-puk

# Set management key (used for administrative operations)
ykman piv access change-management-key

# If PIN is blocked (too many wrong attempts), unblock with PUK
ykman piv access unblock-pin
```

## Troubleshooting

```bash
# Smart-card event manager debug output
sudo pkcs11_eventmgr debug nodaemon &

# Check if PKCS11 module sees the card
pkcs11-tool --module /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so \
  --show-info

# Test certificate match
pkcs11_inspect

# View PAM errors
sudo journalctl -f | grep -i "pam\|pkcs11"

# Test PIN with pkcs11-tool
pkcs11-tool --module /usr/lib/x86_64-linux-gnu/opensc-pkcs11.so \
  --login --test
```

PIV smart card authentication provides strong security because private keys never leave the hardware. Even if an attacker gets access to your workstation, they can't authenticate without the physical card and its PIN.
