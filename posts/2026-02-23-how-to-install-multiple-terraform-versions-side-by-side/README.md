# How to Install Multiple Terraform Versions Side by Side

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Version Management, DevOps, Installation, Infrastructure as Code

Description: Learn multiple approaches to running different Terraform versions side by side on the same machine for managing projects with different version requirements.

---

Working with multiple Terraform projects almost always means dealing with different version requirements. Maybe your legacy project runs on Terraform 1.3, your staging environment uses 1.5, and your new greenfield project targets 1.7. You need a way to have all these versions available on the same machine without them stepping on each other.

In this post, I will cover several approaches to running multiple Terraform versions side by side, from simple manual management to automated version switchers.

## Why You Need Multiple Versions

Terraform state files are version-aware. When you run `terraform apply` with version 1.7, the state file gets stamped with that version. If you then try to use version 1.5 on the same project, Terraform may refuse to work or warn about compatibility issues. Upgrading a project's Terraform version is an intentional process, not something that should happen accidentally because you updated your system binary.

Real-world scenarios where multiple versions are needed:

- Managing legacy infrastructure alongside new projects
- Testing configurations against multiple Terraform versions before upgrading
- Following different clients' or teams' version standards
- Running CI/CD pipelines for projects at different version levels

## Approach 1 - Manual Binary Management

The simplest approach is downloading multiple versions and renaming them.

### Download Multiple Versions

```bash
# Create a directory for Terraform binaries
sudo mkdir -p /usr/local/terraform

# Download and install Terraform 1.5.7
curl -LO https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_amd64.zip
unzip terraform_1.5.7_linux_amd64.zip
sudo mv terraform /usr/local/terraform/terraform-1.5.7

# Download and install Terraform 1.6.6
curl -LO https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform_1.6.6_linux_amd64.zip
sudo mv terraform /usr/local/terraform/terraform-1.6.6

# Download and install Terraform 1.7.5
curl -LO https://releases.hashicorp.com/terraform/1.7.5/terraform_1.7.5_linux_amd64.zip
unzip terraform_1.7.5_linux_amd64.zip
sudo mv terraform /usr/local/terraform/terraform-1.7.5

# Clean up zip files
rm -f terraform_*.zip
```

### Create a Switching Script

```bash
# Create a simple version switcher script
cat > /usr/local/bin/tfswitch-manual <<'SCRIPT'
#!/bin/bash
# Simple Terraform version switcher
# Usage: tfswitch-manual 1.7.5

VERSION=$1
BINARY="/usr/local/terraform/terraform-${VERSION}"

if [ -z "$VERSION" ]; then
    echo "Usage: tfswitch-manual <version>"
    echo "Available versions:"
    ls /usr/local/terraform/ | sed 's/terraform-/  /'
    exit 1
fi

if [ ! -f "$BINARY" ]; then
    echo "Error: Terraform ${VERSION} is not installed"
    echo "Available versions:"
    ls /usr/local/terraform/ | sed 's/terraform-/  /'
    exit 1
fi

# Create or update the symlink
sudo ln -sf "$BINARY" /usr/local/bin/terraform
echo "Switched to Terraform ${VERSION}"
terraform -version
SCRIPT

sudo chmod +x /usr/local/bin/tfswitch-manual
```

Now switch versions easily:

```bash
# Switch to version 1.5.7
tfswitch-manual 1.5.7

# Switch to version 1.7.5
tfswitch-manual 1.7.5

# List available versions
tfswitch-manual
```

## Approach 2 - Using tfenv (Recommended)

tfenv is purpose-built for this exact problem. It is the most popular Terraform version manager and handles everything automatically.

```bash
# Install tfenv (macOS)
brew install tfenv

# Install tfenv (Linux)
git clone --depth=1 https://github.com/tfutils/tfenv.git ~/.tfenv
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Install multiple versions:

```bash
# Install several versions
tfenv install 1.5.7
tfenv install 1.6.6
tfenv install 1.7.5

# List installed versions
tfenv list

# Switch globally
tfenv use 1.7.5

# Pin a project to a specific version
cd ~/projects/legacy-infra
echo "1.5.7" > .terraform-version

