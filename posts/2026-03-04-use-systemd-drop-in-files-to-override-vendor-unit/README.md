# How to Use systemd Drop-In Files to Override Vendor Unit Configurations on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Linux

Description: Step-by-step guide on use systemd drop-in files to override vendor unit configurations using Red Hat Enterprise Linux 9.

---

Vendor unit files shipped with RHEL packages live in `/usr/lib/systemd/system/`. Editing them directly is a bad idea because package updates overwrite those files. Drop-in files give you a clean way to override specific directives without touching the original unit. The override lives in `/etc/systemd/system/<unit>.d/` and survives upgrades.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Create a drop-in directory and override file:

```bash
# Create the drop-in directory
sudo mkdir -p /etc/systemd/system/httpd.service.d/

# Create an override file
sudo tee /etc/systemd/system/httpd.service.d/override.conf <<EOF
[Service]
LimitNOFILE=65536
Restart=always
RestartSec=5s
EOF

# Reload systemd to pick up changes
sudo systemctl daemon-reload

# Restart the service
sudo systemctl restart httpd
```

You can also use `systemctl edit` to create drop-in files interactively:

```bash
sudo systemctl edit httpd.service
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
