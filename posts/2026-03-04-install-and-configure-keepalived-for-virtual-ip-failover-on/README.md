# How to Install and Configure Keepalived for Virtual IP Failover on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, High Availability, Linux

Description: Step-by-step guide on install and configure keepalived for virtual ip failover using Red Hat Enterprise Linux 9.

---

Keepalived for Virtual IP Failover can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
sudo dnf install -y keepalived
```

This installs the Keepalived daemon and its configuration files.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/keepalived/keepalived.conf
```

Adjust the settings according to your requirements. Key parameters to configure include the network interface, VRRP router ID, node priority, authentication settings, and virtual IP address.

```conf
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass changeme
    }
    virtual_ipaddress {
        192.168.0.100/24
    }
}
```

On the backup node, use the same `virtual_router_id` and `virtual_ipaddress`, but set `state BACKUP` and a lower `priority`, such as `100`. Replace `eth0` and `192.168.0.100/24` with the interface and virtual IP address for your environment.

```bash
# Restart the service to apply changes
sudo systemctl restart keepalived
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable keepalived

# Start the service
sudo systemctl start keepalived

# Check the status
sudo systemctl status keepalived
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status keepalived

# Check that the virtual IP address is present on the active node
ip address show dev eth0

# Review recent logs
journalctl -u keepalived --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u keepalived -e --no-pager`.
- Ensure the required package is installed: `rpm -qa | grep keepalived`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
