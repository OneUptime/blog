# How to Configure systemd Sandboxing with ProtectSystem and PrivateTmp on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, Linux

Description: Step-by-step guide on configure systemd sandboxing with protectsystem and privatetmp using Red Hat Enterprise Linux 9.

---

systemd provides several sandboxing directives that restrict what a service can do. ProtectSystem and PrivateTmp are two of the most commonly used options that limit filesystem access and provide isolated temporary directories.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Add sandboxing directives to a service:

```bash
sudo mkdir -p /etc/systemd/system/myapp.service.d/
sudo tee /etc/systemd/system/myapp.service.d/sandbox.conf <<EOF
[Service]
ProtectSystem=strict
PrivateTmp=yes
ProtectHome=yes
NoNewPrivileges=yes
ReadWritePaths=/var/lib/myapp
EOF

sudo systemctl daemon-reload
sudo systemctl restart myapp
```

- **ProtectSystem=strict** makes the entire filesystem read-only except explicitly allowed paths
- **PrivateTmp=yes** gives the service its own `/tmp` and `/var/tmp`
- **ProtectHome=yes** makes `/home`, `/root`, and `/run/user` inaccessible

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
