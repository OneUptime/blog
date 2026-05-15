# How to Install and Manage Python Packages with pipx on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Python, Development, Linux

Description: Learn how to install and Manage Python Packages with pipx on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to install and manage Python command-line applications with pipx on RHEL. Following these steps will help you set up a reliable per-user pipx installation on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

pipx installs Python command-line applications into isolated virtual environments and exposes their executable commands on your PATH. This guide walks through installation, PATH configuration, package management, and verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y python3 python3-pip
```

## Step 2: Install pipx

```bash
python3 -m pip install --user pipx
```

Verify the installation:

```bash
python3 -m pipx --version
```

## Step 3: Configure the PATH

Add the pipx binary directory and the directory for pipx-installed applications to your shell PATH:

```bash
python3 -m pipx ensurepath
```

Open a new terminal session, or reload your shell profile, before running `pipx` directly.

## Step 4: Install and Manage Packages

```bash
pipx install black
pipx list
```

## Step 5: Verify the Configuration

Test the installed application:

```bash
black --version
```

Run a Python application without installing it permanently:

```bash
pipx run pycowsay "pipx is working"
```

## Step 6: Update or Remove Packages

Upgrade one installed application, upgrade all installed applications, or remove an application:

```bash
pipx upgrade black
pipx upgrade-all
pipx uninstall black
```

## Step 7: Performance Tuning

Review where pipx stores applications and virtual environments. The default pipx application binary directory is `~/.local/bin`, and the default virtual environment location on Linux is typically `~/.local/share/pipx`.

```bash
pipx environment
pipx list
```

## Security Considerations

- Install applications as a regular user unless you need them globally for all users
- Use `sudo pipx install --global <package>` only when a system-wide command is required
- Review packages before installing them from PyPI
- Keep pipx and installed applications updated with `python3 -m pip install --user -U pipx` and `pipx upgrade-all`

## Troubleshooting

Common issues and solutions:

1. **`pipx` command not found**: Run `python3 -m pipx ensurepath`, then open a new terminal session
2. **Installed app command not found**: Verify that `~/.local/bin` is in your PATH with `echo $PATH`
3. **Package fails to install**: Confirm that Python and pip are installed with `python3 --version` and `python3 -m pip --version`

## Conclusion

You have successfully configured pipx on RHEL. Use `pipx install`, `pipx list`, `pipx upgrade-all`, and `pipx uninstall` to manage isolated Python command-line applications.
