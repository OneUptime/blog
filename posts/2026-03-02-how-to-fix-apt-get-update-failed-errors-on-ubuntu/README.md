# How to Fix 'apt-get update Failed' Errors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Package Management, APT, Troubleshooting, Administration

Description: Fix common apt-get update failures on Ubuntu including GPG key errors, 404 repository errors, network connectivity issues, and broken source list configurations.

---

`apt-get update` fails for a handful of predictable reasons. The error messages are usually informative once you know what to look for. This guide covers each failure type with the specific fix.

## Common Error Categories

Before fixing, identify which type of error you're seeing:

```bash
sudo apt-get update 2>&1

# Run with more verbose output
sudo apt-get update -o Debug::Acquire::http=true 2>&1 | head -50
```

## Error: NO_PUBKEY / GPG Key Problems

```text
W: GPG error: https://apt.releases.hashicorp.com jammy InRelease: The following signatures couldn't be verified because the public key is not available: NO_PUBKEY AA16FCBCA621E701
E: The repository 'https://apt.releases.hashicorp.com jammy InRelease' is not signed.
```

This means the GPG key that signs the repository's package list is not in your keyring.

### Fix for Third-Party Repositories

```bash
# Method 1: Download and add the key directly (modern approach for Ubuntu 22.04+)
# Find the key URL from the software's documentation

# Example for HashiCorp:
wget -O- https://apt.releases.hashicorp.com/gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Make sure the source list references the key
grep hashicorp /etc/apt/sources.list.d/*.list

# The entry should look like:
# deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com ...

# Method 2: Import key by fingerprint (older style, uses deprecated apt-key)
# sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys AA16FCBCA621E701

# Method 3: Download key from keyserver using gpg
gpg --keyserver keyserver.ubuntu.com --recv-keys AA16FCBCA621E701
gpg --export AA16FCBCA621E701 | sudo tee /usr/share/keyrings/custom-key.gpg > /dev/null
```

### Fix for Expired Ubuntu Keys

```bash
# Ubuntu archive keys can expire - update them
sudo apt-key list | grep expired

# Refresh all keys
sudo apt-key adv --keyserver keyserver.ubuntu.com --refresh-keys

# Or update the ubuntu-keyring package
sudo apt-get install --reinstall ubuntu-keyring
```

## Error: 404 Not Found

```text
E: Failed to fetch http://old-releases.ubuntu.com/ubuntu/dists/... 404  Not Found
Err:1 http://archive.ubuntu.com/ubuntu hirsute InRelease
  404  Not Found [IP: 91.189.91.81 80]
```

This happens when a repository URL no longer exists. Common causes:

1. **Ubuntu EOL (End of Life)**: The Ubuntu release you're running is no longer supported
2. **Removed PPA**: A personal package archive was deleted
3. **Changed repository URL**: The software vendor changed their repository URL

### Fix: Update Repository URLs

```bash
# Check your sources
cat /etc/apt/sources.list
ls /etc/apt/sources.list.d/

# For an EOL Ubuntu release, switch to old-releases
# Hirsute (21.04), Groovy (20.10), etc. moved to old-releases.ubuntu.com
sudo sed -i 's/archive.ubuntu.com/old-releases.ubuntu.com/g' /etc/apt/sources.list
sudo sed -i 's/security.ubuntu.com/old-releases.ubuntu.com/g' /etc/apt/sources.list

# Better solution: upgrade to a supported Ubuntu release
# sudo do-release-upgrade
```

### Fix: Remove or Update Broken PPAs

```bash
# List all enabled sources
grep -r "^deb" /etc/apt/sources.list /etc/apt/sources.list.d/

# Remove a specific PPA
sudo add-apt-repository --remove ppa:some-ppa/ppa

# Or manually remove the file
sudo rm /etc/apt/sources.list.d/some-ppa.list

# Disable a source temporarily by renaming it
sudo mv /etc/apt/sources.list.d/broken.list /etc/apt/sources.list.d/broken.list.disabled
```

## Error: Failed to Fetch / Network Errors

```text
Err:1 http://archive.ubuntu.com/ubuntu jammy InRelease
  Temporary failure resolving 'archive.ubuntu.com'
  Connection failed [IP: ...]
```

Network connectivity issues prevent apt from reaching repositories.

```bash
# Test basic internet connectivity
ping -c 3 8.8.8.8

# Test DNS resolution
nslookup archive.ubuntu.com

# If DNS fails but IP works, check DNS configuration
cat /etc/resolv.conf
# Should show nameserver entries

# Fix broken DNS temporarily
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf

# Test the repository directly
curl -I http://archive.ubuntu.com/ubuntu/
```

### Working Behind a Proxy

```bash
# Set proxy for apt
sudo nano /etc/apt/apt.conf.d/01proxy
```

```text
# /etc/apt/apt.conf.d/01proxy
Acquire::http::Proxy "http://proxyuser:proxypass@proxy.company.com:8080";
Acquire::https::Proxy "http://proxyuser:proxypass@proxy.company.com:8080";
```

