# How to Use pass for Command-Line Secret Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Password Management, GPG, CLI

Description: A practical guide to setting up and using pass - the Unix password manager - on Ubuntu for managing secrets and passwords from the command line with GPG encryption.

---

`pass` is the standard Unix password manager. It follows the Unix philosophy: do one thing well. Each secret is stored in a GPG-encrypted file, organized in a directory tree under `~/.password-store`. The tool is a shell script around GPG and Git, which means it works with your existing key infrastructure and can use Git for version history.

It sounds minimal, but `pass` is genuinely useful. Shell tab completion works on entry names, you can browse secrets like a filesystem, and Git integration gives you a full audit trail. The browser extension (passff, browserpass) brings it to web logins too.

## Prerequisites

- Ubuntu 20.04 or 22.04
- A GPG key pair (we will create one if needed)
- Basic familiarity with the terminal

## Installing pass

```bash
sudo apt-get update
sudo apt-get install -y pass

# Optionally install password generation support (included in many setups)
sudo apt-get install -y pwgen
```

## Setting Up a GPG Key

`pass` requires a GPG key to encrypt passwords. If you already have one, skip this section.

```bash
# Generate a new GPG key
gpg --full-generate-key
```

At the prompts:
- Key type: `(1) RSA and RSA`
- Key size: `4096`
- Expiry: `0` (no expiry) or a specific period like `2y`
- Enter your name and email
- Set a strong passphrase

After generation, find your key ID:

```bash
# List your keys with the long key ID format
gpg --list-secret-keys --keyid-format LONG

# Output looks like:
# sec   rsa4096/ABCDEF1234567890 2026-03-02 [SC]
#       Key fingerprint = ...
# uid                 [ultimate] Your Name <you@example.com>
```

The part after `rsa4096/` is your key ID (e.g., `ABCDEF1234567890`). You can also use the full fingerprint or your email address.

## Initializing the Password Store

```bash
# Initialize pass with your GPG key ID
pass init ABCDEF1234567890

# Or use your email address
pass init you@example.com
```

This creates `~/.password-store/` and writes a `.gpg-id` file with your key ID.

## Adding Passwords

```bash
# Add a password interactively (prompts for password, confirms)
pass insert Email/gmail

# Add a multi-line entry (for storing additional info like username, URL, notes)
pass insert -m Email/gmail
# Type your content, then press Ctrl+D to save

# Generate a random password and store it
pass generate GitHub/personal 24  # 24 character password

# Generate without symbols (some sites reject special chars)
pass generate -n AWS/console 32
```

## Organizing the Store

The password store is just a directory tree. Organize it however makes sense for you:

```bash
# A typical organization
~/.password-store/
  Email/
    gmail.gpg
    work.gpg
  SSH/
    github.gpg
    production-servers.gpg
  Databases/
    postgres-prod.gpg
    redis-prod.gpg
  API-Keys/
    stripe.gpg
    sendgrid.gpg
    aws-root.gpg
```

Create nested entries:

```bash
pass insert Databases/postgres-prod
pass insert API-Keys/stripe
pass insert SSH/production-servers
```

## Retrieving Passwords

```bash
# Show a password (decrypts and prints to stdout)
pass Email/gmail

# Copy to clipboard (clears after 45 seconds by default)
pass -c Email/gmail

# Show without decrypting (just shows the path)
pass ls

# Show the store tree
pass
```

The tree output makes it easy to navigate:

```text
Password Store
+-- API-Keys
|   +-- aws-root
|   +-- sendgrid
|   +-- stripe
+-- Databases
|   +-- postgres-prod
|   +-- redis-prod
+-- Email
    +-- gmail
    +-- work
```

## Multiline Entries

For secrets that need context (username, URL, notes), use multiline entries. A common convention:

```text
the-password-on-the-first-line
username: myusername
url: https://example.com
notes: Account created 2026-01-15
recovery-code: XXXX-YYYY-ZZZZ
```

```bash
# Insert a multiline entry
pass insert -m Databases/postgres-prod
# Type:
# supersecretpassword
# username: dbadmin
# host: db.internal:5432
# database: production
# (press Ctrl+D)

# View the full entry
pass Databases/postgres-prod

# Extract just the first line (the password)
pass Databases/postgres-prod | head -1
```

