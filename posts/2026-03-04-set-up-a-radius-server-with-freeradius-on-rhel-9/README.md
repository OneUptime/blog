# How to Set Up a RADIUS Server with FreeRADIUS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Identity, Linux

Description: Step-by-step guide on set up a radius server with freeradius using Red Hat Enterprise Linux 9.

---

Setting up a RADIUS Server with FreeRADIUS on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install FreeRADIUS

```bash
# Install FreeRADIUS
sudo dnf install freeradius freeradius-utils
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the clients configuration file
sudo vi /etc/raddb/clients.conf
```

Add a client entry for each Network Access Server (NAS) or authenticator that will send requests to FreeRADIUS:

```conf
client network-authenticator {
    ipaddr = 192.0.2.10/32
    secret = ChangeMeToARandom32CharSharedSecret
}
```

For a simple local test user, edit the files module authorization file:

```bash
sudo vi /etc/raddb/mods-config/files/authorize
```

Add a test user entry:

```conf
testuser Cleartext-Password := "testpassword"
```

Adjust the settings according to your requirements. Key parameters to configure include client IP addresses or ranges, shared secrets, listening addresses, authentication settings, and logging options.

```bash
# Verify the configuration before restarting
sudo radiusd -XC

# Restart the service to apply changes
sudo systemctl restart radiusd
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable radiusd

# Start the service
sudo systemctl start radiusd

# Check the status
sudo systemctl status radiusd
```

## Step 4: Configure the Firewall

```bash
# Open the RADIUS authentication and accounting ports
sudo firewall-cmd --permanent --add-service=radius
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status radiusd

# Review recent logs
journalctl -u radiusd --no-pager -n 20

# Send a test authentication request from the RADIUS server
radtest testuser testpassword 127.0.0.1 10 testing123
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u radiusd -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -qa | grep freeradius`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