```bash
# Or set environment variables
export http_proxy="http://proxy.company.com:8080"
export https_proxy="http://proxy.company.com:8080"
sudo -E apt-get update
```

### Using a Local Mirror

If the official Ubuntu mirrors are slow or unreliable:

```bash
# Change to a regional mirror
# Brazil example:
sudo sed -i 's|http://archive.ubuntu.com|http://br.archive.ubuntu.com|g' /etc/apt/sources.list

# Or use a specific fast mirror
sudo sed -i 's|http://archive.ubuntu.com|http://mirror.us-midwest-1.nexcess.net/ubuntu|g' /etc/apt/sources.list

# Update to verify the mirror works
sudo apt-get update
```

## Error: Malformed or Duplicate Entries

```text
E: Malformed entry 56 in list file /etc/apt/sources.list (Component)
W: Target Packages (main/binary-amd64/Packages) is configured multiple times
```

Duplicate or malformed entries in source files.

```bash
# View all enabled repositories
grep -r "^deb" /etc/apt/sources.list /etc/apt/sources.list.d/ | sort

# Find duplicates
grep -r "^deb" /etc/apt/sources.list /etc/apt/sources.list.d/ | awk '{print $2}' | sort | uniq -d

# Check for syntax errors in sources.list
sudo apt-get update 2>&1 | grep "Malformed"

# Fix: Open the file and check the line mentioned in the error
sudo nano /etc/apt/sources.list
# Line format should be:
# deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
```

### Recreating a Clean sources.list

If sources.list is badly corrupted:

```bash
# Backup the existing file
sudo cp /etc/apt/sources.list /etc/apt/sources.list.backup

# Create a clean sources.list for Ubuntu 22.04 (Jammy)
cat > /tmp/sources.list << 'EOF'
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-security main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse
EOF

sudo cp /tmp/sources.list /etc/apt/sources.list
sudo apt-get update
```

## Error: Size/Hash Mismatch

```text
W: Failed to fetch https://... Hash Sum mismatch
E: Some index files failed to download. They have been ignored, or old ones used instead.
```

This usually means a partial download or a mirror serving inconsistent data:

```bash
# Clear the apt cache and re-download
sudo rm -rf /var/lib/apt/lists/*
sudo apt-get clean
sudo apt-get update

# If a specific mirror is returning bad data, switch mirrors
sudo sed -i 's|http://archive.ubuntu.com|http://mirrors.digitalocean.com|g' /etc/apt/sources.list
sudo apt-get update
```

## Error: Lock File Problems

```text
E: Could not get lock /var/lib/apt/lists/lock
E: Unable to lock directory /var/lib/apt/lists/
```

```bash
# Check if another apt process is running
ps aux | grep apt
ps aux | grep dpkg

# If no apt processes are running, remove stale locks
sudo rm /var/lib/apt/lists/lock
sudo rm /var/cache/apt/archives/lock
sudo rm /var/lib/dpkg/lock*

# Repair dpkg state
sudo dpkg --configure -a

sudo apt-get update
```

## Debugging apt Connectivity Issues

```bash
# Test downloading a specific package list manually
curl -v "http://archive.ubuntu.com/ubuntu/dists/jammy/Release" 2>&1 | head -20

# Check if SSL certificate issues are blocking HTTPS repos
curl -v "https://download.docker.com/linux/ubuntu/dists/jammy/Release" 2>&1 | grep -E "SSL|certificate|expire"

# Update CA certificates if HTTPS fails
sudo apt-get install --reinstall ca-certificates
sudo update-ca-certificates
```

## Automating apt Update Verification

Add apt update verification to your monitoring:

```bash
#!/bin/bash
# /usr/local/bin/check-apt-update.sh
# Check if apt-get update succeeds and report failures

LOGFILE="/var/log/apt-update-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if sudo apt-get update -qq 2>&1 | grep -qiE "error|fail"; then
    echo "[$TIMESTAMP] apt-get update encountered errors:" >> "$LOGFILE"
    sudo apt-get update 2>&1 >> "$LOGFILE"
    echo "[$TIMESTAMP] APT UPDATE FAILED - check $LOGFILE"
    exit 1
fi

echo "[$TIMESTAMP] apt-get update succeeded" >> "$LOGFILE"
```

## Summary

`apt-get update` failures map to specific root causes:

- **GPG errors**: Add or refresh the repository's signing key
- **404 errors**: The repository URL has changed or the Ubuntu release is EOL
- **Network errors**: DNS, proxy, or connectivity issues - fix the network layer first
- **Hash mismatches**: Clear `/var/lib/apt/lists/*` and retry; switch mirrors if persistent
- **Lock files**: Wait for other apt processes or remove stale locks

Most of these are straightforward to fix once you've matched the error message to the category. Keep sources in `/etc/apt/sources.list.d/` organized with descriptive filenames so you can quickly find and remove problematic entries.
