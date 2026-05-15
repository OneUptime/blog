# How to Install and Configure PowerDNS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Linux

Description: Step-by-step guide on install and configure powerdns using Red Hat Enterprise Linux 9.

---

PowerDNS can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- EPEL or the official PowerDNS repository enabled
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
sudo dnf install -y pdns bind-utils
```

Install the required backend package for your use case. The BIND backend is included with the base `pdns` package in many Red Hat-based packages, while database backends use packages such as `pdns-backend-mysql`, `pdns-backend-postgresql`, or `pdns-backend-sqlite`.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/powerdns/pdns.conf
```

Adjust the settings according to your requirements. Key parameters to configure include the backend, listening addresses, API authentication, and logging options. For a simple file-backed authoritative server, configure the BIND backend:

```ini
launch=bind
bind-config=/etc/powerdns/named.conf
local-address=0.0.0.0
local-port=53
```

Create the BIND-style zone configuration referenced by `bind-config`:

```bash
sudo vi /etc/powerdns/named.conf
```

Example:

```conf
zone "example.com" {
    type master;
    file "/etc/powerdns/zones/example.com.zone";
};
```

Create the zone file:

```bash
sudo mkdir -p /etc/powerdns/zones
sudo vi /etc/powerdns/zones/example.com.zone
```

Example:

```dns
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (
        2026030401 ; serial
        3600       ; refresh
        900        ; retry
        604800     ; expire
        86400      ; minimum
)
@   IN  NS  ns1.example.com.
ns1 IN  A   192.0.2.10
```

```bash
# Restart the service to apply changes
sudo systemctl restart pdns
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable pdns

# Start the service
sudo systemctl start pdns

# Check the status
sudo systemctl status pdns
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status pdns

# Review recent logs
journalctl -u pdns --no-pager -n 20

# Query the authoritative server
dig @127.0.0.1 example.com SOA
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u pdns -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep '^pdns'`.
- Test network connectivity with `ss -tlnp` to verify that PowerDNS is listening on port 53, and use `dig` to test DNS responses.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