cd ~/projects/new-infra
echo "1.7.5" > .terraform-version
```

For a deeper dive into tfenv, check out [How to Install Terraform Using tfenv for Version Management](https://oneuptime.com/blog/post/2026-02-23-how-to-install-terraform-using-tfenv-for-version-management/view).

## Approach 3 - Using tfswitch

tfswitch (not to be confused with the manual script above) is another tool that can read version requirements directly from your Terraform configuration files.

### Install tfswitch

```bash
# macOS
brew install warrensbox/tap/tfswitch

# Linux
curl -L https://raw.githubusercontent.com/warrensbox/terraform-switcher/release/install.sh | bash
```

### Use tfswitch

```bash
# Interactive version selection
tfswitch

# Install and switch to a specific version
tfswitch 1.6.6

# Auto-detect from required_version in .tf files
cd ~/projects/my-project
tfswitch  # reads required_version from terraform blocks
```

One nice feature of tfswitch is that it can read the `required_version` constraint from your `terraform {}` block:

```hcl
# main.tf
terraform {
  required_version = "~> 1.6.0"
}
```

Running `tfswitch` in this directory automatically installs and switches to a matching version.

## Approach 4 - Using asdf

If you use asdf to manage versions of other tools (Node.js, Python, Ruby, etc.), you can manage Terraform through it too:

```bash
# Add the Terraform plugin
asdf plugin add terraform

# Install versions
asdf install terraform 1.5.7
asdf install terraform 1.6.6
asdf install terraform 1.7.5

# Set global default
asdf global terraform 1.7.5

# Set project-specific version
cd ~/projects/legacy-infra
asdf local terraform 1.5.7
# This creates a .tool-versions file
```

## Approach 5 - Using Docker

Docker provides perfect version isolation without installing anything on your host machine:

```bash
# Run a specific Terraform version via Docker
docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.5.7 init
docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.5.7 plan

# Run a different version
docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.7.5 init
docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.7.5 plan
```

Create shell aliases for convenience:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias tf15='docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.5.7'
alias tf16='docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.6.6'
alias tf17='docker run --rm -v $(pwd):/workspace -w /workspace hashicorp/terraform:1.7.5'
```

Then use them like:

```bash
tf15 init
tf15 plan
tf17 apply
```

## Comparing the Approaches

Here is a quick comparison to help you decide:

| Approach | Pros | Cons |
|----------|------|------|
| Manual binaries | No dependencies, full control | Manual work, no auto-switching |
| tfenv | Auto-switching, widely used | Terraform-specific tool |
| tfswitch | Reads required_version, interactive TUI | Terraform-specific tool |
| asdf | Manages many tools, one tool to rule them all | More setup, plugin-based |
| Docker | Perfect isolation, no host installs | Slower, credential passing is tricky |

## Best Practices for Managing Multiple Versions

### Pin Versions in Your Projects

Always specify the Terraform version your project expects:

```hcl
# In your terraform block
terraform {
  required_version = "~> 1.7.0"
}
```

And if using tfenv, commit the `.terraform-version` file:

```bash
echo "1.7.5" > .terraform-version
git add .terraform-version
git commit -m "Pin Terraform version to 1.7.5"
```

### Plan Version Upgrades Carefully

When upgrading a project's Terraform version:

1. Read the changelog for breaking changes
2. Test the upgrade in a non-production environment first
3. Run `terraform plan` with the new version before applying anything
4. Upgrade the state file format if prompted

```bash
# Test a version upgrade safely
tfenv use 1.7.5
terraform init -upgrade
terraform plan  # Review the plan carefully before applying
```

### Keep Old Versions Available

Do not remove old versions until all projects have been upgraded:

```bash
# List all installed versions to see what is still needed
tfenv list

# Only remove a version when no project uses it anymore
tfenv uninstall 1.3.9
```

## Conclusion

There is no single best way to manage multiple Terraform versions. The right choice depends on your workflow. For most developers, I recommend tfenv - it is purpose-built for this problem, has automatic per-project switching, and is widely adopted by the Terraform community. If you already use asdf for other tools, leverage that instead. And if you want zero host machine changes, Docker works great at the cost of some extra complexity around credential management and slightly slower execution.
