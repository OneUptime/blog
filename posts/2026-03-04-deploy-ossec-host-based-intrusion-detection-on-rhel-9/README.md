# How to Deploy OSSEC Host-Based Intrusion Detection on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Linux

Description: Step-by-step guide on deploy ossec host-based intrusion detection using Red Hat Enterprise Linux 9.

---

Deploying OSSEC Host-Based Intrusion Detection on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /var/ossec/etc/ossec.conf
```

Adjust the settings according to your requirements. Key parameters to configure include monitored log files, file integrity monitoring paths, alerting options, and remote manager settings.

```bash
# Restart the service to apply changes
sudo /var/ossec/bin/ossec-control restart
```

## Step 3: Enable and Start the Service

```bash
# Start the service
sudo /var/ossec/bin/ossec-control start

# Check the status
sudo /var/ossec/bin/ossec-control status
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo /var/ossec/bin/ossec-control status

# Review recent logs
sudo tail -n 20 /var/ossec/logs/ossec.log
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo tail -n 50 /var/ossec/logs/ossec.log`.
- Ensure all required packages are installed: `rpm -qa | grep -E 'zlib-devel|pcre2-devel|make|gcc|sqlite-devel|openssl-devel|libevent-devel|systemd-devel'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
