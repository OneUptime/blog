# How to Set Up a Private APT Repository with reprepro on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Reprepro, System Administration

Description: Learn how to create a private APT repository using reprepro on Ubuntu to host and distribute your own .deb packages across your infrastructure with GPG signing and nginx serving.

---

Once you're building your own `.deb` packages, the natural next step is a private APT repository so your servers can install and update those packages with a standard `apt install` command. `reprepro` is a well-maintained tool specifically designed for managing local Debian repositories with GPG signing, multiple distributions, and easy package management.

## Why reprepro Over Other Approaches

Several tools exist for hosting APT repositories (`apt-ftparchive`, `reprepro`, `aptly`). `reprepro` occupies a practical middle ground - more capable than `apt-ftparchive` but simpler to configure than `aptly`. It handles:

- GPG signing of the repository (required for APT to trust it)
- Multiple distributions in one repository (jammy, focal, etc.)
- Package addition and removal without manual index rebuilding
- Consistent repository structure

## Prerequisites

```bash
# Install reprepro and GPG
sudo apt install reprepro gnupg

# You'll also need nginx or Apache to serve the repository
sudo apt install nginx
```

## Step 1: Create a GPG Key for Signing

The repository needs to be GPG-signed, and clients need the corresponding public key to verify packages:

```bash
# Generate a GPG key (use a dedicated key, not your personal one)
gpg --full-generate-key

# Select:
# Key type: RSA and RSA (1)
# Key size: 4096
# Expiration: 0 (no expiration, or set based on your security policy)
# Name: MyCompany APT Repository
# Email: apt@mycompany.internal
# Comment: (leave blank or add description)

# List keys to get the key ID
gpg --list-keys

# Output:
# pub   rsa4096 2024-01-15 [SC]
#       ABCDEF1234567890ABCDEF1234567890ABCDEF12
# uid   [ultimate] MyCompany APT Repository <apt@mycompany.internal>
```

Note the 40-character fingerprint - you'll use it in the configuration.

## Step 2: Create the Repository Directory Structure

```bash
# Choose a location for the repository
REPO_DIR="/var/packages"

# Create the configuration directory
sudo mkdir -p ${REPO_DIR}/conf
sudo mkdir -p ${REPO_DIR}/incoming

# Set ownership
sudo chown -R $USER:$USER ${REPO_DIR}
```

## Step 3: Configure reprepro

Create the main distributions configuration:

```bash
cat > ${REPO_DIR}/conf/distributions << 'EOF'
# Ubuntu 22.04 Jammy distribution
Origin: MyCompany
Label: MyCompany Internal Packages
Codename: jammy
Architectures: amd64 arm64 all
Components: main
Description: MyCompany internal Ubuntu 22.04 packages
SignWith: ABCDEF1234567890ABCDEF1234567890ABCDEF12

# Ubuntu 20.04 Focal distribution (if supporting older servers)
Origin: MyCompany
Label: MyCompany Internal Packages
Codename: focal
Architectures: amd64 all
Components: main
Description: MyCompany internal Ubuntu 20.04 packages
SignWith: ABCDEF1234567890ABCDEF1234567890ABCDEF12
EOF
```

Replace `ABCDEF1234...` with your actual GPG key fingerprint.

Create the options file:

```bash
cat > ${REPO_DIR}/conf/options << 'EOF'
# Directory for incoming packages
ask-passphrase
EOF
```

## Step 4: Add Your First Package

```bash
# Add a package to the jammy distribution
reprepro -b ${REPO_DIR} includedeb jammy /path/to/mypackage_1.0.0_amd64.deb

# Add to multiple distributions at once
reprepro -b ${REPO_DIR} includedeb jammy /path/to/package.deb
reprepro -b ${REPO_DIR} includedeb focal /path/to/package.deb

# List packages in the repository
reprepro -b ${REPO_DIR} list jammy
```

reprepro automatically generates all necessary index files and signs the repository.

## Step 5: Managing the Repository

```bash
# Add a new package version (reprepro handles versioning)
reprepro -b ${REPO_DIR} includedeb jammy mypackage_1.1.0_amd64.deb

# Remove a package
reprepro -b ${REPO_DIR} remove jammy mypackage

# Remove a specific version
reprepro -b ${REPO_DIR} removefilter jammy 'Package (= mypackage), Version (= 1.0.0)'

# List all packages in a distribution
reprepro -b ${REPO_DIR} list jammy

# Check repository consistency
reprepro -b ${REPO_DIR} check jammy
```

## Step 6: Serve the Repository with nginx

