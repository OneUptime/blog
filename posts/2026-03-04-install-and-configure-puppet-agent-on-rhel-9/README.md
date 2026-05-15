# How to Install and Configure Puppet Agent on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Configuration Management, Linux

Description: Step-by-step guide on install and configure puppet agent using Red Hat Enterprise Linux 9.

---

Puppet Agent can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Access to the Puppet package repository for RHEL 9
- The hostname of your primary Puppet server
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install Puppet Agent
sudo dnf install -y puppet-agent
```

Make sure the Puppet package repository is configured before installing `puppet-agent`.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Configure the primary Puppet server
sudo /opt/puppetlabs/bin/puppet config set server puppetserver.example.com --section main
```

Replace `puppetserver.example.com` with the fully qualified domain name of your primary Puppet server. You can also edit `/etc/puppetlabs/puppet/puppet.conf` directly. Key parameters to configure include `server`, `certname`, and `runinterval`.

```bash
# Restart the service to apply changes
sudo systemctl restart puppet
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable puppet

# Start the service
sudo systemctl start puppet

# Check the status
sudo systemctl status puppet
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status puppet

# Run the agent once and request a certificate if needed
sudo /opt/puppetlabs/bin/puppet agent --test

# Review recent logs
journalctl -u puppet --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u puppet -e --no-pager`.
- Ensure the Puppet Agent package is installed: `rpm -q puppet-agent`.
- If `puppet agent --test` reports that the certificate is not signed, sign the agent certificate on the primary Puppet server and run the command again.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
