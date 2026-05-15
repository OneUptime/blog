# How to Deploy Sonatype Nexus Repository Manager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CI/CD, Linux

Description: Step-by-step guide on deploy sonatype nexus repository manager using Red Hat Enterprise Linux 9.

---

Deploying Sonatype Nexus Repository Manager on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Sonatype Nexus Repository extracted under `/opt/sonatype/nexus`
- A dedicated `nexus` user with permission to access `/opt/sonatype/nexus` and `/opt/sonatype-work/nexus3`

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Configure the user that runs Nexus Repository
sudo vi /opt/sonatype/nexus/bin/nexus.rc
```

Set the runtime user:

```bash
run_as_user="nexus"
```

Create the systemd service file:

```bash
sudo vi /etc/systemd/system/nexus.service
```

Use the following service definition:

```ini
[Unit]
Description=nexus service
After=network.target

[Service]
Type=forking
LimitNOFILE=65536
ExecStart=/opt/sonatype/nexus/bin/nexus start
ExecStop=/opt/sonatype/nexus/bin/nexus stop
User=nexus
Restart=on-abort
TimeoutSec=600

[Install]
WantedBy=multi-user.target
```

Adjust the settings according to your requirements. Key parameters to configure include the application port and context path in `/opt/sonatype-work/nexus3/etc/nexus.properties`.

```properties
application-port=8081
nexus-context-path=/
```

```bash
# Restart the service to apply changes
sudo systemctl restart nexus.service
```

## Step 3: Enable and Start the Service

```bash
# Reload systemd after creating the unit file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable nexus.service

# Start the service
sudo systemctl start nexus.service

# Check the status
sudo systemctl status nexus.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status nexus.service

# Review recent logs
journalctl -u nexus.service --no-pager -n 20

# Review the Nexus application log
tail -f /opt/sonatype-work/nexus3/log/nexus.log
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u nexus.service -e --no-pager`.
- Ensure the `nexus` user can read and write the Nexus installation and data directories.
- After the first successful startup, retrieve the initial admin password from `/opt/sonatype-work/nexus3/admin.password`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
