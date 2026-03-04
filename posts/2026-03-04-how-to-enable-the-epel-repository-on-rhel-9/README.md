# How to Enable the EPEL Repository on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, EPEL

Description: Step-by-step guide on enable the epel repository on rhel 9 with practical examples and commands.

---

The Extra Packages for Enterprise Linux (EPEL) repository provides additional packages for RHEL 9 that are not in the default repositories.

## Prerequisites

Ensure your system is registered and has base repositories enabled:

```bash
sudo subscription-manager repos --enable=rhel-9-for-x86_64-baseos-rpms
sudo subscription-manager repos --enable=rhel-9-for-x86_64-appstream-rpms
sudo subscription-manager repos --enable=codeready-builder-for-rhel-9-x86_64-rpms
```

## Install EPEL

```bash
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
```

## Verify EPEL is Enabled

```bash
sudo dnf repolist
```

You should see `epel` in the list.

## Search for EPEL Packages

```bash
dnf search --repo=epel htop
dnf list available --repo=epel | head -20
```

## Install Packages from EPEL

```bash
sudo dnf install -y htop
sudo dnf install -y neofetch
sudo dnf install -y certbot
```

## Disable EPEL Temporarily

```bash
sudo dnf install -y --disablerepo=epel somepackage
```

## Disable EPEL Permanently

```bash
sudo dnf config-manager --set-disabled epel
```

## Re-enable EPEL

```bash
sudo dnf config-manager --set-enabled epel
```

## Configure EPEL Priority

To prioritize base RHEL repos over EPEL, install the priorities plugin:

```bash
# Set priority in the repo file
sudo vi /etc/yum.repos.d/epel.repo
# Add: priority=10
```

## Conclusion

EPEL extends the available software for RHEL 9 with community-maintained packages. Always prioritize official Red Hat repositories for production workloads and use EPEL selectively for additional tools.

