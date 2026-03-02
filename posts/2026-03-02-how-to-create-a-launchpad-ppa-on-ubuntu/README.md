# How to Create a Launchpad PPA on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packaging, PPA, Launchpad, Distribution

Description: Step-by-step guide to creating a Launchpad PPA on Ubuntu, including GPG key setup, uploading source packages, and distributing software to Ubuntu users.

---

A Personal Package Archive (PPA) on Launchpad is the standard way to distribute software to Ubuntu users outside of the official repositories. PPAs let users add your repository with a single `add-apt-repository` command and receive updates through the normal `apt upgrade` workflow. This makes them ideal for distributing tools, updated versions of existing packages, or software that hasn't made it into Ubuntu's main repositories yet.

## What You Need

- A Launchpad account at https://launchpad.net
- A GPG key pair (for signing packages)
- A properly structured Debian source package
- The `dput` tool for uploading

## Setting Up a Launchpad Account

Register at https://launchpad.net/+login. After registration, your profile URL will be `https://launchpad.net/~yourusername`. Keep this username in mind - it appears in the PPA URL that users will add.

## Generating and Uploading Your GPG Key

Launchpad requires all uploads to be signed with a GPG key. Your public key must be uploaded to Ubuntu's keyserver.

```bash
# Install GPG tools
sudo apt install gnupg -y

# Generate a new GPG key
gpg --gen-key
# Choose: RSA and RSA (default)
# Key size: 4096
# Expiry: 2y (2 years is reasonable)
# Enter your name and email - use the email associated with your Launchpad account

# List your keys to find the key ID
gpg --list-secret-keys --keyid-format LONG

# Output looks like:
# sec   rsa4096/ABCDEF1234567890 2026-03-02 [SC]
#       Key fingerprint = XXXX XXXX XXXX XXXX XXXX  XXXX XXXX XXXX XXXX XXXX
# uid         [ultimate] Your Name <you@example.com>

# Export your key ID (the 16-char hex after rsa4096/)
KEY_ID="ABCDEF1234567890"

# Upload to Ubuntu's keyserver
gpg --keyserver keyserver.ubuntu.com --send-keys $KEY_ID
```

Now link this key to your Launchpad account:
1. Go to https://launchpad.net/~yourusername
2. Click "OpenPGP keys"
3. Enter your full key fingerprint
4. Launchpad will email a verification message encrypted with your key
5. Decrypt the email and follow the link to confirm

```bash
# To decrypt the verification email from Launchpad
gpg --decrypt < encrypted_verification.asc
```

## Creating a PPA on Launchpad

1. Visit https://launchpad.net/~yourusername/+activate-ppa
2. Enter a name (lowercase, no spaces - becomes part of the URL)
3. Enter a display name and description
4. Click "Activate"

Your PPA will be available at:
`https://launchpad.net/~yourusername/+archive/ubuntu/ppa-name`

Users will install it with:
```bash
sudo add-apt-repository ppa:yourusername/ppa-name
```

## Configuring dput for Uploads

`dput` handles the actual upload to Launchpad. Configure it with your PPA details:

```bash
# Install dput
sudo apt install dput -y

# Configure dput - create or edit ~/.dput.cf
cat > ~/.dput.cf << 'EOF'
[launchpad]
fqdn = ppa.launchpad.net
method = ftp
incoming = ~yourusername/ubuntu/ppa-name
login = anonymous
allow_unsigned_uploads = 0
EOF
```

## Preparing a Source Package for Upload

Launchpad builds binary packages from source. You upload source packages, not `.deb` files.

```bash
# Ensure your package builds cleanly
cd ~/build/mypackage-1.0

# Build source-only package (no local binary build)
# -S = source only
# -sa = include orig tarball
# -k = your GPG key ID
dpkg-buildpackage -S -sa -k$KEY_ID

# This creates the .dsc and .changes files needed for upload
ls ~/build/
# mypackage_1.0-1.dsc
# mypackage_1.0-1_source.changes
# mypackage_1.0.orig.tar.xz
# mypackage_1.0-1.debian.tar.xz
```

The `.changes` file must be signed with the same GPG key registered on Launchpad.

## Setting the Target Ubuntu Version

Launchpad builds for specific Ubuntu releases. The `debian/changelog` must specify the target:

```bash
# Edit changelog to target a specific Ubuntu release
# Use 'noble' for 24.04, 'jammy' for 22.04, 'focal' for 20.04

cat > debian/changelog << 'EOF'
mypackage (1.0-1) noble; urgency=medium

  * Initial PPA release

 -- Your Name <you@example.com>  Mon, 02 Mar 2026 12:00:00 +0000
EOF
```

To target multiple Ubuntu releases, upload separate source packages with different changelog entries:

```bash
# Create packages for jammy and noble
for DISTRO in jammy noble; do
  # Update changelog with target distro
  dch --distribution $DISTRO -v "1.0-1~${DISTRO}1" "Build for $DISTRO"

  # Build source package
  dpkg-buildpackage -S -sa -k$KEY_ID

  # Reset changelog (restore original)
  git checkout debian/changelog
done
```

## Uploading to Launchpad

```bash
# Upload the .changes file (dput handles the rest)
dput launchpad ~/build/mypackage_1.0-1_source.changes

# If using a custom dput profile name
dput ppa:yourusername/ppa-name ~/build/mypackage_1.0-1_source.changes
```

After uploading, you'll receive an email from Launchpad confirming the upload was accepted (or rejected with a reason). The build process typically takes 10-30 minutes. Monitor it at your PPA page on Launchpad.

## Monitoring the Build

On the Launchpad PPA page, you can see build status for each architecture (amd64, arm64, etc.). Common build failures include:

- Missing build dependencies (add them to `Build-Depends` in `debian/control`)
- Source doesn't compile cleanly in a minimal environment
- Wrong Ubuntu release codename in the changelog

Click on a failed build to see the full build log.

## Re-uploading After Fixes

If a build fails, increment the version in `debian/changelog` before re-uploading. Launchpad rejects duplicate version numbers:

```bash
# Add a new changelog entry with incremented version
dch -v 1.0-2 "Fix build dependency on libfoo-dev"

# Rebuild source package and re-upload
dpkg-buildpackage -S -sa -k$KEY_ID
dput launchpad ~/build/mypackage_1.0-2_source.changes
```

## User Installation Experience

Once your PPA is published, users install packages like this:

```bash
# Add the PPA
sudo add-apt-repository ppa:yourusername/ppa-name
sudo apt update

# Install the package
sudo apt install mypackage

# Receive updates automatically via apt upgrade
sudo apt upgrade
```

## PPA Best Practices

Keep your PPA's packages current - outdated packages with known security vulnerabilities reflect poorly on you as a maintainer. Document what the PPA contains in the Launchpad description field. If your software eventually gets accepted into Ubuntu's main repositories, let users know they can remove your PPA.

For testing uploads before going public, create a separate "testing" PPA and verify builds there first. Launchpad's build infrastructure closely mirrors what Ubuntu's build systems use, so packages that build there will almost certainly build in Ubuntu proper.
