# How to Install pgAdmin for PostgreSQL Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Database, Linux

Description: Step-by-step guide on install pgadmin for postgresql management using Red Hat Enterprise Linux 9.

---

This guide provides step-by-step instructions for completing this task on RHEL. Following these procedures ensures a reliable and secure setup.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- PostgreSQL installed and running

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Add the pgAdmin RPM repository for RHEL-compatible systems
sudo rpm -i https://ftp.postgresql.org/pub/pgadmin/pgadmin4/yum/pgadmin4-redhat-repo-2-1.noarch.rpm

# Install pgAdmin for web mode
sudo dnf install -y pgadmin4-web
```

## Step 2: Configure the Service

Run the pgAdmin web setup script to create the initial administrator account and configure Apache HTTP Server:

```bash
sudo /usr/pgadmin4/bin/setup-web.sh
```

Adjust PostgreSQL connection settings inside the pgAdmin web interface after logging in. For remote browser access, also ensure your firewall allows HTTP traffic to the server.

```bash
# Restart the service to apply changes
sudo systemctl restart httpd.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable httpd.service

# Start the service
sudo systemctl start httpd.service

# Check the status
sudo systemctl status httpd.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status httpd.service

# Review recent logs
sudo journalctl -u httpd.service --no-pager -n 20
```

Then open `http://<server-address>/pgadmin4` in a browser and log in with the administrator email and password created by the setup script.

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u httpd.service -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep pgadmin4`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
