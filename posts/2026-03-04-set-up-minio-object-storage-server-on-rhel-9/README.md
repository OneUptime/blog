# How to Set Up MinIO Object Storage Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Object Storage, Linux

Description: Step-by-step guide on set up minio object storage server using Red Hat Enterprise Linux 9.

---

Setting up MinIO Object Storage Server on RHEL requires proper planning and configuration. This guide walks through each step from service configuration to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/default/minio
```

Adjust the settings according to your requirements. Key parameters to configure include storage volumes, console listening address, and root credentials.

```bash
MINIO_VOLUMES="/mnt/data"
MINIO_OPTS="--console-address :9001"
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="CHANGE_ME_TO_A_STRONG_PASSWORD"
```

```bash
# Restart the service to apply changes
sudo systemctl restart minio
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable minio

# Start the service
sudo systemctl start minio

# Check the status
sudo systemctl status minio
```

## Step 4: Configure the Firewall

```bash
# Open the MinIO S3 API and web console ports
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --permanent --add-port=9001/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status minio

# Review recent logs
journalctl -u minio --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u minio -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure the MinIO package is installed: `rpm -qa | grep minio`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
