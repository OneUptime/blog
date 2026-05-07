# How to Use asdf to Manage Multiple OpenTofu Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Asdf, Version Management, DevOps, Infrastructure as Code, Shell

Description: Learn how to use asdf as a universal version manager to manage multiple OpenTofu versions alongside other tools like Node.js, Python, and kubectl.

---

asdf is a universal version manager that handles OpenTofu, Node.js, Python, Ruby, kubectl, and dozens of other tools from a single interface. If your team already uses asdf, adding OpenTofu version management requires just three commands and keeps all your tool versions consistent in one `.tool-versions` file.

---

## Install asdf

```bash
# Install asdf with Homebrew (recommended on macOS/Linux)
brew install asdf

# Add to your shell config
# For Bash:
echo 'export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"' >> ~/.bash_profile

# For Zsh:
echo 'export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$PATH"' >> ~/.zshrc

# Reload shell
source ~/.bash_profile  # or source ~/.zshrc

# Verify
asdf version
```

---

## Add the OpenTofu Plugin

```bash
# Add the OpenTofu plugin to asdf
asdf plugin add opentofu https://github.com/virtualroot/asdf-opentofu.git

# Verify the plugin was added
asdf plugin list
# opentofu
```

---

## Install OpenTofu Versions

```bash
# List all available OpenTofu versions
asdf list all opentofu

# Install specific versions
asdf install opentofu 1.8.5
asdf install opentofu 1.9.0

# Install the latest version
asdf install opentofu latest

# List installed versions
asdf list opentofu
#   1.8.5
#   1.9.0
#   1.11.6
```

---

## Set the OpenTofu Version

```bash
# Set a default version in your home directory
asdf set -u opentofu 1.9.0

# Set a project version (creates .tool-versions in current directory)
asdf set opentofu 1.8.5

# Confirm the active version
tofu version
# OpenTofu v1.8.5 on linux_amd64
```

---

## The .tool-versions File

asdf uses a `.tool-versions` file to pin all tool versions for a project.

```bash
# .tool-versions - pin all tools for this project
# Commit this file to your repository
opentofu 1.8.5
nodejs 20.11.0
python 3.11.6
kubectl 1.29.0

# asdf reads this file automatically when you cd into the directory
cd my-infra-project
tofu version
# OpenTofu v1.8.5  ← automatically selected
```

---

## Manage Multiple Projects with Different Versions

```bash
# Project A needs OpenTofu 1.7.3
mkdir project-a && cd project-a
asdf set opentofu 1.7.3
tofu version
# OpenTofu v1.7.3

# Project B needs OpenTofu 1.9.0
mkdir ../project-b && cd ../project-b
asdf set opentofu 1.9.0
tofu version
# OpenTofu v1.9.0

# Switching directories automatically switches versions
cd ../project-a
tofu version
# OpenTofu v1.7.3
```

---

## Integrate asdf with CI/CD

```yaml
# .github/workflows/tofu.yml - use asdf to install correct version
- name: Install asdf
  uses: asdf-vm/actions/setup@v4

- name: Install OpenTofu via asdf
  run: |
    asdf plugin add opentofu https://github.com/virtualroot/asdf-opentofu.git
    asdf install opentofu  # reads version from .tool-versions
    tofu version
```

---

## Summary

asdf is the best choice for teams that manage multiple language and infrastructure tool versions in one place. After adding the OpenTofu plugin, use `asdf install opentofu <version>` to install versions and add `opentofu <version>` to your project's `.tool-versions` file for automatic version selection. One file handles all tool version pins for the entire team.
