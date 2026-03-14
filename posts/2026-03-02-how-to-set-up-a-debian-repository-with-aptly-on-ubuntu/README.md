# How to Set Up a Debian Repository with aptly on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Aptly, Package Repository, Debian, DevOps

Description: Set up and manage a private Debian/Ubuntu package repository using aptly on Ubuntu, including creating repos, adding packages, publishing, and serving via HTTP.

---

aptly is a feature-rich tool for managing Debian package repositories. It supports creating local repositories, mirroring upstream repositories, creating snapshots, and publishing to various storage backends. For organizations that need to host internal packages or maintain curated mirrors of upstream repositories, aptly is an excellent choice.

## Installing aptly

```bash
# Add aptly repository
wget -qO - https://www.aptly.info/pubkey.txt | sudo apt-key add -
echo "deb http://repo.aptly.info/ squeeze main" | \
  sudo tee /etc/apt/sources.list.d/aptly.list

# Install aptly
sudo apt update
sudo apt install aptly -y

# Verify installation
aptly version
```

Alternatively, download a pre-built binary directly:

```bash
# Download latest aptly binary
wget https://github.com/aptly-dev/aptly/releases/download/v1.5.0/aptly_1.5.0_linux_amd64.tar.gz

# Extract and install
tar xf aptly_1.5.0_linux_amd64.tar.gz
sudo mv aptly_1.5.0_linux_amd64/aptly /usr/local/bin/
aptly version
```

## Basic Configuration

aptly stores configuration in `~/.aptly.conf`:

```bash
# Generate default configuration
aptly config show

# Create a custom configuration
cat > ~/.aptly.conf << 'EOF'
{
  "rootDir": "/opt/aptly",
  "downloadConcurrency": 4,
  "downloadSpeedLimit": 0,
  "architectures": ["amd64", "arm64"],
  "dependencyFollowSuggests": false,
  "dependencyFollowRecommends": false,
  "dependencyFollowAllVariants": false,
  "dependencyFollowSource": false,
  "gpgDisableSign": false,
  "gpgDisableVerify": false,
  "gpgProvider": "gpg",
  "downloadSourcePackages": false,
  "skipLegacyPool": true,
  "ppaDistributorID": "ubuntu",
  "ppaCodename": ""
}
EOF

# Create the aptly root directory
sudo mkdir -p /opt/aptly
sudo chown $USER:$USER /opt/aptly
```

## Setting Up GPG for Signing

aptly signs repository metadata with GPG. Set up your signing key:

```bash
# Generate a dedicated signing key
gpg --full-generate-key
# RSA 4096, 2 years expiry

# Get the key ID
GPG_KEY_ID=$(gpg --list-secret-keys --keyid-format LONG | grep sec | awk '{print $2}' | cut -d/ -f2)

# Export the public key for distribution to clients
gpg --armor --export $GPG_KEY_ID > /opt/aptly/public/myrepo-key.asc
```

## Creating a Local Repository

```bash
# Create a new local repository
aptly repo create \
  -comment="Internal packages for myorg" \
  -distribution=noble \
  -component=main \
  myorg-internal

# List repositories
aptly repo list

# Show repository details
aptly repo show myorg-internal
```

## Adding Packages to the Repository

```bash
# Add a single .deb package
aptly repo add myorg-internal /path/to/mypackage_1.0-1_amd64.deb

# Add all .deb files from a directory
aptly repo add myorg-internal /path/to/packages/

# Add and automatically remove duplicate versions
aptly repo add -force-replace myorg-internal /path/to/mypackage_1.0-2_amd64.deb

# List packages in the repository
aptly repo show -with-packages myorg-internal
```

## Publishing the Repository

Publishing makes the repository accessible. aptly supports local filesystem, S3, and Swift backends.

```bash
# Publish to local filesystem
aptly publish repo \
  -gpg-key=$GPG_KEY_ID \
  -distribution=noble \
  myorg-internal

# The repository is now at ~/.aptly/public/ (or your configured rootDir/public)
ls /opt/aptly/public/

# Publish to a specific path prefix (useful for multiple repos)
aptly publish repo \
  -gpg-key=$GPG_KEY_ID \
  -distribution=noble \
  -prefix=myorg \
  myorg-internal
```

## Serving the Repository via HTTP

