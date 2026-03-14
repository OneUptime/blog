# How to Install Terraform on macOS with Homebrew

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, MacOS, Homebrew, Installation, DevOps, Infrastructure as Code

Description: Learn how to install Terraform on macOS using Homebrew package manager with step-by-step instructions covering installation, verification, and troubleshooting.

---

If you are working on macOS and want to get started with Terraform, Homebrew is by far the quickest and cleanest way to install it. Homebrew handles downloading the correct binary, placing it in your PATH, and managing updates - so you can focus on writing infrastructure code instead of fighting with installation steps.

In this post, I will walk you through the entire process from installing Homebrew (if you do not already have it) to verifying that Terraform is working correctly on your Mac.

## Prerequisites

Before we get started, make sure you have the following:

- A Mac running macOS 12 (Monterey) or later
- Terminal access (you can use the built-in Terminal app or iTerm2)
- Admin privileges on your machine
- An internet connection

## Step 1 - Install Homebrew (If Not Already Installed)

Most macOS developers already have Homebrew installed, but if you do not, open Terminal and run the following:

```bash
# Install Homebrew from the official install script
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Once the installation finishes, verify that Homebrew is working:

```bash
# Check Homebrew version to confirm installation
brew --version
```

You should see output like `Homebrew 4.x.x`. If Homebrew is not found, you may need to add it to your PATH. The installer usually prints instructions for this at the end of the install process.

For Apple Silicon Macs (M1/M2/M3), Homebrew installs to `/opt/homebrew`. You may need to add this to your shell profile:

```bash
# Add Homebrew to PATH for Apple Silicon Macs (add to ~/.zshrc)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

## Step 2 - Add the HashiCorp Tap

HashiCorp maintains their own Homebrew tap (a third-party repository of formulae). This tap provides the official Terraform builds directly from HashiCorp, which means you get the latest versions faster than the default Homebrew core repository.

```bash
# Add HashiCorp's official tap to Homebrew
brew tap hashicorp/tap
```

You should see output confirming the tap was added. This only needs to be done once.

## Step 3 - Install Terraform

Now install Terraform from the HashiCorp tap:

```bash
# Install Terraform from the HashiCorp tap
brew install hashicorp/tap/terraform
```

This downloads and installs the latest stable version of Terraform. The installation typically takes less than a minute depending on your internet connection.

If you previously installed Terraform from the default Homebrew core (without the tap), you might see a conflict. In that case, unlink the old version first:

```bash
# Unlink old Terraform if installed from core
brew unlink terraform

# Then install from the HashiCorp tap
brew install hashicorp/tap/terraform
```

## Step 4 - Verify the Installation

Let us confirm that Terraform was installed correctly:

```bash
# Check the installed Terraform version
terraform -version
```

You should see output similar to:

```text
Terraform v1.7.x
on darwin_arm64
```

The `darwin_arm64` part indicates you are running on an Apple Silicon Mac. On Intel Macs, it will show `darwin_amd64`.

You can also check where the binary was installed:

```bash
# Find the location of the terraform binary
which terraform
```

On Apple Silicon, this will typically show `/opt/homebrew/bin/terraform`. On Intel Macs, it will be `/usr/local/bin/terraform`.

## Step 5 - Test with a Simple Configuration

Let us make sure Terraform actually works by running a quick test:

```bash
# Create a test directory
mkdir ~/terraform-test && cd ~/terraform-test

# Create a minimal Terraform configuration
cat > main.tf <<EOF
# Simple Terraform config to verify installation
terraform {
  required_version = ">= 1.0"
}

output "hello" {
  value = "Terraform is working!"
}
EOF

# Initialize and apply
terraform init
terraform apply -auto-approve
```

If everything is set up correctly, you should see the output `hello = "Terraform is working!"`. Clean up after the test:

```bash
# Remove the test directory
cd ~ && rm -rf ~/terraform-test
```

## Updating Terraform

One of the big advantages of using Homebrew is easy updates. When a new version of Terraform is released, just run:

```bash
# Update Homebrew formulae
brew update

# Upgrade Terraform to the latest version
brew upgrade hashicorp/tap/terraform
```

It is a good idea to run `brew update` first so Homebrew knows about the latest available versions.

## Uninstalling Terraform

If you ever need to remove Terraform:

```bash
# Uninstall Terraform via Homebrew
brew uninstall hashicorp/tap/terraform
```

This removes the binary cleanly. Note that this does not remove any Terraform state files or configuration files in your project directories - those are separate from the binary.

## Troubleshooting Common Issues

### "terraform: command not found"

This usually means Terraform is not in your PATH. Check your shell profile (`.zshrc` for Zsh or `.bash_profile` for Bash) and make sure Homebrew's bin directory is included:

```bash
# Check if Homebrew bin is in your PATH
echo $PATH | tr ':' '\n' | grep brew
```

### Permission Errors

If you see permission errors during installation, do not use `sudo` with Homebrew. Instead, fix the permissions:

```bash
# Fix Homebrew directory permissions
sudo chown -R $(whoami) $(brew --prefix)/*
```

### Conflicts with Existing Installation

If you installed Terraform manually before (by downloading the binary directly), you may have conflicts. Remove the old binary first:

```bash
# Find and remove any manually installed terraform binary
sudo rm -f /usr/local/bin/terraform
```

Then run the Homebrew install again.

### Behind a Corporate Proxy

If you are behind a proxy and Homebrew cannot download packages, set the proxy environment variables before running brew commands:

```bash
# Set proxy for Homebrew downloads
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

## Why Use the HashiCorp Tap Instead of Core?

You might wonder why we use `hashicorp/tap/terraform` instead of just `brew install terraform`. There are a few good reasons:

1. **Faster updates** - The HashiCorp tap is updated as soon as new versions are released, while the core Homebrew repository may lag behind.
2. **Official builds** - The tap provides binaries built and signed by HashiCorp directly.
3. **Consistency** - Using the tap ensures you are getting the same binaries that HashiCorp distributes on their website.

## Next Steps

Now that you have Terraform installed, you are ready to start building infrastructure. Here are some good next steps:

- Set up shell autocomplete to make working with Terraform commands faster (see [How to Set Up Terraform Shell Autocomplete in Bash and Zsh](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-terraform-shell-autocomplete-in-bash-and-zsh/view))
- Learn the core Terraform workflow of writing, planning, and applying configurations
- Configure your first cloud provider (AWS, Azure, or GCP)
- Set up a remote backend for state management

Homebrew makes maintaining Terraform on macOS straightforward. You get easy installs, simple upgrades, and clean uninstalls - all without manually downloading binaries or managing your PATH. It is the approach I recommend for any Mac user getting started with Terraform.
