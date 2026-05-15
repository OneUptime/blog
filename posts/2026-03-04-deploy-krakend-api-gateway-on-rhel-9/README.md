# How to Deploy KrakenD API Gateway on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on deploy krakend api gateway using Red Hat Enterprise Linux 9.

---

Deploying KrakenD API Gateway on RHEL provides a stable and secure foundation for your workload. This guide covers the configuration and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/krakend/krakend.json
```

Adjust the settings according to your requirements. Key parameters to configure include the listening port, listening IP address, backend endpoints, authentication settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart krakend
```

## Step 2: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable krakend

# Start the service
sudo systemctl start krakend

# Check the status
sudo systemctl status krakend
```

## Step 3: Configure the Firewall

```bash
# Open the required port
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status krakend

# Review recent logs
journalctl -u krakend --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u krakend -e --no-pager`.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -qa | grep krakend`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
