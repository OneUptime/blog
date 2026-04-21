# How to Install and Use tofuenv for OpenTofu Version Management (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, tofuenv, Version Management, DevOps, Infrastructure as Code

Description: Learn how to install and use tofuenv to manage multiple OpenTofu versions on your system and pin versions per project.

---

tofuenv is the OpenTofu equivalent of rbenv or nvm - it lets you install multiple OpenTofu versions side by side and switch between them with a single command. It's essential for teams that maintain infrastructure across projects requiring different OpenTofu versions.

---

## Install tofuenv

```bash
# Install tofuenv dependencies on Debian/Ubuntu
sudo apt-get update -y
sudo apt-get install -y jq gnupg

# For macOS:
brew install jq gnupg grep

# Clone tofuenv from GitHub

git clone --depth=1 https://github.com/tofuutils/tofuenv.git ~/.tofuenv

# Add tofuenv to your PATH
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.bashrc
# For Zsh:
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.zshrc

# Reload shell config
source ~/.bashrc  # or source ~/.zshrc

# Verify installation
tofuenv --version
```

---

## Install OpenTofu Versions with tofuenv

```bash
# List all available OpenTofu versions
tofuenv list-remote

# Install the latest stable version
tofuenv install latest

# Install a specific version
tofuenv install 1.9.0

# Install multiple versions side by side
tofuenv install 1.7.3
tofuenv install 1.8.5
tofuenv install 1.9.0

# List installed versions
tofuenv list
#   1.7.3
#   1.8.5
# * 1.9.0 (set by /home/user/.tofuenv/version)
```

---

## Switch Between Versions

```bash
# Switch to a specific version globally
tofuenv use 1.8.5

# Confirm the active version
tofu version
# OpenTofu v1.8.5

# Switch to the latest installed version
tofuenv use latest
```

---

## Pin a Version Per Project

Create a `.opentofu-version` file in your project directory to pin the version for that project.

```bash
# Change into your project directory
cd /path/to/your/project

# Create a version pin file for the current project
echo "1.8.5" > .opentofu-version

# tofuenv will automatically use this version in this directory
tofu version
# OpenTofu v1.8.5  (pinned by .opentofu-version)

# Commit the version file to your repository
git add .opentofu-version
git commit -m "Pin OpenTofu version to 1.8.5"
```

---

## Set a Global Default Version

```bash
# Set a global default (used when no .opentofu-version file exists)
tofuenv use 1.9.0

# The global version is stored at
cat ~/.tofuenv/version
# 1.9.0
```

---

## Uninstall a Version

```bash
# Remove an OpenTofu version you no longer need
tofuenv uninstall 1.7.3

# Verify it's gone
tofuenv list
```

---

## tofuenv with CI/CD

In CI/CD pipelines, use tofuenv to ensure the correct version is used.

```yaml
# .github/workflows/tofu.yml
- uses: actions/checkout@v6

- name: Set up tofuenv
  run: |
    git clone --depth=1 https://github.com/tofuutils/tofuenv.git ~/.tofuenv
    echo "$HOME/.tofuenv/bin" >> "$GITHUB_PATH"

- name: Install OpenTofu version from .opentofu-version
  run: |
    tofuenv install   # reads .opentofu-version from repo root
    tofuenv use $(cat .opentofu-version)
    tofu version
```

---

## Summary

tofuenv makes managing multiple OpenTofu versions effortless. After installation, use `tofuenv install <version>` to add a version and `tofuenv use <version>` to activate it. Add a `.opentofu-version` file to each project repository to ensure every team member and CI/CD pipeline uses the same version automatically.
