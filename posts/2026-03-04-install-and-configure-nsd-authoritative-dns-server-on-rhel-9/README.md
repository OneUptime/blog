# How to Install and Configure NSD Authoritative DNS Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on install and configure nsd authoritative dns server using Red Hat Enterprise Linux 9.

---

NSD Authoritative DNS Server can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Enable CodeReady Linux Builder and EPEL on RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Install NSD and DNS query tools
sudo dnf install -y nsd bind-utils
```

On CentOS Stream 9, enable CRB and EPEL instead:

```bash
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release epel-next-release
sudo dnf install -y nsd bind-utils
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/nsd/nsd.conf
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, zone files, and logging options. For a basic authoritative zone, add or update entries like this:

```conf
server:
    ip-address: 0.0.0.0
    ip-address: ::
    port: 53
    username: nsd
    hide-version: yes
    hide-identity: yes

zone:
    name: example.com
    zonefile: /etc/nsd/zones/example.com.zone
```

Create the zone directory and zone file:

```bash
sudo mkdir -p /etc/nsd/zones
sudo vi /etc/nsd/zones/example.com.zone
```

Add a basic zone file and replace the example IP addresses with your own server addresses:

```dns
$ORIGIN example.com.
$TTL 3600
@   IN  SOA ns1.example.com. hostmaster.example.com. (
        2026030401 ; serial
        3600       ; refresh
        900        ; retry
        1209600    ; expire
        3600       ; minimum
)
@   IN  NS  ns1.example.com.
ns1 IN  A   192.0.2.10
www IN  A   192.0.2.20
```

Set permissions and validate the configuration before restarting:

```bash
sudo chown -R root:nsd /etc/nsd/zones
sudo chmod 750 /etc/nsd/zones
sudo chmod 640 /etc/nsd/zones/example.com.zone

sudo nsd-checkconf /etc/nsd/nsd.conf
sudo nsd-checkzone example.com /etc/nsd/zones/example.com.zone

# Restart NSD to apply changes
sudo systemctl restart nsd
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable nsd

# Start the service
sudo systemctl start nsd

# Check the status
sudo systemctl status nsd
```

## Step 4: Configure the Firewall

```bash
# Open DNS ports
sudo firewall-cmd --permanent --add-port=53/udp
sudo firewall-cmd --permanent --add-port=53/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status nsd

# Query the local authoritative server
dig @127.0.0.1 example.com SOA +short
dig @127.0.0.1 www.example.com A +short

# Review recent logs
journalctl -u nsd --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u nsd -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow DNS traffic on TCP and UDP port 53: `firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -qa | grep nsd`.
- Test DNS connectivity with `ss -tulnp` to verify listening ports and `dig @127.0.0.1 example.com SOA`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
