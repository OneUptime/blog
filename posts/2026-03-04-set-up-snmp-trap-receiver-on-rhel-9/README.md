# How to Set Up SNMP Trap Receiver on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on set up snmp trap receiver using Red Hat Enterprise Linux 9.

---

Setting up SNMP Trap Receiver on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- UDP port 162 reachable from the devices that will send traps

## Step 1: Install the SNMP Trap Daemon

Install the Net-SNMP daemon and utilities:

```bash
# Install snmptrapd and test utilities
sudo dnf install -y net-snmp net-snmp-utils
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the snmptrapd configuration file
sudo vi /etc/snmp/snmptrapd.conf
```

For an SNMPv2c receiver, add an access control rule for the community string your devices will use:

```conf
# Accept and log traps using this community string
authCommunity log,execute,net trapCommunity123
```

Adjust the community string and source restrictions according to your requirements. Key parameters to configure include access control, optional SNMPv3 users, trap handlers, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart snmptrapd
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable snmptrapd

# Start the service
sudo systemctl start snmptrapd

# Check the status
sudo systemctl status snmptrapd
```

If firewalld is enabled, allow SNMP trap traffic:

```bash
# Allow inbound SNMP traps
sudo firewall-cmd --permanent --add-port=162/udp
sudo firewall-cmd --reload
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status snmptrapd

# Review recent logs
journalctl -u snmptrapd --no-pager -n 20
```

Send a local test trap and then check the logs again:

```bash
# Send a test SNMPv2c trap to the local receiver
snmptrap -v 2c -c trapCommunity123 localhost "" \
  .1.3.6.1.4.1.8072.2.3.0.1 \
  .1.3.6.1.4.1.8072.2.3.2.1 i 123

# Review the trap daemon logs
journalctl -u snmptrapd --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u snmptrapd -e --no-pager`.
- Ensure all required packages are installed: `rpm -q net-snmp net-snmp-utils`.
- If traps are not logged, confirm the sender uses the same community string as the `authCommunity` rule and that UDP port 162 is open.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
