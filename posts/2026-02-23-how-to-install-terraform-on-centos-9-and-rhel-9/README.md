# How to Install Terraform on CentOS 9 and RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CentOS, RHEL, Linux, Installation, DevOps, Infrastructure as Code

Description: Step-by-step instructions for installing Terraform on CentOS 9 Stream and RHEL 9 using the official HashiCorp repository and manual binary installation.

---

CentOS 9 Stream and Red Hat Enterprise Linux 9 are popular choices for enterprise servers and workstations. If you are running either of these distributions and need to get Terraform up and running, this guide covers two reliable methods: using the official HashiCorp YUM repository and installing the binary manually.

Both methods work identically on CentOS 9 Stream and RHEL 9 since they share the same package management system (DNF/YUM) and the same base packages.

## Prerequisites

Before starting, make sure you have:

- A CentOS 9 Stream or RHEL 9 system with root or sudo access
- An active internet connection
- `curl` or `wget` installed (usually available by default)

Check your OS version:

```bash
# Verify your OS version
cat /etc/redhat-release
```

You should see something like `CentOS Stream release 9` or `Red Hat Enterprise Linux release 9.x`.

## Method 1 - Install from HashiCorp Repository (Recommended)

This is the recommended approach because it integrates with your system's package manager, making updates and removal straightforward.

### Step 1 - Install Required Dependencies

```bash
# Install yum-utils for repo management
sudo dnf install -y yum-utils
```

### Step 2 - Add the HashiCorp Repository

```bash
# Add the official HashiCorp Linux repository
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
```

This adds the HashiCorp RPM repository to your system. The repository URL uses `RHEL` which works for both RHEL and CentOS since CentOS 9 Stream is binary compatible with RHEL 9.

### Step 3 - Install Terraform

```bash
# Install Terraform from the HashiCorp repository
sudo dnf install -y terraform
```

DNF will resolve dependencies, download the latest Terraform package, and install it. The binary gets placed in `/usr/bin/terraform`.

### Step 4 - Verify the Installation

```bash
# Check the installed Terraform version
terraform -version
```

Expected output:

```
Terraform v1.7.x
on linux_amd64
```

## Method 2 - Manual Binary Installation

If you prefer not to add external repositories, or if you are in an air-gapped environment, you can download and install the binary directly.

### Step 1 - Download Terraform

```bash
# Set the Terraform version you want to install
TERRAFORM_VERSION="1.7.5"

# Download the Terraform zip file for Linux AMD64
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
```

For ARM-based systems (like AWS Graviton instances), replace `amd64` with `arm64`:

```bash
# For ARM64 systems
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_arm64.zip"
```

### Step 2 - Install unzip (If Needed)

```bash
# Install unzip if it is not already available
sudo dnf install -y unzip
```

### Step 3 - Extract and Install the Binary

```bash
# Unzip the Terraform binary
unzip "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"

# Move the binary to a directory in your PATH
sudo mv terraform /usr/local/bin/

# Set proper permissions
sudo chmod +x /usr/local/bin/terraform
```

### Step 4 - Verify

```bash
# Confirm the installation
terraform -version

# Check the binary location
which terraform
```

### Step 5 - Clean Up

```bash
# Remove the downloaded zip file
rm -f "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
```

## Updating Terraform

### Using the Repository Method

```bash
# Update Terraform via DNF
sudo dnf update -y terraform
```

You can also check for available updates without installing them:

```bash
# Check if a newer version is available
sudo dnf check-update terraform
```

### Using the Manual Method

For manual installations, you need to repeat the download process with the new version number, then replace the binary:

```bash
# Download and install a newer version
TERRAFORM_VERSION="1.8.0"
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
unzip "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
sudo mv terraform /usr/local/bin/terraform
rm -f "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
```

## Uninstalling Terraform

### Repository Method

```bash
# Remove Terraform installed via DNF
sudo dnf remove -y terraform
```

### Manual Method

```bash
# Remove the manually installed binary
sudo rm -f /usr/local/bin/terraform
```

## Setting Up a Quick Test

Let us verify everything works end-to-end:

```bash
# Create a test directory
mkdir ~/terraform-test && cd ~/terraform-test

# Create a minimal Terraform configuration
cat > main.tf <<'EOF'
terraform {
  required_version = ">= 1.0"
}

# A simple null resource to test Terraform works
resource "null_resource" "test" {
  provisioner "local-exec" {
    command = "echo 'Terraform is working on CentOS/RHEL 9!'"
  }
}
EOF

# Initialize and apply
terraform init
terraform apply -auto-approve

# Clean up
cd ~ && rm -rf ~/terraform-test
```

## Configuring Firewall Rules for Terraform

If your CentOS or RHEL system has firewalld enabled and you need Terraform to communicate with cloud APIs, make sure outbound HTTPS traffic is allowed:

```bash
# Check firewalld status
sudo systemctl status firewalld

# Ensure HTTPS traffic is allowed (usually allowed by default for outbound)
sudo firewall-cmd --list-all
```

In most cases, outbound HTTPS connections work by default. But if you are in a locked-down environment, you may need to allow traffic to specific HashiCorp and cloud provider endpoints.

## SELinux Considerations

Both CentOS 9 and RHEL 9 have SELinux enabled by default in enforcing mode. Terraform installed from the official RPM repository should work fine with SELinux. If you installed manually and run into permission issues:

```bash
# Check SELinux status
getenforce

# If you get permission denied errors, check the audit log
sudo ausearch -m avc -ts recent

# Restore SELinux context on the binary if needed
sudo restorecon -v /usr/local/bin/terraform
```

## Running Terraform as a Non-Root User

It is best practice to run Terraform as a regular user, not root. Both installation methods place the binary in a location accessible to all users. Just make sure your non-root user has the appropriate cloud credentials configured:

```bash
# Example: configure AWS credentials for your user
mkdir -p ~/.aws

cat > ~/.aws/credentials <<'EOF'
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
EOF

# Set restrictive permissions on the credentials file
chmod 600 ~/.aws/credentials
```

## Troubleshooting

### Repository GPG Key Issues

If you see GPG key verification errors when installing from the HashiCorp repo:

```bash
# Import the HashiCorp GPG key manually
sudo rpm --import https://rpm.releases.hashicorp.com/gpg
```

### "terraform: command not found" After Manual Install

Make sure `/usr/local/bin` is in your PATH:

```bash
# Check if /usr/local/bin is in PATH
echo $PATH | tr ':' '\n' | grep local

# If not, add it to your shell profile
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

### DNF Cache Issues

If DNF is showing stale information:

```bash
# Clear the DNF cache and try again
sudo dnf clean all
sudo dnf makecache
```

## Next Steps

With Terraform installed on your CentOS 9 or RHEL 9 system, you can start building your infrastructure configurations. Consider setting up shell autocomplete to speed up your workflow, and explore Terraform modules to keep your configurations organized and reusable.

The repository-based installation is the better choice for most situations since it integrates with your package manager and makes updates simple. The manual method is useful for air-gapped environments or when you need a very specific version.
