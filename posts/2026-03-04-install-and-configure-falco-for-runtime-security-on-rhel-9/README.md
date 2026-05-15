# How to Install and Configure Falco for Runtime Security on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Linux

Description: Step-by-step guide on install and configure falco for runtime security using Red Hat Enterprise Linux 9.

---

Falco for Runtime Security can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Trust the Falco package signing key
sudo rpm --import https://falco.org/repo/falcosecurity-packages.asc

# Configure the Falco RPM repository
sudo curl -L -o /etc/yum.repos.d/falcosecurity.repo https://falco.org/repo/falcosecurity-rpm.repo

# Update the system first
sudo dnf update -y

# Install Falco with the modern eBPF driver
sudo FALCO_FRONTEND=noninteractive FALCO_DRIVER_CHOICE=modern_ebpf dnf install -y falco
```

The modern eBPF driver avoids the need to install kernel headers, DKMS, and compiler packages on RHEL 9.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/falco/falco.yaml
```

Adjust the settings according to your requirements. Key parameters to configure include `rules_files`, output settings such as `stdout_output` and `syslog_output`, and the minimum alert `priority`.

```bash
# Restart the service to apply changes
sudo systemctl restart falco
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable falco-modern-bpf.service

# Start the service
sudo systemctl start falco

# Check the status
sudo systemctl status falco
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status falco

# Review recent logs
sudo journalctl -u falco --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u falco -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Falco is installed: `rpm -q falco`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
