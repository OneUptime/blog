# How to Set Up Template Units with systemd Instantiated Services on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Linux

Description: Step-by-step guide on set up template units with systemd instantiated services using Red Hat Enterprise Linux 9.

---

Setting up Template Units with systemd Instantiated Services on RHEL requires proper planning and configuration. This guide walks through each step from unit file creation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Create a template unit file. Template unit names include `@` before the unit type suffix, and each running instance supplies the value between `@` and `.service`.

```bash
# Open the template unit file

sudo vi /etc/systemd/system/example-worker@.service
```

Add the service definition and use `%i` where the instance name should be inserted:

```ini
[Unit]
Description=Example worker instance %i

[Service]
ExecStart=/usr/bin/sleep infinity

[Install]
WantedBy=multi-user.target
```

Adjust the settings according to your requirements. Key parameters to configure include the `ExecStart` command, environment files, dependencies, and logging options.

```bash
# Reload systemd to read the new unit file
sudo systemctl daemon-reload
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable example-worker@alpha.service

# Start the service
sudo systemctl start example-worker@alpha.service

# Check the status
sudo systemctl status example-worker@alpha.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Verify the configuration was applied
systemctl show example-worker@alpha.service -p ActiveState -p SubState

# Check for errors in the journal
journalctl -u example-worker@alpha.service --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u example-worker@alpha.service -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
