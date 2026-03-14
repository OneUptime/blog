# How to Set Up Terraform on Apple Silicon (M1/M2/M3) Macs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Apple Silicon, MacOS, M1, M2, M3, ARM64, Installation, DevOps

Description: Complete guide to installing and configuring Terraform on Apple Silicon Macs including native ARM builds, Rosetta considerations, and provider compatibility.

---

Apple Silicon Macs (M1, M2, M3, and their Pro/Max/Ultra variants) use ARM-based processors instead of Intel's x86 architecture. When Apple first released these chips, tool compatibility was a concern. Today, Terraform fully supports Apple Silicon with native ARM64 binaries, so you get full performance without Rosetta 2 translation.

This guide covers everything you need to know about running Terraform on an Apple Silicon Mac, from installation to handling the occasional provider that does not have a native ARM build.

## Checking Your Mac's Architecture

First, confirm you are running Apple Silicon:

```bash
# Check your processor architecture
uname -m
# Should output: arm64

# Or check the chip type
sysctl -n machdep.cpu.brand_string
# Should show something like: Apple M1, Apple M2, Apple M3, etc.
```

If `uname -m` shows `x86_64`, you might be running your terminal under Rosetta. Check System Information or Activity Monitor to confirm your hardware.

## Installing Terraform (Native ARM64)

### Method 1 - Homebrew (Recommended)

Homebrew on Apple Silicon installs to `/opt/homebrew` (instead of `/usr/local` on Intel Macs). If you have Homebrew set up correctly, it installs native ARM64 binaries automatically.

```bash
# Add the HashiCorp tap
brew tap hashicorp/tap

# Install Terraform (native ARM64 build)
brew install hashicorp/tap/terraform

# Verify the architecture
terraform -version
```

You should see output like:

```text
Terraform v1.7.5
on darwin_arm64
```

The `darwin_arm64` confirms you are running the native ARM64 binary.

### Method 2 - Manual Download

If you prefer to download the binary directly:

```bash
# Download the ARM64 build for macOS
TERRAFORM_VERSION="1.7.5"
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_darwin_arm64.zip"

# Extract and install
unzip "terraform_${TERRAFORM_VERSION}_darwin_arm64.zip"
sudo mv terraform /usr/local/bin/
rm "terraform_${TERRAFORM_VERSION}_darwin_arm64.zip"

# Verify
terraform -version
```

Make sure you download the `darwin_arm64` variant, not `darwin_amd64`.

### Method 3 - tfenv

```bash
# Install tfenv
brew install tfenv

# Install Terraform (automatically detects ARM64)
tfenv install 1.7.5
tfenv use 1.7.5

# Verify
terraform -version
```

tfenv automatically downloads the correct architecture for your system.

## Homebrew Path Configuration

On Apple Silicon Macs, Homebrew's installation path is different from Intel Macs. Make sure your shell profile is configured correctly:

```bash
# Check if Homebrew is in your PATH
which brew
# Should show: /opt/homebrew/bin/brew

# If not, add Homebrew to your PATH in ~/.zshrc
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

This is important because macOS uses Zsh by default, and the Homebrew installer might have added the configuration to `.zprofile` instead of `.zshrc`. If you source `.zshrc` in your terminal but Homebrew's path is in `.zprofile`, you might run into "command not found" issues in certain contexts.

## Rosetta 2 - When You Need It

In most cases, you do not need Rosetta 2 for Terraform. But there are situations where it comes up.

### Installing Rosetta 2

If you need it for any reason:

```bash
# Install Rosetta 2
softwareupdate --install-rosetta --agree-to-license
```

### Running Terraform Under Rosetta

If you absolutely need to run an x86_64 binary (rare, but possible with very old Terraform versions):

```bash
# Run a command under Rosetta translation
arch -x86_64 terraform plan
```

Or set up an entire terminal session in x86_64 mode by duplicating your Terminal app, checking "Open using Rosetta" in its Get Info panel, and running Terraform from there.

## Provider Compatibility

All major Terraform providers now have native ARM64 builds. This includes:

- AWS Provider (`hashicorp/aws`)
- Azure Provider (`hashicorp/azurerm`)
- Google Cloud Provider (`hashicorp/google`)
- Kubernetes Provider (`hashicorp/kubernetes`)
- Docker Provider (`kreuzwerker/docker`)
- And hundreds more

When you run `terraform init`, the provider downloads automatically match your architecture:

```bash
# Initialize a project - providers download as darwin_arm64
terraform init

