# How to Install and Configure the Splunk Universal Forwarder on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on install and configure the splunk universal forwarder using Red Hat Enterprise Linux 9.

---

The Splunk Universal Forwarder collects and sends log data to a Splunk indexer for analysis. Installing it on RHEL servers enables centralized log management and security event monitoring.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install the Splunk Universal Forwarder

```bash
# Update the system first
sudo dnf update -y

# Install the downloaded Splunk Universal Forwarder RPM
sudo dnf install -y ./splunkforwarder-<version>-<build>.x86_64.rpm
```

Replace `splunkforwarder-<version>-<build>.x86_64.rpm` with the RPM file you downloaded from Splunk. The default installation directory on Linux is `/opt/splunkforwarder`.

## Step 2: Configure the Forwarder

Configure the forwarder to send data to your Splunk indexer or receiving forwarder:

```bash
# Go to the Splunk Universal Forwarder CLI directory
cd /opt/splunkforwarder/bin

# Start the forwarder and accept the license
sudo ./splunk start --accept-license

# Add a receiving indexer or forwarder
sudo ./splunk add forward-server <indexer-hostname-or-ip>:9997
```

Replace `<indexer-hostname-or-ip>` with the host name or IP address of your Splunk receiver. The default Splunk-to-Splunk receiving port is commonly `9997`, but use the port configured in your Splunk environment.

```bash
# Add a local file or directory to monitor
sudo ./splunk add monitor /var/log

# Restart the forwarder to apply changes
sudo ./splunk restart
```

## Step 3: Enable and Start the Service

```bash
# Enable systemd boot-start for the Splunk Universal Forwarder
sudo /opt/splunkforwarder/bin/splunk enable boot-start -systemd-managed 1 -user splunkfwd -group splunkfwd

# Start the service if it is not already running
sudo /opt/splunkforwarder/bin/splunk start

# Check the status
sudo /opt/splunkforwarder/bin/splunk status
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo /opt/splunkforwarder/bin/splunk status

# Check the configured forwarding targets
sudo /opt/splunkforwarder/bin/splunk list forward-server

# Review recent internal logs
sudo tail -n 20 /opt/splunkforwarder/var/log/splunk/splunkd.log
```

## Troubleshooting

- If the forwarder fails to start, check `/opt/splunkforwarder/var/log/splunk/splunkd.log`.
- Ensure the RPM package is installed: `rpm -qa | grep splunkforwarder`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
