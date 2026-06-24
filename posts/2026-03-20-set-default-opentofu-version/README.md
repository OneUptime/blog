# How to Set a Default OpenTofu Version System-Wide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Management, System Configuration, Infrastructure as Code, DevOps

Description: A guide to setting a default OpenTofu version system-wide for all users and sessions on Linux and macOS.

## Introduction

Setting a system-wide default OpenTofu version ensures that all users and shell sessions that inherit the system PATH use the same version by default. This is particularly important for shared build servers, CI/CD agents, and team workstations.

## Method 1: System-Wide Default with tofuenv

```bash
# Install tofuenv system-wide

sudo git clone --depth=1 https://github.com/tofuutils/tofuenv.git /usr/local/tofuenv

# Add to system PATH
echo 'export PATH="/usr/local/tofuenv/bin:$PATH"' | sudo tee /etc/profile.d/tofuenv.sh
sudo chmod 755 /etc/profile.d/tofuenv.sh

# Install desired version as all users
sudo /usr/local/tofuenv/bin/tofuenv install 1.9.0

# Set global default
sudo /usr/local/tofuenv/bin/tofuenv use 1.9.0

# Reload environment
source /etc/profile.d/tofuenv.sh
```

## Method 2: Direct Binary Installation to System PATH

```bash
TOFU_VERSION="1.9.0"

# Download and install to /usr/local/bin (system-wide)
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"
sudo mv tofu /usr/local/bin/tofu
sudo chmod 755 /usr/local/bin/tofu
sudo chown root:root /usr/local/bin/tofu

# Verify all users can access it
su - anotheruser -c "tofu version"
```

## Method 3: Using update-alternatives (Linux)

```bash
# Install multiple versions
sudo install -m 755 tofu-1.9.0 /usr/local/bin/tofu-1.9.0
sudo install -m 755 tofu-1.8.5 /usr/local/bin/tofu-1.8.5

# Register with update-alternatives
sudo update-alternatives --install /usr/local/bin/tofu tofu /usr/local/bin/tofu-1.9.0 100
sudo update-alternatives --install /usr/local/bin/tofu tofu /usr/local/bin/tofu-1.8.5 90

# Set the default (highest priority wins, or set explicitly)
sudo update-alternatives --set tofu /usr/local/bin/tofu-1.9.0

# Verify
tofu version

# All users get the same version
su - user2 -c "tofu version"
```

## Method 4: Using Package Manager (System-Wide by Default)

```bash
# APT-based systems with the OpenTofu repository configured
sudo apt-get install -y tofu

# Fedora
sudo dnf install -y opentofu

# RHEL, AlmaLinux, and other RPM-based systems with the OpenTofu repository configured
sudo yum install -y tofu

# These packages install a tofu binary that is accessible to all users
which tofu
ls -la "$(command -v tofu)"
```

## Method 5: asdf User Default Version

```bash
# With asdf 0.16+, set the default in the current user's home .tool-versions file
asdf set -u opentofu 1.9.0

# This updates ~/.tool-versions
cat ~/.tool-versions
# opentofu 1.9.0

# For system-wide, each user sets their own home default
# Or use ASDF_OPENTOFU_VERSION=1.9.0 in a centralized /etc/environment file
```

## Setting System-Wide Environment Variables

```bash
# If using tofuenv, set the version for all users via /etc/environment
echo "TOFUENV_TOFU_VERSION=1.9.0" | sudo tee -a /etc/environment

# Or for all bash sessions
cat << 'EOF' | sudo tee /etc/profile.d/opentofu.sh
export TOFUENV_TOFU_VERSION="1.9.0"
# If using tofuenv
export PATH="/usr/local/tofuenv/bin:$PATH"
EOF

sudo chmod +x /etc/profile.d/opentofu.sh
```

## Verifying System-Wide Default

```bash
# Check for all users
for user in $(cut -d: -f1 /etc/passwd); do
  id $user &>/dev/null && \
  su - $user -c "which tofu && tofu version" 2>/dev/null && \
  echo "---"
done

# Check the default binary location
ls -la "$(command -v tofu)"
```

## Conclusion

Setting a system-wide default OpenTofu version is important for shared servers and CI/CD infrastructure. Package managers like apt, dnf, and yum handle this automatically after the appropriate package or repository is configured. For more control over versioning, tools like update-alternatives or tofuenv installed at the system level provide flexible management. Always verify that the default version meets your infrastructure project requirements after making system-wide changes.
