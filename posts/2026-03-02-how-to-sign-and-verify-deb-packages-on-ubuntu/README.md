# How to Sign and Verify .deb Packages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packaging, GPG, Security, Debian

Description: Learn how to sign .deb packages and repository metadata with GPG on Ubuntu, and verify package signatures to ensure authenticity and integrity before installation.

---

Package signing is the mechanism that allows apt to verify that packages come from a trusted source and haven't been tampered with in transit. When you add a repository, you're trusting its signing key. When apt downloads a package, it verifies the package's hash against the signed repository metadata. This chain of trust is fundamental to Ubuntu's security model.

This post covers signing packages and repository metadata with GPG, and verifying signatures as both a package maintainer and an end user.

## How Package Signing Works in Ubuntu

The trust chain works like this:

1. The repository maintainer signs the `Release` file with their GPG key
2. `Release` contains checksums of all `Packages` files
3. `Packages` files contain checksums of individual `.deb` files
4. apt downloads and verifies this chain before installing anything

Individual `.deb` files are not directly GPG-signed - the integrity guarantee comes through the repository metadata chain.

## Setting Up GPG Keys

```bash
# Install GPG
sudo apt install gnupg -y

# Generate a signing key (use a dedicated key for package signing)
gpg --full-generate-key
# Choose: RSA and RSA
# Key size: 4096 bits
# Expiry: 2y
# Real name and email for the key

# List generated keys
gpg --list-secret-keys --keyid-format LONG

# Export the key ID for use in scripts
GPG_KEY_ID=$(gpg --list-secret-keys --keyid-format LONG | grep sec | awk '{print $2}' | cut -d/ -f2)
echo "Key ID: $GPG_KEY_ID"
```

## Signing a Source Package (.changes file)

When uploading to a PPA or repository, the `.changes` file must be signed:

```bash
# Build source package (unsigned)
cd ~/build/mypackage-1.0
dpkg-buildpackage -S -us -uc

# Sign the .changes file with debsign
debsign -k $GPG_KEY_ID ~/build/mypackage_1.0-1_source.changes

# Or sign during build
dpkg-buildpackage -S -k $GPG_KEY_ID

# Verify the signature on a .changes file
gpg --verify ~/build/mypackage_1.0-1_source.changes
```

## Signing a .deb File Directly

While apt's trust model uses repository-level signing, you can also sign individual `.deb` files for direct distribution:

```bash
# Install dpkg-sig
sudo apt install dpkg-sig -y

# Sign a .deb file
dpkg-sig --sign builder -k $GPG_KEY_ID mypackage_1.0-1_amd64.deb

# Verify the signature
dpkg-sig --verify mypackage_1.0-1_amd64.deb

# Check signature details
dpkg-sig --list mypackage_1.0-1_amd64.deb
```

## Creating a Signed Local Repository

For distributing packages within an organization, set up a signed local repository:

```bash
# Install repository creation tools
sudo apt install dpkg-dev apt-utils -y

# Create directory structure
mkdir -p /opt/myrepo/pool/main
mkdir -p /opt/myrepo/dists/stable/main/binary-amd64

# Copy .deb files to the pool
cp mypackage_1.0-1_amd64.deb /opt/myrepo/pool/main/

# Generate Packages file
cd /opt/myrepo
dpkg-scanpackages pool/main /dev/null | gzip -9c > dists/stable/main/binary-amd64/Packages.gz
dpkg-scanpackages pool/main /dev/null > dists/stable/main/binary-amd64/Packages

# Create the Release file
cat > dists/stable/Release << 'EOF'
Origin: MyOrg
Label: MyOrg Internal
Suite: stable
Codename: stable
Architectures: amd64
Components: main
Description: Internal package repository
EOF

# Add checksums to Release file
cd dists/stable
apt-ftparchive release . >> Release

# Sign the Release file
gpg --default-key $GPG_KEY_ID \
  --clearsign \
  --output InRelease \
  Release

gpg --default-key $GPG_KEY_ID \
  --detach-sign \
  --armor \
  --output Release.gpg \
  Release
```

## Exporting and Distributing the Public Key

Users need your public key to verify packages from your repository:

