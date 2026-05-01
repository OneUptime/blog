# How to Configure firewalld Zones and Services on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: firewalld, RHEL, Linux, Firewall, Zone, Security

Description: Configure firewalld zones and services on Red Hat Enterprise Linux to manage network access control with a dynamic, zone-based firewall model.

firewalld is the default firewall management tool on RHEL, CentOS, and Fedora. It uses zones to group interfaces with trust levels and services to define port/protocol rules without writing low-level firewall rules directly.

## Zone Concepts

firewalld zones define the trust level for network connections:

```text
Zone         Default Behavior
-----------  -----------------------------------------------
drop         Drop unsolicited incoming; allow outgoing
block        Reject unsolicited incoming; allow outgoing
public       Allow SSH, DHCPv6 only (default for new ifaces)
external     IPv4 masquerading; allow SSH
dmz          Allow SSH; limited incoming
work         Trust some; allow SSH, DHCPv6, ipp-client
home         Trust local; allow SSH, mDNS, samba-client, DHCPv6
trusted      Allow all connections
internal     Same as home
```

## Basic firewalld Commands

```bash
# Check firewalld status

sudo systemctl status firewalld

# Start and enable
sudo systemctl enable --now firewalld

# Check active zones and their interfaces
sudo firewall-cmd --get-active-zones

# List all rules in the default zone
sudo firewall-cmd --list-all

# List rules for a specific zone
sudo firewall-cmd --zone=public --list-all
```

## Adding Services to a Zone

Predefined services are named groups of ports/protocols defined in `/usr/lib/firewalld/services/`:

```bash
# Allow HTTP and HTTPS in the public zone (runtime only)
sudo firewall-cmd --zone=public --add-service=http
sudo firewall-cmd --zone=public --add-service=https

# Make it permanent (survives reboot)
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --zone=public --add-service=https --permanent

# Reload to apply permanent rules to runtime
sudo firewall-cmd --reload

# List available services
sudo firewall-cmd --get-services
```

## Adding Ports Directly

When no named service exists, add ports directly:

```bash
# Allow TCP port 8080
sudo firewall-cmd --zone=public --add-port=8080/tcp --permanent

# Allow a UDP port range
sudo firewall-cmd --zone=public --add-port=60000-61000/udp --permanent

# Remove a port
sudo firewall-cmd --zone=public --remove-port=8080/tcp --permanent

sudo firewall-cmd --reload
```

## Assigning Interfaces to Zones

```bash
# Assign eth0 to the internal zone
sudo firewall-cmd --zone=internal --add-interface=eth0 --permanent

# Change an interface's zone
sudo firewall-cmd --zone=public --change-interface=eth1 --permanent

# Query which zone an interface belongs to
sudo firewall-cmd --get-zone-of-interface=eth0

sudo firewall-cmd --reload
```

## Creating a Custom Service

Define a custom service for a non-standard application:

```bash
# Create a custom service file
sudo firewall-cmd --new-service=myapp --permanent

sudo firewall-cmd --service=myapp \
  --set-description="My Application" --permanent

sudo firewall-cmd --service=myapp \
  --add-port=9200/tcp --permanent

sudo firewall-cmd --service=myapp \
  --add-port=9300/tcp --permanent

# Add the service to a zone
sudo firewall-cmd --zone=public --add-service=myapp --permanent
sudo firewall-cmd --reload
```

## Rich Rules for Advanced Control

Rich rules allow IP-specific access controls:

```bash
# Allow SSH only from a specific subnet
sudo firewall-cmd --zone=public --remove-service=ssh --permanent
sudo firewall-cmd --zone=public \
  --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" service name="ssh" accept' \
  --permanent

# Block all traffic from a specific IP
sudo firewall-cmd --zone=public \
  --add-rich-rule='rule family="ipv4" source address="10.0.0.5" drop' \
  --permanent

# Rate limit SSH connections after removing the default SSH service
sudo firewall-cmd --zone=public \
  --add-rich-rule='rule service name="ssh" accept limit value="4/m"' \
  --permanent

sudo firewall-cmd --reload
```

## Enabling IP Masquerading

Enable IPv4 masquerading (NAT) for a zone (useful for routers):

```bash
# Enable IPv4 masquerading in the external zone
sudo firewall-cmd --zone=external --add-masquerade --permanent
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --zone=external --query-masquerade
```

firewalld's zone model makes it easy to apply different trust levels to different network segments without managing low-level packet-filter rules directly.
