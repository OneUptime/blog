# How to Install and Configure Supervisord Process Manager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Process Management, Linux

Description: Step-by-step guide on install and configure supervisord process manager using Red Hat Enterprise Linux 9.

---

Supervisord Process Manager can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf upgrade -y

# Enable CodeReady Builder and EPEL on RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# On CentOS Stream 9, use these instead of the two RHEL commands above:
# sudo dnf config-manager --set-enabled crb
# sudo dnf install -y epel-release epel-next-release

# Install the required packages
sudo dnf install -y supervisor
```

The package installs the `supervisord` service, `supervisorctl`, and the default configuration files.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/supervisord.conf
```

Adjust the settings according to your requirements. Key parameters to configure include the UNIX socket, optional HTTP interface authentication, and logging options. To manage a process, add a program configuration file:

```ini
[program:sleep-demo]
command=/usr/bin/sleep 3600
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/sleep-demo.err.log
stdout_logfile=/var/log/supervisor/sleep-demo.out.log
```

Save program files in `/etc/supervisord.d/` with an `.ini` extension, for example `/etc/supervisord.d/sleep-demo.ini`.

```bash
# Restart the service to apply changes
sudo systemctl restart supervisord
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable supervisord

# Start the service
sudo systemctl start supervisord

# Check the status
sudo systemctl status supervisord
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status supervisord

# Check managed processes
sudo supervisorctl status

# Review recent logs
sudo journalctl -u supervisord --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u supervisord -e --no-pager`.
- Ensure the required package is installed: `rpm -q supervisor`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