```bash
sudo tee /etc/nginx/sites-available/apt-repo << 'EOF'
server {
    listen 80;
    server_name packages.mycompany.internal;

    root /var/packages;

    location / {
        autoindex on;
        autoindex_exact_size off;
    }

    # Don't cache repository index files
    location ~* (Packages|Release|Sources)(\.gz|\.bz2|\.xz)?$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Cache package files for 7 days
    location ~* \.deb$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    access_log /var/log/nginx/apt-repo-access.log;
    error_log /var/log/nginx/apt-repo-error.log;
}
EOF

sudo ln -s /etc/nginx/sites-available/apt-repo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Step 7: Export the GPG Public Key

Clients need the public key to verify package signatures:

```bash
# Export the public key
gpg --armor --export apt@mycompany.internal > /var/packages/mycompany-apt-key.gpg

# Or export to the repository root for easy client access
gpg --armor --export ABCDEF1234567890 | sudo tee /var/packages/mycompany-archive-keyring.gpg

# Make the key accessible via HTTP
# It's now at http://packages.mycompany.internal/mycompany-archive-keyring.gpg
```

## Step 8: Configure Clients

On each Ubuntu machine that should use your repository:

```bash
# Download and store the signing key
curl -fsSL http://packages.mycompany.internal/mycompany-archive-keyring.gpg | \
    sudo tee /usr/share/keyrings/mycompany-archive-keyring.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/mycompany-archive-keyring.gpg] \
    http://packages.mycompany.internal jammy main" | \
    sudo tee /etc/apt/sources.list.d/mycompany.list

# Update and verify
sudo apt update

# Install a package from your repository
sudo apt install mycompany-monitor
```

## Automating Package Addition

Create a script for your CI/CD pipeline to push new packages:

```bash
#!/bin/bash
# deploy-package.sh - Add a built .deb to the repository

REPO_DIR="/var/packages"
DISTRIBUTION="${1:-jammy}"
PACKAGE_FILE="$2"

if [ -z "$PACKAGE_FILE" ] || [ ! -f "$PACKAGE_FILE" ]; then
    echo "Usage: $0 <distribution> <package.deb>"
    exit 1
fi

echo "Adding $PACKAGE_FILE to $DISTRIBUTION distribution..."

# Add to repository
reprepro -b "$REPO_DIR" includedeb "$DISTRIBUTION" "$PACKAGE_FILE"

if [ $? -eq 0 ]; then
    echo "Package added successfully"
    echo "Repository contents:"
    reprepro -b "$REPO_DIR" list "$DISTRIBUTION"
else
    echo "Failed to add package"
    exit 1
fi
```

## Handling Multiple Architectures

For packages that need to be served to both amd64 and arm64 machines:

```bash
# Add architecture-specific packages
reprepro -b ${REPO_DIR} includedeb jammy mypackage_1.0.0_amd64.deb
reprepro -b ${REPO_DIR} includedeb jammy mypackage_1.0.0_arm64.deb

# For architecture-independent packages (scripts, config files)
reprepro -b ${REPO_DIR} includedeb jammy mypackage_1.0.0_all.deb
```

Packages with architecture `all` are served to all architectures automatically.

## Using reprepro with SFTP/SCP Input

For secure package submission without shell access to the repository server:

```bash
# Set up an incoming directory with restricted permissions
mkdir /var/packages/incoming
chown upload-user:reprepro /var/packages/incoming
chmod 770 /var/packages/incoming

# Watch the incoming directory and process packages
# (typically done via inotifywait or a cron job)
while inotifywait -e close_write /var/packages/incoming/; do
    for deb in /var/packages/incoming/*.deb; do
        reprepro -b /var/packages includedeb jammy "$deb"
        rm "$deb"  # Remove after processing
    done
done
```

## Securing the Repository

For production use, consider:

```bash
# Require authentication for package uploads (nginx basic auth)
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/apt-repo.htpasswd upload-user

# Add to nginx config for the upload endpoint
location /incoming/ {
    auth_basic "APT Repository Upload";
    auth_basic_user_file /etc/nginx/apt-repo.htpasswd;
    dav_methods PUT;
}
```

## Monitoring Repository State

```bash
# Check all packages in the repository
reprepro -b /var/packages list jammy

# Verify GPG signatures are valid
reprepro -b /var/packages check jammy

# Show repository contents with detailed info
reprepro -b /var/packages listfilter jammy 'Package (% mycompany*)'
```

## Summary

A reprepro repository setup involves:

1. Generate a GPG signing key
2. Create the repository directory and `conf/distributions` file
3. Add packages with `reprepro includedeb <dist> <package.deb>`
4. Serve the directory with nginx
5. Distribute the GPG public key to clients
6. Configure clients with `apt/sources.list.d/` and the signing key

Once the infrastructure is in place, adding new package versions is a single `reprepro includedeb` command, making it easy to integrate with CI/CD pipelines.
