# How to Install Terraform Using tfenv for Version Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Tfenv, Version Management, DevOps, Installation, Infrastructure as Code

Description: Learn how to install and use tfenv to manage multiple Terraform versions on your system with automatic version switching per project.

---

If you work on multiple Terraform projects, you have probably run into version conflicts. One project requires Terraform 1.5, another needs 1.7, and a third is still on 1.3. Manually swapping binaries is tedious and error-prone. That is where tfenv comes in.

tfenv is a version manager for Terraform, inspired by rbenv for Ruby. It lets you install multiple Terraform versions, switch between them, and even auto-select the right version per project directory. In this guide, I will walk through installing tfenv, managing Terraform versions, and setting up automatic version switching.

## What is tfenv?

tfenv is an open-source tool that manages Terraform binary installations on your machine. It works by:

1. Maintaining a directory of Terraform binaries (one per version)
2. Creating a shim that intercepts `terraform` commands and routes them to the correct version
3. Reading `.terraform-version` files to automatically select the right version per project

Think of it like nvm for Node.js or pyenv for Python, but for Terraform.

## Installing tfenv

### On macOS with Homebrew

```bash
# Install tfenv via Homebrew
brew install tfenv
```

Important: If you already have Terraform installed via Homebrew, uninstall it first to avoid conflicts:

```bash
# Remove existing Terraform installation
brew uninstall terraform
# or
brew uninstall hashicorp/tap/terraform
```

### On Linux (Manual Installation)

```bash
# Clone the tfenv repository
git clone --depth=1 https://github.com/tfutils/tfenv.git ~/.tfenv

# Add tfenv to your PATH (add to ~/.bashrc or ~/.zshrc for persistence)
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

For Zsh users:

```bash
# Add tfenv to PATH in .zshrc
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Verify tfenv Installation

```bash
# Check tfenv version
tfenv --version
```

## Installing Terraform Versions with tfenv

### Install a Specific Version

```bash
# Install a specific Terraform version
tfenv install 1.7.5

# Install another version
tfenv install 1.6.6

# Install yet another version
tfenv install 1.5.7
```

### Install the Latest Version

```bash
# Install the latest stable version
tfenv install latest
```

### Install the Latest Version Matching a Pattern

```bash
# Install the latest 1.6.x version
tfenv install latest:^1.6

# Install the latest 1.5.x version
tfenv install latest:^1.5
```

### List Available Versions

```bash
# List all Terraform versions available for installation
tfenv list-remote

# List only recent versions (pipe to head)
tfenv list-remote | head -20
```

### List Installed Versions

```bash
# List all locally installed Terraform versions
tfenv list
```

Output looks like:

```text
  1.7.5
  1.6.6
* 1.5.7 (set by /home/user/.tfenv/version)
```

The asterisk indicates the currently active version.

## Switching Between Versions

### Set a Global Default Version

```bash
# Set the global default Terraform version
tfenv use 1.7.5

# Verify the active version
terraform -version
```

This creates or updates the file `~/.tfenv/version` with the selected version number.

### Set a Project-Specific Version

This is where tfenv really shines. Create a `.terraform-version` file in your project directory:

```bash
# Navigate to your project
cd ~/projects/my-terraform-project

# Set the Terraform version for this project
echo "1.6.6" > .terraform-version

# Verify - tfenv automatically picks up the version
terraform -version
# Should show: Terraform v1.6.6
```

Now, whenever you `cd` into this project directory, tfenv automatically switches to version 1.6.6. When you leave the directory, it reverts to your global default.

### How Version Resolution Works

tfenv checks for the Terraform version in this order:

1. `TFENV_TERRAFORM_VERSION` environment variable (if set)
2. `.terraform-version` file in the current directory
3. `.terraform-version` file in parent directories (walks up the tree)
4. `~/.tfenv/version` file (global default)

This means you can have a `.terraform-version` file at the root of a monorepo and it applies to all subdirectories.

## Auto-Install on Use

You can configure tfenv to automatically install a version if it is not already present:

```bash
# Enable auto-install (add to ~/.bashrc or ~/.zshrc)
export TFENV_AUTO_INSTALL=true
```

With this setting, if a `.terraform-version` file requests version 1.4.0 and you do not have it installed, tfenv downloads and installs it automatically the first time you run a `terraform` command.

## Committing .terraform-version to Version Control

I strongly recommend committing the `.terraform-version` file to your Git repository:

```bash
# Add .terraform-version to your project
echo "1.7.5" > .terraform-version

# Commit it
git add .terraform-version
git commit -m "Pin Terraform version to 1.7.5"
```

This ensures every developer on your team uses the same Terraform version for the project, eliminating "works on my machine" issues related to version differences.

## Using Min and Max Version Constraints

You can use version constraints in `.terraform-version`:

```bash
# Use the latest installed version matching a constraint
echo "latest:^1.6" > .terraform-version
```

This tells tfenv to use the latest installed version that starts with `1.6`.

## Uninstalling Terraform Versions

```bash
# Remove a specific version
tfenv uninstall 1.5.7

# List remaining versions
tfenv list
```

## Integrating tfenv with CI/CD

In CI/CD pipelines, you can use tfenv to ensure the correct Terraform version is used:

```yaml
# Example GitHub Actions workflow
name: Terraform Plan
on: [push]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tfenv
        run: |
          git clone --depth=1 https://github.com/tfutils/tfenv.git ~/.tfenv
          echo "$HOME/.tfenv/bin" >> $GITHUB_PATH

      - name: Install Terraform
        run: |
          # Reads version from .terraform-version in the repo
          tfenv install
          tfenv use

      - name: Terraform Init and Plan
        run: |
          terraform init
          terraform plan
```

## tfenv vs Other Version Managers

### tfenv vs tfswitch

tfswitch is another popular Terraform version manager. The main differences are:

- **tfenv** uses `.terraform-version` files and has a more Unix-like approach
- **tfswitch** provides an interactive TUI for selecting versions and can read `required_version` from your Terraform configs

Both work well. I prefer tfenv because the `.terraform-version` file approach is simple and explicit.

### tfenv vs asdf

asdf is a universal version manager that supports many tools including Terraform (via a plugin). If you already use asdf for other tools, it makes sense to manage Terraform through it too:

```bash
# Using asdf instead of tfenv
asdf plugin add terraform
asdf install terraform 1.7.5
asdf global terraform 1.7.5
```

If Terraform is the only tool you need to version-manage, tfenv is lighter weight and more focused.

## Troubleshooting

### "tfenv: command not found"

Make sure tfenv's bin directory is in your PATH:

```bash
# Check if tfenv is in PATH
echo $PATH | tr ':' '\n' | grep tfenv

# If not, add it
export PATH="$HOME/.tfenv/bin:$PATH"
```

### Conflicts with System Terraform

If you have Terraform installed via a system package manager and through tfenv, the system version might take precedence. Remove the system installation:

```bash
# On macOS
brew uninstall terraform

# On Debian/Ubuntu
sudo apt-get remove terraform

# On RHEL/CentOS
sudo dnf remove terraform
```

### Hash Verification Failures

If downloads fail hash verification, it is usually a network issue (partial download). Clear the cache and try again:

```bash
# Retry the install
tfenv install 1.7.5
```

## Next Steps

With tfenv set up, managing Terraform versions becomes invisible. You install the versions you need, pin each project to its required version, and forget about it. The right binary is always selected automatically. This is especially valuable on teams where everyone needs to use the same version, and in CI/CD pipelines where consistency matters.
