# How to Install and Configure Fluentd on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logging, Linux

Description: Step-by-step guide on install and configure fluentd using Red Hat Enterprise Linux 9.

---

Fluentd can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
curl -fsSL https://fluentd.cdn.cncf.io/sh/install-redhat-fluent-package6-lts.sh | sudo sh
```

This installs the `fluent-package` RPM package and configures the Fluentd RPM repository.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/fluent/fluentd.conf
```

Adjust the settings according to your requirements. Key parameters to configure include sources, filters, matches, and system-wide logging options. For example, the default RPM configuration accepts HTTP events and writes them to Fluentd's log output:

```apache
<source>
  @type http
  port 8888
  bind 0.0.0.0
</source>

<match debug.**>
  @type stdout
</match>
```

```bash
# Restart the service to apply changes
sudo systemctl restart fluentd.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable fluentd.service

# Start the service
sudo systemctl start fluentd.service

# Check the status
sudo systemctl status fluentd.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status fluentd.service

# Send a sample log event to the default HTTP input
curl -X POST -d 'json={"json":"message"}' http://localhost:8888/debug.test

# Review recent Fluentd logs
sudo tail -n 20 /var/log/fluent/fluentd.log
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u fluentd.service -e --no-pager` and `/var/log/fluent/fluentd.log`.
- Ensure the Fluentd package is installed: `rpm -q fluent-package`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
