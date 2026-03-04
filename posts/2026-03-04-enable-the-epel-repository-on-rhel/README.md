# How to Enable the EPEL Repository on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, EPEL, Repository, Packages, Linux

Description: Enable the Extra Packages for Enterprise Linux (EPEL) repository on RHEL to access thousands of additional community-maintained packages.

---

EPEL (Extra Packages for Enterprise Linux) provides packages that are not included in the default RHEL repositories. It is maintained by the Fedora community and is widely used for tools like htop, nginx (community build), and many development libraries.

## Prerequisites

Your system must be registered with Red Hat and have the CodeReady Builder repository enabled, as some EPEL packages depend on it.

```bash
# Enable CodeReady Builder (RHEL 9)
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-x86_64-rpms

# For RHEL 8
# sudo subscription-manager repos --enable codeready-builder-for-rhel-8-x86_64-rpms
```

## Install EPEL

```bash
# Install EPEL for RHEL 9
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# For RHEL 8
# sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm
```

## Verify EPEL is Enabled

```bash
# List repos and confirm EPEL is present
sudo dnf repolist

# You should see something like:
# epel        Extra Packages for Enterprise Linux 9 - x86_64

# Check the number of packages available
sudo dnf repoinfo epel
```

## Install Packages from EPEL

```bash
# Install htop (a popular EPEL package)
sudo dnf install -y htop

# Install other commonly used EPEL packages
sudo dnf install -y ncdu jq mosh

# Verify which repo a package comes from
dnf info htop | grep Repository
```

## Disable EPEL Temporarily

If you want to install from RHEL repos only:

```bash
# Install a package while skipping EPEL
sudo dnf install --disablerepo=epel -y somepackage

# Or disable EPEL entirely
sudo dnf config-manager --set-disabled epel
```

## Re-Enable EPEL

```bash
# Re-enable the EPEL repo
sudo dnf config-manager --set-enabled epel
```

## Security Considerations

EPEL packages are community-maintained and not supported by Red Hat. For production systems, consider using EPEL selectively. You can protect specific packages from being overridden by EPEL by using the `exclude` directive in the repo configuration or by using `dnf versionlock`.
