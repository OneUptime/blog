# How to Install and Configure RKHunter Rootkit Detection on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Linux

Description: Step-by-step guide on install and configure rkhunter rootkit detection using Red Hat Enterprise Linux 9.

---

RKHunter Rootkit Detection can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# On RHEL 9, enable CodeReady Builder and install EPEL
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# On CentOS Stream 9, enable CRB and install EPEL
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release epel-next-release

# Install rkhunter
sudo dnf install -y rkhunter
```

Use the RHEL commands on Red Hat Enterprise Linux and the CentOS Stream commands on CentOS Stream 9.

## Step 2: Configure RKHunter

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/rkhunter.conf
```

Adjust the settings according to your requirements. Key parameters to configure include update mirror settings, warning email recipients, and the log file location.

```bash
# Validate the configuration
sudo rkhunter --config-check
```

## Step 3: Update Databases and Run a Check

```bash
# Create the file properties baseline on a known-good system
sudo rkhunter --propupd

# Update rkhunter data files
sudo rkhunter --update

# Run a scan without interactive prompts
sudo rkhunter --check --skip-keypress
```


## Verification

Confirm everything is working by running a warning-only scan and checking the logs:

```bash
# Show warnings only
sudo rkhunter --check --skip-keypress --report-warnings-only

# Review recent logs on the Fedora/EPEL RPM build
sudo tail -n 50 /var/log/rkhunter/rkhunter.log
```

## Troubleshooting

- If the configuration is invalid, check it with `sudo rkhunter --config-check`.
- Ensure rkhunter is installed: `rpm -q rkhunter`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to run scans and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
