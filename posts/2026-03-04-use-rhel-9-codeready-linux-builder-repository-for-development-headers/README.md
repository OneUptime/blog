# How to Use RHEL CodeReady Linux Builder Repository for Development Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Development, Repositories, Linux

Description: Learn how to use RHEL CodeReady Linux Builder Repository for Development Headers on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to use the RHEL CodeReady Linux Builder repository for development headers. Following these steps will help you enable the repository and install development packages on RHEL 9.

## Prerequisites

- RHEL 9 with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A registered system with an active Red Hat subscription

## Overview

The CodeReady Linux Builder repository provides additional packages for developers, including many `-devel` packages. It is available with RHEL subscriptions, but packages in this repository are not supported by Red Hat.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf group install -y "Development Tools"
```

## Step 2: Enable the CodeReady Linux Builder Repository

```bash
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(uname -m)-rpms
```

Verify that the repository is enabled:

```bash
sudo dnf repolist | grep codeready-builder
```

## Step 3: Install Development Headers

Install the development package you need. For example, to install libbpf development headers:

```bash
sudo dnf install -y libbpf-devel
```

Replace `libbpf-devel` with the specific `-devel` package required by your build.

## Step 4: Verify the Package

```bash
rpm -qi libbpf-devel
```

## Step 5: Verify the Repository Configuration

List enabled repositories:

```bash
sudo dnf repolist
```

Check package availability from the CodeReady Linux Builder repository:

```bash
sudo dnf repository-packages codeready-builder-for-rhel-9-$(uname -m)-rpms list | grep -- '-devel'
```

## Step 6: Install a Package from the Repository Temporarily

If you do not want to leave the repository enabled permanently, install a package by enabling it for a single transaction:

```bash
sudo dnf install --enablerepo=codeready-builder-for-rhel-9-$(uname -m)-rpms libbpf-devel
```

## Step 7: Disable the Repository When Not Needed

You can disable the repository after installing the required packages:

```bash
sudo subscription-manager repos --disable codeready-builder-for-rhel-9-$(uname -m)-rpms
```

## Security Considerations

- Enable CodeReady Linux Builder only when you need packages from it
- Use packages from BaseOS and AppStream when they are available there
- Remember that Red Hat does not support packages included in CodeReady Linux Builder
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Repository not found**: Verify that the system is registered with `subscription-manager status`
2. **Package not found**: Check the exact package name with `dnf search <name>` or `dnf list '*-devel'`
3. **Wrong architecture**: Confirm the repository ID matches your architecture with `uname -m`

## Conclusion

You have successfully configured the RHEL CodeReady Linux Builder repository for development headers on RHEL 9. Monitor enabled repositories regularly and keep packages updated to maintain security and stability.