# Check the downloaded provider architecture
file .terraform/providers/registry.terraform.io/hashicorp/aws/*/darwin_arm64/terraform-provider-aws*
```

### Dealing with Providers That Lack ARM64 Builds

Occasionally, you might encounter a community provider that only has AMD64 builds. Terraform handles this by falling back to Rosetta translation, but you need Rosetta 2 installed.

If a provider init fails with an architecture error:

```bash
# Check if the provider has an ARM64 build
terraform providers lock -platform=darwin_arm64

# If it fails, try adding the AMD64 platform as a fallback
terraform providers lock -platform=darwin_arm64 -platform=darwin_amd64
```

To force a specific platform in your lock file:

```hcl
# In your terraform block, specify both platforms
terraform {
  required_providers {
    someoldprovider = {
      source  = "example/someoldprovider"
      version = "1.0.0"
    }
  }
}
```

```bash
# Generate a lock file for multiple platforms
terraform providers lock \
  -platform=darwin_arm64 \
  -platform=darwin_amd64 \
  -platform=linux_amd64
```

## Performance on Apple Silicon

Terraform runs very well on Apple Silicon. The combination of fast single-core performance and efficient power usage means:

- `terraform plan` on large configurations is fast
- Provider downloads and initialization are quick
- Large state files load rapidly

You will not notice any performance difference compared to a high-end Intel Mac. In fact, Apple Silicon Macs are often faster for Terraform operations due to their strong single-threaded performance.

## Docker and Terraform on Apple Silicon

If you use Docker to run Terraform (see [How to Run Terraform in a Docker Container](https://oneuptime.com/blog/post/2026-02-23-how-to-run-terraform-in-a-docker-container/view)), Docker Desktop on Apple Silicon supports both ARM64 and AMD64 images through emulation:

```bash
# Run the native ARM64 Terraform image (fastest)
docker run --rm --platform linux/arm64 hashicorp/terraform:1.7.5 version

# If no ARM64 image exists, run AMD64 via QEMU emulation (slower)
docker run --rm --platform linux/amd64 hashicorp/terraform:1.7.5 version
```

The official `hashicorp/terraform` Docker image supports multi-architecture, so it will automatically pull the ARM64 variant on your Apple Silicon Mac:

```bash
# This automatically uses the ARM64 image
docker run --rm hashicorp/terraform:1.7.5 version
```

## VS Code on Apple Silicon

Visual Studio Code has a native Apple Silicon build. Combined with the HashiCorp Terraform extension, you get a fully native development experience:

1. Download VS Code for Apple Silicon (the "Apple Silicon" build from the VS Code website or via Homebrew: `brew install --cask visual-studio-code`)
2. Install the HashiCorp Terraform extension from the marketplace
3. The extension's language server runs natively on ARM64

```bash
# Install VS Code via Homebrew (gets the native ARM64 build)
brew install --cask visual-studio-code
```

## Common Issues on Apple Silicon

### "Bad CPU type in executable"

This error means you downloaded the AMD64 binary instead of ARM64:

```bash
# Check the binary architecture
file $(which terraform)
# Should show: Mach-O 64-bit executable arm64

# If it shows x86_64, reinstall the correct version
brew reinstall hashicorp/tap/terraform
```

### Homebrew Installed in /usr/local

If Homebrew was originally installed on an Intel Mac and you migrated, it might be in `/usr/local` (the Intel location) running through Rosetta. Reinstall Homebrew natively:

```bash
# Check Homebrew's installation path
brew --prefix
# Should be /opt/homebrew for Apple Silicon

# If it shows /usr/local, you are running the Intel version
# Install the native version alongside it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Terminal Running Under Rosetta

Make sure your Terminal app is not set to open under Rosetta:

1. Find Terminal in `/Applications/Utilities/`
2. Right-click and select "Get Info"
3. Make sure "Open using Rosetta" is unchecked

If you use iTerm2 or another terminal, check the same setting.

### Slow Provider Downloads

If provider downloads seem slow, it might be a DNS issue specific to Apple Silicon Macs on certain networks. Try switching to a public DNS:

```bash
# Test DNS resolution speed
time nslookup releases.hashicorp.com

# If slow, consider switching to Google DNS or Cloudflare DNS
# in System Preferences > Network > Advanced > DNS
```

## Terraform Development on Apple Silicon

If you are developing Terraform providers (writing Go code that compiles to a provider binary), Apple Silicon is well-supported by the Go compiler:

```bash
# Install Go (native ARM64 build via Homebrew)
brew install go

# Build a provider for the local architecture
go build -o terraform-provider-example

# Cross-compile for other architectures
GOOS=linux GOARCH=amd64 go build -o terraform-provider-example-linux-amd64
GOOS=linux GOARCH=arm64 go build -o terraform-provider-example-linux-arm64
```

## Conclusion

Terraform on Apple Silicon just works. The native ARM64 builds are available for both the Terraform binary itself and all major providers. Unless you are using a very niche community provider that only publishes AMD64 builds, you should not encounter any architecture-related issues. Install via Homebrew, verify you see `darwin_arm64` in the version output, and you are good to go.
