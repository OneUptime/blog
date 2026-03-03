# How to Configure APT Sources List on Ubuntu from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, System Administration, Configuration

Description: Learn how to configure Ubuntu's APT sources.list from scratch, understand repository components, add PPAs and third-party repositories, and manage sources securely with GPG keys.

---

The APT sources list tells Ubuntu's package manager where to look for software. Understanding its structure and knowing how to configure it correctly is fundamental to managing Ubuntu systems. Whether you're setting up a fresh server, adding third-party software, or recovering from a misconfigured repository setup, this knowledge is essential.

## The Two Configuration Formats

Ubuntu uses two formats for repository configuration:

1. **One-Line Format** (`/etc/apt/sources.list` and `/etc/apt/sources.list.d/*.list`) - The traditional format used in Ubuntu before 22.04
2. **deb822 Format** (`/etc/apt/sources.list.d/*.sources`) - The newer, structured format preferred from Ubuntu 22.04 onward

Both formats coexist and APT understands both.

## Understanding Repository Components

Before writing any configuration, understand what you're configuring:

- **URI**: The URL of the repository
- **Suite**: The distribution codename (`jammy`, `focal`) or channel (`jammy-security`, `jammy-updates`)
- **Components**: Which sections of the repository to include
  - `main`: Free software, fully supported by Ubuntu
  - `restricted`: Proprietary drivers, supported by Ubuntu
  - `universe`: Community-maintained free software
  - `multiverse`: Non-free software or software with legal restrictions

## The Traditional One-Line Format

Each line in `sources.list` follows this structure:

```text
deb [options] URI suite component1 component2 ...
```

A complete example for Ubuntu 22.04:

```text
# Primary repository
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse

# Updates (bug fixes and improvements for stable packages)
deb http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse

# Security updates (apply these promptly)
deb http://security.ubuntu.com/ubuntu jammy-security main restricted universe multiverse

# Backports (newer versions of some software ported back to the stable release)
deb http://archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse
```

## The deb822 Format (Ubuntu 22.04+)

On Ubuntu 22.04 and later, the default is a deb822 format file:

```bash
# View the default Ubuntu sources file
cat /etc/apt/sources.list.d/ubuntu.sources
```

The deb822 format uses `key: value` pairs:

```yaml
Types: deb
URIs: http://archive.ubuntu.com/ubuntu
Suites: jammy jammy-updates jammy-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu
Suites: jammy-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

The deb822 format is more readable and allows combining multiple suites in one stanza.

## Setting Up a Fresh sources.list

### For Ubuntu 22.04 (Jammy) - One-Line Format

```bash
# Back up any existing configuration
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak

# Create a fresh sources.list
sudo tee /etc/apt/sources.list << 'EOF'
# Ubuntu 22.04 LTS (Jammy Jellyfish) - Official Repositories

# Main repository
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb-src http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse

# Updates
deb http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
deb-src http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse

# Security updates
deb http://security.ubuntu.com/ubuntu jammy-security main restricted universe multiverse
deb-src http://security.ubuntu.com/ubuntu jammy-security main restricted universe multiverse

# Backports (optional - uncomment if needed)
# deb http://archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse
EOF

# Update APT after changing sources
sudo apt update
```

### For Ubuntu 24.04 (Noble) - deb822 Format

```bash
# Create using the new format
sudo tee /etc/apt/sources.list.d/ubuntu.sources << 'EOF'
Types: deb
URIs: http://archive.ubuntu.com/ubuntu
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF

sudo apt update
```

## Adding Third-Party Repositories Securely

The modern approach uses per-repository GPG keys stored in `/usr/share/keyrings/`:

```bash
# Example: Adding the Docker repository

# Step 1: Install prerequisites
sudo apt install ca-certificates curl gnupg

# Step 2: Create the keyrings directory if it doesn't exist
sudo install -m 0755 -d /usr/share/keyrings

