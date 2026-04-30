# How to Install OpenTofu on Arch Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Arch Linux, AUR, Installation, Infrastructure as Code, DevOps

Description: A guide to installing OpenTofu on Arch Linux using the AUR and other available methods.

## Introduction

Arch Linux follows a rolling release model and provides access to the latest software through its official repositories and the Arch User Repository (AUR). This guide covers installing OpenTofu on Arch Linux using multiple methods.

## Prerequisites

- Arch Linux with a working internet connection
- `sudo` privileges
- `base-devel` package group installed (for AUR builds)

## Method 1: Install via the Official Repository

OpenTofu is available in the Arch Linux extra repository:

```bash
# Sync the package database and install OpenTofu

sudo pacman -Syu opentofu
```

## Method 2: Install via AUR (opentofu-bin)

The AUR provides pre-built binaries for faster installation:

### Using yay (recommended AUR helper)

```bash
# Install yay if not already installed
sudo pacman -S --needed git base-devel
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si

# Install OpenTofu from AUR
yay -S opentofu-bin
```

### Using paru

```bash
# Install paru
sudo pacman -S --needed git base-devel
git clone https://aur.archlinux.org/paru.git
cd paru
makepkg -si

# Install OpenTofu
paru -S opentofu-bin
```

### Manual AUR Installation

```bash
# Clone the AUR package
git clone https://aur.archlinux.org/opentofu-bin.git
cd opentofu-bin

# Build and install
makepkg -si
```

## Method 3: Install from Binary

```bash
TOFU_VERSION="1.11.6"

# Install required tools
sudo pacman -S curl unzip

# Download OpenTofu
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"

# Extract and install
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu
```

## Verifying the Installation

```bash
# Check the installed version
tofu version

# Verify binary location
which tofu
# Expected: /usr/bin/tofu or /usr/local/bin/tofu
```

## Setting Up Shell Completion

```bash
# For bash
tofu -install-autocomplete
source ~/.bashrc

# For zsh (common on Arch)
tofu -install-autocomplete
source ~/.zshrc
```

## Quick Test

```hcl
# ~/test-tofu/main.tf
terraform {
  required_version = ">= 1.6"
}

variable "distro" {
  type    = string
  default = "Arch Linux"
}

output "welcome" {
  value = "OpenTofu running on ${var.distro}! BTW I use Arch."
}
```

```bash
mkdir ~/test-tofu && cd ~/test-tofu
# Create main.tf with content above
tofu init
tofu apply -auto-approve
```

## Keeping OpenTofu Updated

```bash
# Update using pacman (official repo)
sudo pacman -Syu opentofu

# Update using yay (AUR)
yay -Syu opentofu-bin

# Update using paru (AUR)
paru -Syu opentofu-bin
```

## Removing OpenTofu

```bash
# Remove using pacman
sudo pacman -Rs opentofu

# Remove AUR package
yay -Rs opentofu-bin
```

## Conclusion

Arch Linux offers multiple methods for installing OpenTofu, with the AUR providing the most flexibility for version selection. Whether using the official repository or AUR, OpenTofu integrates naturally with the Arch package management system, making it easy to maintain alongside your other software.
