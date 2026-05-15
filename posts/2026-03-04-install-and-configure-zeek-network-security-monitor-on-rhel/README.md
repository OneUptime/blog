# How to Install and Configure Zeek Network Security Monitor on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Network Security, Monitoring, Linux

Description: Step-by-step guide on install and configure zeek network security monitor using Red Hat Enterprise Linux 9.

---

Zeek Network Security Monitor can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- The network interface name Zeek should monitor, such as `ens192` or `eth0`

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# On RHEL 9, enable CodeReady Linux Builder and EPEL
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# On CentOS Stream 9, enable CRB and EPEL
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release epel-next-release

# Install Zeek and ZeekControl
sudo dnf install -y zeek-core zeekctl
```

Use the RHEL commands on Red Hat Enterprise Linux 9, or the CentOS Stream commands on CentOS Stream 9.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the ZeekControl node configuration file
sudo vi /etc/zeek/node.cfg
```

For a single-host deployment, set the monitored interface in the standalone node. Replace `ens192` with the interface that receives mirrored or tapped traffic:

```ini
[zeek]
type=standalone
host=localhost
interface=ens192
```

Review the local network definitions and site policy file as needed:

```bash
sudo vi /etc/zeek/networks.cfg
sudo vi /usr/share/zeek/site/local.zeek
```

Adjust the settings according to your requirements. Key parameters to configure include the monitoring interface, local networks, log rotation, and site-specific Zeek policy scripts.

## Step 3: Enable and Start Zeek

```bash
# Check the ZeekControl configuration
sudo zeekctl check

# Install the configuration and start Zeek
sudo zeekctl deploy

# Check the status
sudo zeekctl status
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo zeekctl status

# Review current Zeek logs
sudo ls -l /var/log/zeek/logs/current
sudo tail -n 20 /var/log/zeek/logs/current/conn.log
```

## Troubleshooting

- If Zeek fails to start, check diagnostics with `sudo zeekctl diag`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -qa | grep -E 'zeek|zeekctl'`.
- Verify that the configured interface exists with `ip link show` and is receiving traffic with `sudo tcpdump -i <interface> -c 10`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
