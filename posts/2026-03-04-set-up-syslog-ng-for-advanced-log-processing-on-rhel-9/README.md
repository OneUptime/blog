# How to Set Up syslog-ng for Advanced Log Processing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logging, Linux

Description: Step-by-step guide on set up syslog-ng for advanced log processing using Red Hat Enterprise Linux 9.

---

Setting up syslog-ng for Advanced Log Processing on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install syslog-ng

syslog-ng is available for RHEL 9 through Fedora EPEL. Enable the required repository, then install the package:

```bash
# On RHEL 9, enable CodeReady Linux Builder first
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms

# Enable EPEL
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
```

On CentOS Stream 9, use the CRB and EPEL packages instead:

```bash
# On CentOS Stream 9
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release epel-next-release
```

Then install syslog-ng:

```bash
# Install syslog-ng
sudo dnf install -y syslog-ng
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/syslog-ng/syslog-ng.conf
```

Adjust the settings according to your requirements. Key parameters to configure include sources, filters, destinations, and log paths.

```bash
# Example: collect local system logs and write them to /var/log/messages
source s_local {
    system();
    internal();
};

destination d_messages {
    file("/var/log/messages");
};

log {
    source(s_local);
    destination(d_messages);
};
```

```bash
# Check the configuration syntax
sudo syslog-ng --syntax-only

# Restart the service to apply changes
sudo systemctl restart syslog-ng
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable syslog-ng

# Start the service
sudo systemctl start syslog-ng

# Check the status
sudo systemctl status syslog-ng
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status syslog-ng

# Review recent logs
journalctl -u syslog-ng --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u syslog-ng -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep syslog-ng`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
