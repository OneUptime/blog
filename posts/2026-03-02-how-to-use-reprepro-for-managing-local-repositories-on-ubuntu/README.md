# How to Use reprepro for Managing Local Repositories on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Repository, System Administration

Description: Learn how to use reprepro to create and manage local APT repositories on Ubuntu for hosting custom packages, mirroring upstream repositories, and controlling package distribution.

---

reprepro is a tool for managing Debian-style APT repositories. It handles repository metadata generation, package signing, and distribution management, making it straightforward to host custom .deb packages internally, maintain curated mirrors of upstream repositories, and distribute packages to your fleet of Ubuntu machines. This guide covers setting up a functional local repository with reprepro.

## Use Cases

Before the setup, consider why you might need a local repository:

- **Internal packages** - Custom software packaged as .deb files, distributed to internal servers
- **Version pinning** - Host specific versions of packages that won't change under you when upstream updates
- **Offline environments** - Air-gapped networks need local repositories for package management
- **Bandwidth reduction** - Combined with apt-cacher-ng, reduce external bandwidth on large fleets
- **Package testing** - Test packages on a subset of machines before rolling out broadly

## Installing reprepro

```bash
# Install reprepro and GPG for signing
sudo apt-get update
sudo apt-get install -y reprepro gnupg nginx

# Verify installation
reprepro --version
```

## Creating a GPG Signing Key

APT repositories should be signed to allow clients to verify package authenticity. Create a dedicated signing key:

```bash
# Generate a signing key for the repository
# Use a batch file for non-interactive key generation
cat > /tmp/repo-key-gen.conf << 'EOF'
%no-protection
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: MyCompany Internal Repository
Name-Email: packages@mycompany.internal
Expire-Date: 0
%commit
EOF

gpg --batch --gen-key /tmp/repo-key-gen.conf
rm /tmp/repo-key-gen.conf

# List your key to get the fingerprint
gpg --list-secret-keys --keyid-format LONG
# Output shows: sec rsa4096/AABBCCDDAABBCCDD ...
# Note the key ID (AABBCCDDAABBCCDD)

# Export the public key for distribution to clients
gpg --armor --export packages@mycompany.internal > /var/www/repo/key.gpg
```

## Setting Up the Repository Structure

reprepro uses a specific directory layout:

```bash
# Create the repository directory structure
sudo mkdir -p /var/www/repo/{conf,dists,pool,db}

# Set appropriate ownership
sudo chown -R $USER:$USER /var/www/repo
```

## Configuring reprepro

Create the distribution configuration file that defines which distributions and components your repository supports:

```bash
# /var/www/repo/conf/distributions
cat > /var/www/repo/conf/distributions << 'EOF'
# Ubuntu 22.04 (Jammy) distribution configuration
Origin: MyCompany Internal
Label: MyCompany Internal Repository
Suite: stable
Codename: jammy
Version: 22.04
Architectures: amd64 arm64
Components: main contrib
Description: Internal package repository for MyCompany
SignWith: packages@mycompany.internal

# Separate configuration for Ubuntu 24.04 (Noble) if needed
Origin: MyCompany Internal
Label: MyCompany Internal Repository
Suite: stable
Codename: noble
Version: 24.04
Architectures: amd64 arm64
Components: main contrib
Description: Internal package repository for MyCompany
SignWith: packages@mycompany.internal
EOF
```

Create the optional options file for global settings:

```bash
# /var/www/repo/conf/options
cat > /var/www/repo/conf/options << 'EOF'
# Default options for reprepro

# Verbose logging
verbose
# Ask before overwriting packages
ask-passphrase
# Log file
logdir /var/log/reprepro
EOF

sudo mkdir -p /var/log/reprepro
```

## Adding Packages to the Repository

With the configuration in place, add .deb packages to the repository.

### Adding a Package

```bash
# Navigate to the repository root
cd /var/www/repo

# Add a .deb package to the jammy distribution
reprepro includedeb jammy /path/to/mypackage_1.0.0_amd64.deb

# Add packages for both architectures
reprepro includedeb jammy /path/to/mypackage_1.0.0_amd64.deb
reprepro includedeb jammy /path/to/mypackage_1.0.0_arm64.deb

# Verify the package was added
reprepro ls mypackage
```

### Adding from a Changes File

If you're building packages with dpkg-buildpackage, it generates a .changes file:

```bash
# Add all packages referenced in a .changes file
reprepro include jammy /path/to/mypackage_1.0.0_amd64.changes
```

### Batch Adding Multiple Packages

```bash
# Add all .deb files from a directory
for deb in /tmp/new-packages/*.deb; do
    reprepro includedeb jammy "$deb"
    echo "Added: $deb"
done
```

## Listing and Managing Packages

```bash
# List all packages in a distribution
reprepro -b /var/www/repo list jammy

# List a specific package across all distributions
reprepro -b /var/www/repo ls mypackage

# List packages in a specific component
reprepro -b /var/www/repo listfilter jammy 'Component (== main)'

# Remove a package from the repository
reprepro -b /var/www/repo remove jammy mypackage

# Remove a specific version
reprepro -b /var/www/repo removefilter jammy 'Package (== mypackage), Version (== 1.0.0)'
```

