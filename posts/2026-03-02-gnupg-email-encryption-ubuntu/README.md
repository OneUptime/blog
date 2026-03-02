# How to Use GnuPG for Email Encryption on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, GnuPG, Email

Description: Step-by-step guide to setting up GnuPG on Ubuntu for encrypting and signing email, including key generation, exchange, and mail client integration.

---

GnuPG (GNU Privacy Guard) implements the OpenPGP standard for asymmetric encryption, letting you encrypt messages so only the intended recipient can read them, and sign messages to prove they came from you. It has been the standard tool for email encryption on Linux for decades.

This guide covers the complete workflow: generating keys, exchanging them with others, encrypting and decrypting messages from the command line, and integrating with mail clients like Thunderbird.

## How PGP Encryption Works

PGP uses a key pair: a public key you share with anyone, and a private key you keep secret. When someone wants to send you an encrypted message, they encrypt it with your public key. Only your private key can decrypt it. When you sign a message, you use your private key to create the signature, and anyone with your public key can verify it came from you.

## Installing GnuPG

Ubuntu ships with GnuPG, but it is worth confirming you have a current version:

```bash
# Check if GPG is installed
gpg --version

# Install if missing, or update
sudo apt update
sudo apt install -y gnupg2

# On Ubuntu 22.04+, gpg2 is the default
which gpg
```

## Generating Your Key Pair

```bash
# Generate a new key pair with guided prompts
gpg --full-generate-key
```

You will be asked several questions:

- Key type: Choose RSA and RSA (option 1) or Ed25519 for modern elliptic-curve keys
- Key size: 4096 bits for RSA is a solid choice
- Expiration: Setting an expiration (1-2 years) is good practice - you can always extend it later
- Name and email: Use your real name and the email address you will use for encrypted communication
- Passphrase: Use a strong passphrase to protect your private key

```bash
# For a quick modern key with good defaults
gpg --quick-generate-key "Your Name <your@email.com>" ed25519 cert 2y
gpg --quick-add-key <FINGERPRINT> cv25519 encr 2y
```

The second command adds a separate encryption subkey, which is the recommended setup.

## Listing and Examining Keys

```bash
# List your public keys
gpg --list-keys

# List with fingerprints (useful for verification)
gpg --list-keys --fingerprint

# List your secret keys
gpg --list-secret-keys

# Show a specific key
gpg --list-keys your@email.com
```

The long hex string next to each key is the key ID. The fingerprint is the full version - always use fingerprints for identity verification, not short key IDs.

## Exporting and Sharing Your Public Key

Others need your public key to send you encrypted messages. Export it:

```bash
# Export your public key in ASCII-armored format
gpg --armor --export your@email.com > public-key.asc

# View the exported key
cat public-key.asc
```

Share this file via email, upload it to a key server, or paste it on your website. Key servers let others find your key automatically:

```bash
# Upload your key to a key server
# Use keys.openpgp.org as it has privacy-respecting policies
gpg --keyserver keys.openpgp.org --send-keys YOUR_KEY_FINGERPRINT
```

## Importing Someone Else's Key

Before you can encrypt a message to someone, you need their public key:

```bash
# Import from a file they sent you
gpg --import their-public-key.asc

# Search for and import from a key server
gpg --keyserver keys.openpgp.org --search-keys their@email.com

# Import by fingerprint (more reliable than searching by email)
gpg --keyserver keys.openpgp.org --recv-keys THEIR_FINGERPRINT
```

## Verifying Key Authenticity

Importing a key does not mean you trust it. Anyone can upload a key claiming to be anyone else. The web of trust model addresses this - you sign other people's keys after verifying their identity in person or through trusted channels.

```bash
# Sign someone's key after verifying their fingerprint in person
gpg --sign-key their@email.com

# Set trust level for a key
gpg --edit-key their@email.com
# In the interactive prompt:
# trust
# 5 (ultimate, for your own keys)
# 4 (full, for keys you have directly verified)
# quit
```

Always verify fingerprints out-of-band - compare them over the phone, in person, or through another trusted channel.

## Encrypting Messages from the Command Line

```bash
# Encrypt a message to a recipient
# -r specifies the recipient, -e encrypts, -a produces ASCII output
gpg --armor --encrypt -r their@email.com message.txt

# This creates message.txt.asc which you can send

# Encrypt to multiple recipients
gpg --armor --encrypt \
  -r recipient1@email.com \
  -r recipient2@email.com \
  message.txt

# Encrypt and sign in one step
gpg --armor --encrypt --sign \
  -r their@email.com \
  -u your@email.com \
  message.txt
```

## Decrypting Messages

```bash
# Decrypt a file (GPG will prompt for your passphrase)
gpg --decrypt encrypted-message.asc

# Decrypt and save to a file
gpg --decrypt encrypted-message.asc > decrypted-message.txt

# Decrypt a message piped in from stdin
cat encrypted-message.asc | gpg --decrypt
```

## Signing Messages Without Encryption

Sometimes you want to prove a message is from you without encrypting it:

```bash
# Create a detached signature (signature in a separate file)
gpg --armor --detach-sign document.txt
# Creates document.txt.asc containing just the signature

# Create a clearsigned message (text + signature in one file)
gpg --armor --clearsign message.txt
# Creates message.txt.asc with the message and signature together

# Verify a signature
gpg --verify document.txt.asc document.txt

# Verify a clearsigned message
gpg --verify message.txt.asc
```

## Integrating with Thunderbird

Thunderbird has built-in OpenPGP support since version 78, making integration straightforward.

Open Thunderbird, go to Account Settings, select your email account, and click "End-To-End Encryption". Click "Add Key" and choose "Use your external key, through GnuPG".

Tell Thunderbird where to find GPG:

```bash
# Find the GPG binary path
which gpg

# Tell Thunderbird to use the system GPG
# In Thunderbird: Config Editor (Advanced settings) -> search for:
# mail.openpgp.allow_external_gnupg -> set to true
```

Then select your key in the Account Settings panel. Once configured, Thunderbird adds encrypt and sign buttons to the compose window.

## Backing Up Your Private Key

Your private key is irreplaceable. Back it up securely:

```bash
# Export your private key (keep this extremely secure)
gpg --armor --export-secret-keys your@email.com > private-key-backup.asc

# Export just the subkeys (safer - can revoke without losing master key)
gpg --armor --export-secret-subkeys your@email.com > subkeys-backup.asc

# Store on an encrypted USB drive or offline medium
# Never store unencrypted private key backups in cloud storage
```

## Creating a Revocation Certificate

Generate a revocation certificate now, before you need it. If your key is compromised or you lose access, you can publish this certificate to tell others to stop using your key:

```bash
# Generate a revocation certificate
gpg --gen-revoke your@email.com > revocation-cert.asc

# Store this somewhere safe but separate from your private key
# If you ever need it, import it and publish to key servers:
# gpg --import revocation-cert.asc
# gpg --keyserver keys.openpgp.org --send-keys YOUR_FINGERPRINT
```

## Updating Key Expiration

If your key is about to expire and you want to continue using it:

```bash
# Edit the key to extend expiration
gpg --edit-key your@email.com

# In the interactive session:
# key 0          (select the master key)
# expire         (change expiration)
# 1y             (extend by 1 year)
# key 1          (select first subkey)
# expire
# 1y
# save

# After extending, upload the updated key
gpg --keyserver keys.openpgp.org --send-keys YOUR_FINGERPRINT
```

GnuPG has a learning curve, but once set up it provides strong email privacy. The command-line workflow is worth understanding even if you end up using Thunderbird day-to-day, because it gives you direct control and works well in scripts for automated encryption tasks.