```bash
# Export public key in armored format
gpg --armor --export $GPG_KEY_ID > myrepo-signing-key.asc

# Display the key fingerprint for verification
gpg --fingerprint $GPG_KEY_ID

# Serve the key via HTTPS (recommended) or on a keyserver
# Upload to Ubuntu keyserver
gpg --keyserver keyserver.ubuntu.com --send-keys $GPG_KEY_ID

# Upload to keys.openpgp.org (preferred modern keyserver)
gpg --keyserver keys.openpgp.org --send-keys $GPG_KEY_ID
```

## Adding a Signed Repository on Client Systems

```bash
# Modern approach (Ubuntu 22.04+) - store key in /etc/apt/keyrings/
sudo mkdir -p /etc/apt/keyrings

# Download and store the signing key
curl -fsSL https://example.com/myrepo-signing-key.asc | \
  sudo gpg --dearmor -o /etc/apt/keyrings/myrepo.gpg

# Add the repository source referencing the key
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/myrepo.gpg] \
  https://example.com/repo stable main" | \
  sudo tee /etc/apt/sources.list.d/myrepo.list

# Update and install
sudo apt update
sudo apt install mypackage
```

## Verifying Package Authenticity

```bash
# Check if a package's repository has a valid signature
apt-cache policy mypackage

# Verify a specific .deb file using dpkg-sig
dpkg-sig --verify /path/to/package.deb

# Check the signature on downloaded packages in apt's cache
ls /var/cache/apt/archives/
dpkg-sig --verify /var/cache/apt/archives/mypackage_1.0-1_amd64.deb

# Inspect what key signed a repository
apt-key list  # (deprecated but still works on older systems)

# Modern approach - view trusted keys
ls /etc/apt/keyrings/
gpg --show-keys /etc/apt/keyrings/myrepo.gpg
```

## Rotating Signing Keys

When a signing key expires or is compromised:

```bash
# Generate a new key
gpg --full-generate-key

# Get the new key ID
NEW_KEY_ID="NEWKEYID1234567890"

# Export the new public key
gpg --armor --export $NEW_KEY_ID > myrepo-new-signing-key.asc

# Re-sign the Release file with the new key
gpg --default-key $NEW_KEY_ID \
  --clearsign \
  --output InRelease \
  Release

# Notify users they need to update their trusted key
# Distribute the new key and update documentation

# Revoke the old key if compromised
gpg --gen-revoke $GPG_KEY_ID > revocation.asc
gpg --import revocation.asc
gpg --keyserver keyserver.ubuntu.com --send-keys $GPG_KEY_ID
```

## Debugging Signature Errors

Common apt signature errors and fixes:

```bash
# "NO_PUBKEY" error - missing public key
# Import the missing key
sudo gpg --keyserver keyserver.ubuntu.com --recv-keys MISSINGKEYID
sudo gpg --export MISSINGKEYID | sudo apt-key add -

# Or with modern approach
sudo gpg --keyserver keyserver.ubuntu.com --recv-keys MISSINGKEYID
sudo gpg --export MISSINGKEYID > /etc/apt/keyrings/myrepo.gpg

# "EXPKEYSIG" error - key has expired
# The maintainer needs to extend the key or rotate to a new one
# As a user, there's nothing you can do except wait for the maintainer

# "BADSIG" error - signature doesn't match
# This can indicate file corruption or a man-in-the-middle attack
# Re-download the repository metadata
sudo apt clean
sudo apt update

# Temporarily bypass signature checking (NOT recommended for production)
sudo apt install --allow-unauthenticated mypackage
```

## Automating Repository Signing

For CI/CD pipelines that publish packages automatically:

```bash
#!/bin/bash
# Script to rebuild and re-sign a repository after adding new packages

REPO_DIR="/opt/myrepo"
KEY_ID="$GPG_KEY_ID"

# Rebuild Packages index
cd "$REPO_DIR"
dpkg-scanpackages pool/main /dev/null > dists/stable/main/binary-amd64/Packages
gzip -9c dists/stable/main/binary-amd64/Packages > dists/stable/main/binary-amd64/Packages.gz

# Rebuild Release file
cd dists/stable
apt-ftparchive release . > Release

# Re-sign
gpg --default-key "$KEY_ID" --batch --yes \
  --clearsign --output InRelease Release

gpg --default-key "$KEY_ID" --batch --yes \
  --detach-sign --armor --output Release.gpg Release

echo "Repository updated and signed."
```

Package signing is a non-negotiable part of distributing software professionally. Taking the time to set it up correctly protects both your users and your reputation as a software distributor.
