# How to Install HashiCorp Packer on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Linux

Description: Step-by-step guide on install hashicorp packer using Red Hat Enterprise Linux 9.

---

HashiCorp Packer automates the creation of machine images for multiple platforms from a single configuration. Installing it on RHEL lets you build reproducible images for cloud and on-premises environments.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the DNF config-manager plugin
sudo dnf install -y dnf-plugins-core

# Add HashiCorp repository
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Packer
sudo dnf install -y packer
```

## Step 2: Verify the Packer CLI

Packer runs as a command-line tool, not as a systemd service. Confirm that the `packer` command is available:

```bash
# Check the installed Packer version
packer version
```

You can also display the available Packer subcommands:

```bash
# Show Packer help
packer
```

## Step 3: Initialize and Validate a Template

From a directory that contains a Packer HCL template, initialize any required plugins and validate the template:

```bash
# Install required plugins for the template
packer init .

# Validate the template syntax and configuration
packer validate .
```


## Verification

Confirm everything is working by checking the installed version and validating a template:

```bash
# Check the installed version
packer version

# Validate a Packer template in the current directory
packer validate .
```

## Troubleshooting

- If `dnf config-manager` is not available, install the plugin package with `sudo dnf install -y dnf-plugins-core`.
- Ensure Packer is installed with `rpm -q packer`.
- If template validation fails, run `packer init .` first and review the error output from `packer validate .`.

## Conclusion

You have successfully completed the setup described in this guide. For production environments, always test image builds in a staging environment first and keep your RHEL system updated with the latest security patches.
