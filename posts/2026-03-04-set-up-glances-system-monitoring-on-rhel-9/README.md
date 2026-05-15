# How to Set Up Glances System Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on set up glances system monitoring using Red Hat Enterprise Linux 9.

---

Setting up Glances System Monitoring on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Glances

Enable EPEL, then install the Glances package:

```bash
# On RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# On CentOS Stream 9
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release epel-next-release

# Install Glances
sudo dnf install -y glances
```

## Step 2: Configure the Service

Create a systemd service to run Glances in web server mode:

```bash
# Create the service file
sudo vi /etc/systemd/system/glances.service
```

Add the following unit definition:

```ini
[Unit]
Description=Glances system monitoring
After=network.target

[Service]
ExecStart=/usr/bin/glances -w
Restart=always
RemainAfterExit=no

[Install]
WantedBy=multi-user.target
```

Adjust `/etc/glances/glances.conf` if you need custom thresholds, plugin settings, or password settings.

```bash
# Restart the service to apply changes
sudo systemctl daemon-reload
sudo systemctl restart glances.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable --now glances.service

# Check the status
sudo systemctl status glances.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status glances.service

# Check the local web interface
curl http://127.0.0.1:61208/

# Review recent logs
journalctl -u glances.service --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u glances.service -e --no-pager`.
- Ensure the Glances package is installed: `rpm -q glances`.
- If you need browser access from another host, allow the default web port with `sudo firewall-cmd --permanent --add-port=61208/tcp && sudo firewall-cmd --reload`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
