# How to Install and Use tofuenv for OpenTofu Version Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, tofuenv, Version Management, Infrastructure as Code, DevOps

Description: A complete guide to using tofuenv to install, manage, and switch between multiple OpenTofu versions.

## Introduction

tofuenv is a version manager for OpenTofu, similar to rbenv for Ruby or nvm for Node.js. It allows you to install multiple OpenTofu versions and switch between them easily, making it ideal for teams working with multiple projects that require different OpenTofu versions.

## Installing tofuenv

### On Linux and macOS (Manual)

```bash
# Clone tofuenv to ~/.tofuenv

git clone --depth=1 https://github.com/tofuutils/tofuenv.git ~/.tofuenv

# Add to PATH
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.zshrc

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

### On macOS via Homebrew

```bash
# Install via Homebrew
brew install tofuenv

# Verify installation
tofuenv --version
```

Before using `tofuenv list-remote` or `tofuenv install`, install `jq`. On manual macOS installs, upstream also requires GNU `grep`, and `gnupg` is optional if you want GPG signature verification during OpenTofu downloads.

## Basic tofuenv Commands

### List Available Versions

```bash
# List all available OpenTofu versions for installation
tofuenv list-remote

# Filter for a specific major/minor version
tofuenv list-remote | grep "^1.9"
```

### Install a Version

```bash
# Install a specific version
tofuenv install 1.9.0

# Install the latest stable version
tofuenv install latest

# Install the latest version matching a pattern
tofuenv install latest:^1.8

# Install based on .opentofu-version file
tofuenv install
```

### Switch Between Versions

```bash
# List installed versions
tofuenv list

# Use a specific version globally
tofuenv use 1.9.0

# Use a version for the current directory only (creates .opentofu-version)
echo "1.9.0" > .opentofu-version

# Verify active version
tofu version
```

### Uninstall a Version

```bash
# Remove a specific version
tofuenv uninstall 1.8.0

# List remaining versions
tofuenv list
```

## Project-Level Version Pinning

```bash
# Create a .opentofu-version file in your project root
cd /path/to/your/project
echo "1.9.0" > .opentofu-version

# tofuenv automatically uses this version in the directory
tofu version
# OpenTofu v1.9.0
```

## tofuenv with Team Projects

```bash
# In your project repository, commit the version file
git add .opentofu-version
git commit -m "Pin OpenTofu version to 1.9.0"

# Team members install the correct version
tofuenv install  # reads .opentofu-version automatically
```

## Integration with required_version

```hcl
# main.tf
terraform {
  # This should match your .opentofu-version file
  required_version = "= 1.9.0"
}
```

## Automatically Switching Versions

`tofuenv` already checks `.opentofu-version` files in the current and parent directories when you run `tofu`, so no extra shell hook is required for version switching.

## Verifying tofuenv Setup

```bash
# Check tofuenv version
tofuenv --version

# Check active OpenTofu version
tofuenv version-name

# List all installed versions (* marks active)
tofuenv list
# * 1.9.0 (set by /path/to/project/.opentofu-version)
#   1.8.5
#   1.7.3
```

## Conclusion

tofuenv is the most flexible way to manage multiple OpenTofu versions. By using `.opentofu-version` files in each project, teams can ensure everyone uses the correct version without manual coordination. This eliminates the "works on my machine" problem for OpenTofu version mismatches and makes CI/CD pipeline version management straightforward.
