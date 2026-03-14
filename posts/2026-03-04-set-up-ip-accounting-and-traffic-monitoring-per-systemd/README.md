# How to Set Up IP Accounting and Traffic Monitoring per systemd Service on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Monitoring, Linux

Description: Step-by-step guide on set up ip accounting and traffic monitoring per systemd service using Red Hat Enterprise Linux 9.

---

systemd can track network traffic on a per-service basis using its built-in IP accounting feature. This is useful for identifying which services consume the most bandwidth without deploying a separate monitoring tool.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Enable IP accounting for a service:

```bash
# Create a drop-in to enable IP accounting
sudo mkdir -p /etc/systemd/system/nginx.service.d/
sudo tee /etc/systemd/system/nginx.service.d/accounting.conf <<EOF
[Service]
IPAccounting=yes
EOF

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nginx

# View traffic statistics
systemctl show nginx.service -p IPIngressBytes -p IPEgressBytes -p IPIngressPackets -p IPEgressPackets
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Verify the configuration was applied
systemctl show <service-name> | grep -i <setting>

# Check for errors in the journal
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
