# How to Fix 'GPG Check Failed' When Installing RPM Packages on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RPM, GPG, Package Management, Security

Description: Fix 'GPG check FAILED' errors when installing RPM packages on RHEL by importing the correct GPG keys or verifying package integrity.

---

GPG signature verification protects against tampered or corrupted packages. When you see "GPG check FAILED", it means the package signature does not match any trusted key on your system.

## Understanding the Error

```bash
# Typical error messages:
# warning: /path/package.rpm: Header V4 RSA/SHA256 Signature, key ID xxxxxx: NOKEY
# Public key for package.rpm is not installed
# GPG check FAILED
```

## Step 1: Import the GPG Key for the Repository

```bash
# List currently imported GPG keys
rpm -qa gpg-pubkey*

# Import the Red Hat GPG key (should be present by default)
sudo rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release

# For EPEL packages
sudo rpm --import https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-9

# For a third-party repo, import their GPG key
sudo rpm --import https://repo.example.com/RPM-GPG-KEY-example
```

## Step 2: Verify the Package Signature

```bash
# Check the signature of a specific RPM
rpm --checksig package.rpm

# Detailed signature verification
rpm -Kv package.rpm
```

## Step 3: Check Repository GPG Configuration

```bash
# View the repository configuration
cat /etc/yum.repos.d/example.repo

# Ensure gpgkey points to the correct key file
# [example-repo]
# name=Example Repository
# baseurl=https://repo.example.com/el9/
# enabled=1
# gpgcheck=1
# gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-example
```

## Step 4: Fix a Corrupted RPM Database

```bash
# If GPG keys appear imported but verification still fails
# Rebuild the RPM database
sudo rpm --rebuilddb

# Verify the keys are still present
rpm -qa gpg-pubkey*
```

## Step 5: Verify Package Integrity

```bash
# Check if the download was corrupted
# Download the package again
sudo dnf clean packages
sudo dnf install package-name

# Or manually verify the checksum
sha256sum package.rpm
# Compare with the expected checksum from the repository
```

## Disabling GPG Check (Not Recommended)

This should only be used for testing or trusted internal packages.

```bash
# Install a single package without GPG check
sudo rpm -ivh --nosignature package.rpm

# Or for DNF
sudo dnf install package-name --nogpgcheck

# Disable GPG check for a specific repo (not recommended for production)
# Set gpgcheck=0 in the repo file
```

Always import the proper GPG key rather than disabling signature verification. GPG checks protect your system from tampered packages that could introduce malware.
