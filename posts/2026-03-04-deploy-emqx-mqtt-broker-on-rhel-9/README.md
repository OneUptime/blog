# How to Deploy Emqx MQTT Broker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IoT, Linux

Description: Step-by-step guide on deploy emqx mqtt broker using Red Hat Enterprise Linux 9.

---

Deploying Emqx MQTT Broker on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install EMQX

Download the RPM package for RHEL 9 from the EMQX download page, then install it with `dnf`:

```bash
# Install the downloaded RPM package
sudo dnf install ./emqx-*.rpm
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/emqx/emqx.conf
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, authentication settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart emqx
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable emqx

# Start the service
sudo systemctl start emqx

# Check the status
sudo systemctl status emqx
```

## Step 4: Configure the Firewall

```bash
# Open the default MQTT and Dashboard ports
sudo firewall-cmd --permanent --add-port=1883/tcp
sudo firewall-cmd --permanent --add-port=18083/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status emqx

# Review recent logs
journalctl -u emqx --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u emqx -e --no-pager` and the files in `/var/log/emqx`.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure EMQX is installed: `rpm -qa | grep emqx`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
