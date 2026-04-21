# How to Switch Between OpenTofu Versions Quickly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Switching, tofuenv, Infrastructure as Code, DevOps

Description: A guide to quickly switching between multiple installed OpenTofu versions using tofuenv, asdf, and manual methods.

## Introduction

Working on multiple infrastructure projects often requires different OpenTofu versions. This guide covers the fastest ways to switch between installed versions without reinstalling them.

## Quick Switch with tofuenv

```bash
# Switch to a specific installed version

tofuenv use 1.9.0

# Verify
tofu version
# OpenTofu v1.9.0

# Switch to another version
tofuenv use 1.8.5
tofu version
# OpenTofu v1.8.5

# Switch to latest installed
tofuenv use latest
```

## Quick Switch with asdf

```bash
# Set default version in ~/.tool-versions
asdf set -u opentofu 1.9.0
tofu version

# Switch to another default version
asdf set -u opentofu 1.8.5
tofu version

# Set local version for current directory
asdf set opentofu 1.7.3
tofu version  # Uses 1.7.3 in this directory
```

## Installing and Switching in One Command

```bash
# Install and immediately switch (tofuenv)
tofuenv install 1.9.0 && tofuenv use 1.9.0

# Install and immediately switch (asdf)
asdf install opentofu 1.9.0 && asdf set -u opentofu 1.9.0
```

## Using Aliases for Version Switching

```bash
# Add to ~/.bashrc or ~/.zshrc
alias tofu18='tofuenv use 1.8.5 && tofu version'
alias tofu19='tofuenv use 1.9.0 && tofu version'
alias tofu110='tofuenv use 1.10.0 && tofu version'

# Use them
tofu19  # Switches to 1.9.0
tofu18  # Switches to 1.8.5
```

## Automatic Switching with .opentofu-version

```bash
# Project A uses 1.9.0
cd ~/projects/project-a
cat .opentofu-version
# 1.9.0
tofuenv use  # reads .opentofu-version
tofu version  # 1.9.0

# Project B uses 1.8.5
cd ~/projects/project-b
cat .opentofu-version
# 1.8.5
tofuenv use
tofu version  # 1.8.5
```

## Switching with direnv

Use direnv for automatic directory-based version switching:

```bash
# Install direnv
# Ubuntu/Debian:
sudo apt-get install -y direnv

# Add to shell
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
# or for zsh:
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
# Reload your shell config (choose one):
source ~/.bashrc   # bash
# source ~/.zshrc  # zsh

# In project directory, create .envrc
cat > .envrc <<'EOF'
# Auto-switch OpenTofu version
if [ -f ".opentofu-version" ]; then
  export TOFUENV_TOFU_VERSION="$(cat .opentofu-version)"
fi
EOF

# Allow the .envrc
direnv allow .
```

## Managing Symlinks for Manual Switching

```bash
# Install multiple versions to separate directories
sudo mv tofu-1.9.0 /usr/local/bin/tofu-1.9.0
sudo mv tofu-1.8.5 /usr/local/bin/tofu-1.8.5

# Switch using update-alternatives (Linux)
sudo update-alternatives --install /usr/local/bin/tofu tofu /usr/local/bin/tofu-1.9.0 100
sudo update-alternatives --install /usr/local/bin/tofu tofu /usr/local/bin/tofu-1.8.5 90

# Interactive switch
sudo update-alternatives --config tofu

# Non-interactive switch
sudo update-alternatives --set tofu /usr/local/bin/tofu-1.9.0
```

## Checking Current Version Before Running

```bash
# Create a helper script that shows version before running tofu
# ~/bin/tofu-with-version
#!/bin/bash
echo "Using: $(tofu version | head -1)"
tofu "$@"
```

```bash
chmod +x ~/bin/tofu-with-version
alias tofu='tofu-with-version'  # Optional: always show version
```

## Conclusion

Switching between OpenTofu versions is effortless with the right tools. tofuenv and asdf are the best options for development machines, providing near-instant switching with a single command. For CI/CD pipelines, use explicit version specifications to ensure reproducibility. Combine these approaches with `.opentofu-version` files in your projects for completely automatic version management.