## Using pass in Scripts

```bash
#!/bin/bash
# Use pass to retrieve a database password in a script

DB_PASSWORD=$(pass Databases/postgres-prod | head -1)
DB_USER=$(pass Databases/postgres-prod | grep '^username:' | cut -d' ' -f2)
DB_HOST=$(pass Databases/postgres-prod | grep '^host:' | cut -d' ' -f2)

psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/production" << 'SQL'
  SELECT count(*) FROM users;
SQL
```

## Git Integration

`pass` has built-in Git support. Each change to the store is automatically committed:

```bash
# Initialize Git for the password store
pass git init

# Set up a remote (use a private repository)
pass git remote add origin git@github.com:yourname/password-store-private.git

# Push to remote
pass git push -u origin master

# Pull changes from another machine
pass git pull
```

Every add, edit, or remove automatically creates a Git commit. View the history:

```bash
# See all changes
pass git log --oneline

# See what changed in a specific commit
pass git show HEAD

# The actual content is encrypted, so the diff shows ciphertext changes
```

## Editing and Removing Entries

```bash
# Edit an existing entry (opens in $EDITOR, saves encrypted)
pass edit Email/gmail

# Remove an entry
pass rm Email/old-account

# Move/rename
pass mv Email/gmail Email/gmail-personal

# Copy
pass cp SSH/github SSH/github-backup
```

## Multiple Recipients (Team Password Sharing)

If multiple people need access to shared secrets, initialize with multiple GPG keys:

```bash
# Collect teammates' public keys and import them
gpg --import teammate-alice-pubkey.asc
gpg --import teammate-bob-pubkey.asc

# Reinitialize the store with multiple recipients
pass init \
  ABCDEF1234567890 \   # Your key
  ALICE_KEY_ID \
  BOB_KEY_ID

# Existing passwords are re-encrypted for all recipients
```

Now Alice and Bob can decrypt any password in the store using their private key.

## Setting Up on a New Machine

When you set up pass on another machine:

```bash
# 1. Export your GPG private key on the original machine
gpg --export-secret-keys --armor you@example.com > private-key.asc

# 2. Copy to new machine (securely - scp, encrypted USB, etc.)
# 3. On the new machine, import the key
gpg --import private-key.asc

# 4. Set ultimate trust
gpg --edit-key you@example.com
# Type: trust -> 5 -> y -> quit

# 5. Clone the password store
git clone git@github.com:yourname/password-store-private.git ~/.password-store

# Done - pass works normally
pass ls
```

## GPG Agent Configuration

GPG agent caches your passphrase so you don't type it repeatedly:

```bash
# ~/.gnupg/gpg-agent.conf
default-cache-ttl 3600       # Cache for 1 hour
max-cache-ttl 86400          # Maximum 24 hours

# Restart the agent to apply
gpgconf --kill gpg-agent
gpg-agent --daemon
```

## Troubleshooting

**"No secret key" error:**
```bash
# Check your key is available
gpg --list-secret-keys

# If key is missing, import it from backup
gpg --import backup-key.asc
```

**Clipboard doesn't clear:**
```bash
# pass uses xclip or xsel for clipboard
sudo apt-get install xclip

# Or set the clipboard timeout (default 45 seconds)
export PASSWORD_STORE_CLIP_TIME=30
```

**GPG prompts for passphrase every time:**
```bash
# Check gpg-agent is running
gpgconf --list-dirs agent-socket
gpg-agent --daemon

# Add to ~/.bashrc to ensure agent is started
export GPG_TTY=$(tty)
```

**Git push rejected:**
```bash
# Pull before push if another machine made changes
pass git pull --rebase
pass git push
```

## Browser Integration

Install the `browserpass` or `passff` browser extension to use your pass store from Firefox or Chrome. The extension reads directly from `~/.password-store`, so no additional setup is needed once pass is working.

`pass` does not have the slickest interface, but the reliability and simplicity of a tool built on GPG, Git, and a directory tree is hard to beat. If it breaks, you understand exactly what happened. If you need to recover secrets without `pass` installed, you can just call `gpg --decrypt` directly on the `.gpg` files.
