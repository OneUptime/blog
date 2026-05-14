# How to Set Up Typesense Search Engine on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Search, Linux

Description: Step-by-step guide on set up typesense search engine using Red Hat Enterprise Linux 9.

---

Setting up Typesense Search Engine on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Typesense

Download and install the Typesense RPM package:

```bash
# Download and install the x86_64 RPM package
curl -O https://dl.typesense.org/releases/v30.2/typesense-server-v30.2-1.x86_64.rpm
sudo yum install ./typesense-server-v30.2-1.x86_64.rpm
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/typesense/typesense-server.ini
```

Adjust the settings according to your requirements. Key parameters to configure include `api-address`, `api-port`, `api-key`, `data-dir`, and `log-dir`.

```bash
# Restart the service to apply changes
sudo systemctl restart typesense-server.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable typesense-server.service

# Start the service
sudo systemctl start typesense-server.service

# Check the status
sudo systemctl status typesense-server.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status typesense-server.service

# Check the Typesense health endpoint
curl http://localhost:8108/health

# Review recent logs
journalctl -u typesense-server.service --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u typesense-server.service -e --no-pager`.
- Ensure the Typesense package is installed: `rpm -qa | grep typesense-server`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