```bash
# aptly has a built-in HTTP server for testing
aptly serve --listen=:8080

# For production, use nginx or Apache

# Install nginx
sudo apt install nginx -y

# Configure nginx to serve the aptly public directory
cat > /etc/nginx/sites-available/aptly-repo << 'EOF'
server {
    listen 80;
    server_name packages.myorg.internal;

    root /opt/aptly/public;
    autoindex on;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/aptly-repo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Client Configuration

On client machines that need to use your repository:

```bash
# Add the signing key
curl -fsSL http://packages.myorg.internal/myrepo-key.asc | \
  sudo gpg --dearmor -o /etc/apt/keyrings/myorg.gpg

# Add the repository
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/myorg.gpg] \
  http://packages.myorg.internal noble main" | \
  sudo tee /etc/apt/sources.list.d/myorg.list

# Update and install
sudo apt update
sudo apt install mypackage
```

## Working with Snapshots

Snapshots are immutable point-in-time copies of a repository. They're the key to safe repository management.

```bash
# Create a snapshot of the current repository state
aptly snapshot create myorg-2026-03-02 from repo myorg-internal

# List snapshots
aptly snapshot list

# Show packages in a snapshot
aptly snapshot show -with-packages myorg-2026-03-02

# Publish a snapshot instead of directly publishing the repo
# This is the recommended workflow for production
aptly publish snapshot \
  -gpg-key=$GPG_KEY_ID \
  -distribution=noble \
  myorg-2026-03-02

# Switch a published endpoint to a different snapshot
aptly publish switch \
  -gpg-key=$GPG_KEY_ID \
  noble myorg-2026-03-03

# Drop an old snapshot
aptly snapshot drop myorg-2026-02-01
```

## Mirroring an Upstream Repository

aptly can mirror and manage upstream repositories locally:

```bash
# Create a mirror of Ubuntu's main repository (only selected packages)
aptly mirror create \
  -filter="Priority (required) | nginx | curl" \
  -filter-with-deps \
  ubuntu-noble-mirror \
  http://archive.ubuntu.com/ubuntu \
  noble \
  main

# Update (download) the mirror
aptly mirror update ubuntu-noble-mirror

# Create a snapshot from the mirror
aptly snapshot create ubuntu-noble-2026-03-02 from mirror ubuntu-noble-mirror

# List mirrors
aptly mirror list
```

## Merging Snapshots

Combine multiple snapshots into one published endpoint:

```bash
# Merge internal packages with a mirrored snapshot
aptly snapshot merge \
  -latest \
  merged-noble-2026-03-02 \
  ubuntu-noble-2026-03-02 \
  myorg-2026-03-02

# Publish the merged snapshot
aptly publish snapshot \
  -gpg-key=$GPG_KEY_ID \
  -distribution=noble \
  merged-noble-2026-03-02
```

## Updating Published Repositories

When you add new packages to a repository:

```bash
# Add new package to the repository
aptly repo add myorg-internal /path/to/newpackage_2.0-1_amd64.deb

# Create a new snapshot
aptly snapshot create myorg-2026-03-02-v2 from repo myorg-internal

# Switch the published endpoint to the new snapshot
aptly publish switch \
  -gpg-key=$GPG_KEY_ID \
  noble . myorg-2026-03-02-v2

# Clean up old snapshots and packages
aptly db cleanup
```

## Removing Packages

```bash
# Remove a specific package from a repository
aptly repo remove myorg-internal "mypackage_1.0-1_amd64"

# Remove all versions of a package
aptly repo remove myorg-internal "Name (mypackage)"

# After removing, create a new snapshot and switch the published endpoint
```

## Publishing to S3

For cloud-based distribution:

```bash
# Configure S3 in ~/.aptly.conf
cat > ~/.aptly.conf << 'EOF'
{
  "rootDir": "/opt/aptly",
  "architectures": ["amd64"],
  "S3PublishEndpoints": {
    "mybucket": {
      "region": "us-east-1",
      "bucket": "myorg-packages",
      "prefix": "ubuntu",
      "acl": "public-read"
    }
  }
}
EOF

# Publish to S3
aptly publish repo \
  -gpg-key=$GPG_KEY_ID \
  -distribution=noble \
  myorg-internal \
  s3:mybucket:
```

aptly's snapshot model is its strongest feature - the ability to promote tested snapshots to production while keeping the previous snapshot available for rollback makes it a solid choice for organizations that take package management seriously.