## Serving the Repository with Nginx

Configure nginx to serve the repository over HTTP:

```nginx
# /etc/nginx/sites-available/apt-repo
server {
    listen 80;
    server_name repo.mycompany.internal;

    root /var/www/repo;
    autoindex on;

    # Serve repository metadata
    location / {
        try_files $uri $uri/ =404;
    }

    # Serve .deb packages efficiently
    location ~ \.deb$ {
        types { application/x-debian-package deb; }
    }

    # Access logging for audit trail
    access_log /var/log/nginx/apt-repo-access.log;
    error_log /var/log/nginx/apt-repo-error.log;
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/apt-repo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuring Clients to Use the Repository

On machines that should use the internal repository:

```bash
# Add the repository signing key
curl -fsSL http://repo.mycompany.internal/key.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/mycompany-repo.gpg

# Add the repository to sources list
echo "deb [signed-by=/usr/share/keyrings/mycompany-repo.gpg] http://repo.mycompany.internal jammy main" | \
  sudo tee /etc/apt/sources.list.d/mycompany-internal.list

# Update package list and install from internal repo
sudo apt-get update
sudo apt-get install mypackage
```

## Mirroring Upstream Repositories

reprepro can mirror external repositories, creating a local copy for offline environments or bandwidth control:

```bash
# /var/www/repo/conf/updates - Define upstream repositories to mirror
cat > /var/www/repo/conf/updates << 'EOF'
# Mirror Ubuntu security updates
Name: ubuntu-jammy-security
Method: http://security.ubuntu.com/ubuntu
Suite: jammy-security
Components: main restricted universe
Architectures: amd64
FilterList: install packages-to-mirror.list
EOF

# /var/www/repo/conf/distributions - Add mirrored content
# Add these lines to the jammy distribution block:
# Update: ubuntu-jammy-security
```

Create a filter list to limit what gets mirrored (mirrors can be large):

```bash
# packages-to-mirror.list - Only mirror specific packages
cat > /var/www/repo/conf/packages-to-mirror.list << 'EOF'
install openssl
install libssl1.1
install libssl-dev
install openssh-server
install openssh-client
install curl
install wget
install nginx
EOF
```

Run the mirror update:

```bash
# Pull updates from upstream
reprepro -b /var/www/repo update

# Schedule this via cron for automatic updates
sudo crontab -e
# Add:
# 0 2 * * * reprepro -b /var/www/repo update >> /var/log/reprepro/update.log 2>&1
```

## Automating Package Addition

A simple CI/CD integration to automatically add new packages:

```bash
#!/bin/bash
# /usr/local/bin/repo-add-package.sh
# Adds a .deb package to the repository and updates metadata

REPO_DIR="/var/www/repo"
PACKAGE_FILE="$1"
DISTRIBUTION="${2:-jammy}"
COMPONENT="${3:-main}"

if [[ -z "$PACKAGE_FILE" || ! -f "$PACKAGE_FILE" ]]; then
    echo "Usage: $0 <package.deb> [distribution] [component]" >&2
    exit 1
fi

# Validate it's a proper .deb file
if ! dpkg-deb --info "$PACKAGE_FILE" > /dev/null 2>&1; then
    echo "ERROR: Invalid .deb file: $PACKAGE_FILE" >&2
    exit 1
fi

PACKAGE_NAME=$(dpkg-deb --show --showformat='${Package}' "$PACKAGE_FILE")
PACKAGE_VERSION=$(dpkg-deb --show --showformat='${Version}' "$PACKAGE_FILE")

echo "Adding package: $PACKAGE_NAME version $PACKAGE_VERSION to $DISTRIBUTION/$COMPONENT"

# Add to repository
reprepro -b "$REPO_DIR" includedeb "$DISTRIBUTION" "$PACKAGE_FILE"

echo "Package added successfully. Verifying..."
reprepro -b "$REPO_DIR" ls "$PACKAGE_NAME"
```

## Troubleshooting

**Packages not appearing after addition:**

```bash
# Check for errors in the reprepro operation
reprepro -V -b /var/www/repo ls mypackage

# Check the repository database
ls /var/www/repo/db/
```

**Signing failures:**

```bash
# Verify the signing key is accessible
gpg --list-secret-keys packages@mycompany.internal

# If using a passphrase-protected key, configure gpg-agent
export GPG_TTY=$(tty)
echo "Acquire::gpgv::Options "--ignore-time-conflict";" | sudo tee /etc/apt/apt.conf.d/99ignore-release-date
```

**Clients getting "NO_PUBKEY" errors:**

```bash
# Ensure clients have the correct key installed
gpg --armor --export packages@mycompany.internal
# Distribute this public key to clients and have them add it with:
# gpg --dearmor > /usr/share/keyrings/mycompany-repo.gpg
```

reprepro is a mature, stable tool that handles the complexity of repository metadata while keeping the workflow straightforward. For teams that package their own software or need precise control over what's installed across their Ubuntu fleet, it provides a solid foundation.