# Step 3: Download and store the GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
sudo chmod a+r /usr/share/keyrings/docker.gpg

# Step 4: Add the repository with the key reference
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Step 5: Update
sudo apt update
```

## Adding PPAs (Personal Package Archives)

PPAs are Ubuntu-specific repositories hosted on Launchpad:

```bash
# Install add-apt-repository tool
sudo apt install software-properties-common

# Add a PPA (handles GPG key download automatically)
sudo add-apt-repository ppa:ondrej/php

# Update after adding
sudo apt update

# PPA files are stored as:
ls /etc/apt/sources.list.d/
# ondrej-ubuntu-php-jammy.list
```

## Viewing All Currently Configured Sources

```bash
# List all active repositories
sudo apt-cache policy | grep -E "^[ ]+[0-9]+ http" | sort -u

# More detailed view
grep -r "^deb " /etc/apt/sources.list /etc/apt/sources.list.d/ 2>/dev/null

# Using apt-cache
apt-cache showsrc apt | grep "^Binary"
```

## Removing a Repository

```bash
# Remove a PPA with ppa-purge (also downgrades packages from that PPA)
sudo ppa-purge ppa:owner/ppa-name

# Or manually remove the list file
sudo rm /etc/apt/sources.list.d/repo-name.list

# And optionally remove its key
sudo rm /usr/share/keyrings/repo-name.gpg

# Update after removing
sudo apt update
```

## Using Repository Options

The one-line format supports options in square brackets:

```bash
# Specify architecture to avoid warnings on multi-arch systems
deb [arch=amd64] http://archive.ubuntu.com/ubuntu jammy main

# Specify the signing key
deb [signed-by=/usr/share/keyrings/repo.gpg] http://example.com/ubuntu jammy main

# Allow unauthenticated (insecure - only use in isolated environments)
deb [trusted=yes] http://local-server/ubuntu jammy main

# Combine multiple options
deb [arch=amd64 signed-by=/usr/share/keyrings/repo.gpg] http://example.com/ubuntu jammy main
```

## Validating Your Configuration

```bash
# Verify that all configured repositories are accessible
sudo apt update 2>&1 | grep -E "Err|Hit|Get"

# Check for any GPG errors
sudo apt update 2>&1 | grep -i "signature\|key\|NO_PUBKEY"

# If you see NO_PUBKEY errors, fetch the missing key
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys KEYID

# Modern approach using curl (no apt-key required)
curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xKEYID" | \
    sudo gpg --dearmor -o /usr/share/keyrings/missing-key.gpg
```

## Pointing to a Local or Corporate Mirror

```bash
# Replace Ubuntu's servers with your local mirror
sudo tee /etc/apt/sources.list << 'EOF'
deb http://mirror.company.internal/ubuntu jammy main restricted universe multiverse
deb http://mirror.company.internal/ubuntu jammy-updates main restricted universe multiverse
deb http://mirror.company.internal/ubuntu jammy-security main restricted universe multiverse
EOF
```

## Checking Which Source Provides a Package

After configuring multiple sources, verify which one a package comes from:

```bash
# Show available versions and their sources
apt-cache policy nginx

# Output shows:
# nginx:
#   Installed: (none)
#   Candidate: 1.18.0-6ubuntu14.4
#   Version table:
#      1.18.0-6ubuntu14.4 500
#         500 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 Packages
#      1.18.0-0ubuntu1 500
#         500 http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages
```

## Summary

APT sources configuration controls where Ubuntu looks for software. The key principles are:

- Keep third-party repository keys in `/usr/share/keyrings/` using the `signed-by=` option
- Use separate `.list` or `.sources` files in `/etc/apt/sources.list.d/` for third-party repos
- Always run `sudo apt update` after any sources change
- Prefer the deb822 format for new configurations on Ubuntu 22.04+
- Use `add-apt-repository` for PPAs to handle key management automatically

Understanding this structure makes it straightforward to add, remove, and troubleshoot package sources on any Ubuntu system.
