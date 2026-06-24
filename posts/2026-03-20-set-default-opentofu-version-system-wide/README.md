# How to Set a Default OpenTofu Version System-Wide - System Wide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Management, tofuenv, Asdf, Linux, macOS, Infrastructure as Code

Description: Learn how to configure a system-wide default OpenTofu version that applies to all users and projects without a local version override.

---

A default OpenTofu version is the version used when no project-specific version file for your tool (`.opentofu-version` for tofuenv or `.tool-versions` for asdf) is present. With tofuenv and asdf this default is normally per user; direct binary installs and environment modules are the system-wide approaches for all users. Setting this correctly ensures new projects start with a sensible baseline and reduces "works on my machine" issues.

---

## Method 1: tofuenv User Default Version

```bash
# Set the tofuenv default for the current user
tofuenv use 1.9.0

# tofuenv commonly stores this default in
cat ~/.tofuenv/version
# 1.9.0

# Any directory without a nearer .opentofu-version override uses this version
cd /tmp
tofu version
# OpenTofu v1.9.0
```

---

## Method 2: asdf Home Default Version

```bash
# Set the home default with current asdf
asdf set -u opentofu 1.9.0

# asdf stores home defaults in
cat ~/.tool-versions
# opentofu 1.9.0

# Verify
tofu version
# OpenTofu v1.9.0
```

---

## Method 3: System-Wide Binary Installation

For a system-wide installation that all users share (without a version manager):

```bash
TOFU_VERSION="1.9.0"

# Download and install to /usr/local/bin (Linux amd64 example; requires sudo)
curl -fLO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"
unzip tofu_${TOFU_VERSION}_linux_amd64.zip
sudo install -m 755 tofu /usr/local/bin/tofu

# Verify for all users
tofu version
# OpenTofu v1.9.0

# Check it's in a system-wide PATH location
which tofu
# /usr/local/bin/tofu
```

---

## Method 4: Environment Module System (HPC/Multi-User Servers)

For multi-user servers with the environment modules system:

```bash
# Create an OpenTofu module file in a MODULEPATH directory
sudo mkdir -p /usr/share/Modules/modulefiles/opentofu
sudo tee /usr/share/Modules/modulefiles/opentofu/1.9.0 > /dev/null << 'EOF'
#%Module1.0
prepend-path PATH /opt/opentofu/1.9.0/bin
setenv OPENTOFU_VERSION 1.9.0
EOF

# Set a default version
sudo ln -sfn 1.9.0 /usr/share/Modules/modulefiles/opentofu/default

# Users load the module
module load opentofu
tofu version
```

---

## Verify the Active Default

```bash
# Check what version is active with no project override
cd ~
tofu version

# With tofuenv: see default vs local priority
tofuenv list
# Shows * next to the currently active version with its source
```

---

## CI/CD Workflow Default

For CI/CD systems (GitHub Actions, GitLab CI), pin the version in the workflow file to ensure consistent defaults.

```yaml
# GitHub Actions - set the default for the pipeline
- name: Install OpenTofu
  uses: opentofu/setup-opentofu@v2
  with:
    tofu_version: "1.9.0"   # this is the default for this workflow

- name: Verify version
  run: tofu version
```

---

## Summary

Setting a default OpenTofu version depends on your version manager: `tofuenv use <version>` sets the tofuenv user default, `asdf set -u opentofu <version>` sets the asdf home default, and direct binary installation to `/usr/local/bin` sets a fixed system version. Project-level `.opentofu-version` files override tofuenv's default, and project-level `.tool-versions` files override asdf's home default.
