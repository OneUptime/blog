# How to Evaluate RHEL 10 Kernel Changes and New Driver Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHEL 10, Linux

Description: Step-by-step guide on evaluate rhel 10 kernel changes and new driver support using Red Hat Enterprise Linux 9.

---

The RHEL 10 kernel brings new driver support, updated scheduler algorithms, and performance improvements. Understanding these changes helps you evaluate hardware compatibility and performance expectations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

### Key Comparison Areas

Evaluate based on your specific requirements for support, compatibility, performance, and cost.

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
# Check the service status
sudo systemctl status <service-name>

# Review recent logs
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Both options have their strengths, and the right choice depends on your specific requirements, budget, and team expertise. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
