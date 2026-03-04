# How to Fix 'GPG Key Retrieval Failed' Errors When Adding Repositories on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GPG, Repositories, Troubleshooting, Linux

Description: Learn how to diagnose and fix GPG key retrieval failures when adding or enabling third-party repositories on RHEL systems.

---

When you add a new repository to RHEL and run `dnf install`, you may encounter the error "GPG key retrieval failed" or "Couldn't open file /etc/pki/rpm-gpg/RPM-GPG-KEY-...". This happens when the repository metadata is signed with a GPG key that your system does not have or cannot fetch.

## Identifying the Problem

First, check which repositories are configured and their GPG settings:

```bash
# List all configured repositories and their GPG key paths
dnf repolist -v 2>/dev/null | grep -E "Repo-id|Repo-gpgcheck|Repo-gpgkey"
```

You can also inspect the repo file directly:

```bash
# View the repo configuration that is failing
cat /etc/yum.repos.d/example.repo
```

Look for the `gpgkey=` line. The URL or file path listed there is where DNF expects to find the GPG key.

## Manually Importing a GPG Key

If the key file exists at a remote URL but automatic retrieval fails (often due to proxy or firewall issues), download and import it manually:

```bash
# Download the GPG key from the repository provider
curl -o /tmp/repo-gpg-key https://example.com/RPM-GPG-KEY-example

# Inspect the key before importing it
file /tmp/repo-gpg-key
gpg --show-keys /tmp/repo-gpg-key

# Import the key into the RPM database
sudo rpm --import /tmp/repo-gpg-key
```

## Verifying Imported Keys

After importing, confirm the key is present:

```bash
# List all imported GPG keys in the RPM database
rpm -qa gpg-pubkey* --qf '%{NAME}-%{VERSION}-%{RELEASE}\t%{SUMMARY}\n'
```

## Fixing the Repo Configuration

If the `gpgkey` path in the `.repo` file points to a missing local file, copy the key to the expected location:

```bash
# Copy the downloaded key to the standard location
sudo cp /tmp/repo-gpg-key /etc/pki/rpm-gpg/RPM-GPG-KEY-example

# Update the repo file to reference the local path
sudo sed -i 's|gpgkey=.*|gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-example|' /etc/yum.repos.d/example.repo
```

## Temporary Workaround

If you trust the repository and need to proceed quickly, you can temporarily disable GPG checking for a single transaction:

```bash
# Install a package without GPG verification (use with caution)
sudo dnf install --nogpgcheck package-name
```

This should only be used in development or testing environments. For production, always import the correct GPG key.

## Cleaning the Cache

After fixing the key, clean the DNF cache and retry:

```bash
# Clear cached metadata and retry
sudo dnf clean all
sudo dnf makecache
```

This resolves most GPG key retrieval failures on RHEL systems.
