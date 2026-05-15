# How to Install and Configure Vector for High-Performance Log Collection on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logging, Performance, Linux

Description: Step-by-step guide on install and configure vector for high-performance log collection using Red Hat Enterprise Linux 9.

---

Vector can be installed and configured on RHEL to provide robust log collection functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Add the Vector package repository
bash -c "$(curl -L https://setup.vector.dev)"

# Install Vector
sudo dnf install -y vector
```

This installs the `vector` package and its systemd service.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/vector/vector.yaml
```

Adjust the settings according to your requirements. For example, this configuration reads logs from journald and writes them to standard output for a basic verification setup:

```yaml
sources:
  system_logs:
    type: journald

sinks:
  console:
    type: console
    inputs:
      - system_logs
    target: stdout
    encoding:
      codec: json
```

Validate the configuration before restarting the service:

```bash
sudo vector validate /etc/vector/vector.yaml
```

```bash
# Restart the service to apply changes
sudo systemctl restart vector
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable vector

# Start the service
sudo systemctl start vector

# Check the status
sudo systemctl status vector
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status vector

# Review recent logs
journalctl -u vector --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u vector -e --no-pager`.
- Ensure Vector is installed: `rpm -qa | grep vector`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
