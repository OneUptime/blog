# How to Use firewalld as an Alternative to UFW on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, firewalld, Firewall, Security, Networking

Description: Install and configure firewalld on Ubuntu as an alternative to UFW, covering zones, services, rich rules, and the key differences from UFW's approach to firewall management.

---

UFW is Ubuntu's default firewall management tool, but firewalld - which is the default on RHEL, Fedora, and CentOS - works on Ubuntu as well. If you manage mixed Linux environments and want consistent firewall tooling across Ubuntu and RHEL-based systems, or if you specifically need firewalld's zone-based model, this guide covers getting it running on Ubuntu.

## firewalld vs UFW: Conceptual Differences

UFW and firewalld take fundamentally different approaches:

**UFW** uses a simple rule model: you add explicit allow/deny rules, and UFW applies them in order. Rules are primarily defined around ports and protocols.

**firewalld** uses a zone-based model. Each network interface is assigned to a zone, and each zone has a predefined trust level. You add services or ports to zones, and the zone's rules apply to traffic on that interface.

Zones like `public` (default for untrusted interfaces), `trusted` (allow everything), `home` (trust LAN), and `internal` provide sensible defaults you can build on.

## Installing firewalld

First, disable UFW to avoid conflicts:

```bash
# Disable UFW before installing firewalld
sudo systemctl stop ufw
sudo systemctl disable ufw

# Install firewalld
sudo apt update
sudo apt install -y firewalld

# Enable and start firewalld
sudo systemctl enable --now firewalld

# Check status
sudo systemctl status firewalld
sudo firewall-cmd --state
```

## Understanding Zones

firewalld ships with several predefined zones:

```bash
# List all available zones
sudo firewall-cmd --get-zones

# Show details for a specific zone
sudo firewall-cmd --zone=public --list-all

# Show all zones with their configurations
sudo firewall-cmd --list-all-zones
```

Default zones and their trust levels:
- `drop`: silently drop all incoming, only outgoing allowed
- `block`: reject incoming with ICMP unreachable, only outgoing allowed
- `public`: untrusted public networks, allow selected services
- `external`: for external masquerading interfaces (NAT/router)
- `home`: home LAN, trust other systems
- `internal`: internal LAN, higher trust
- `trusted`: trust all connections

## Checking and Setting the Default Zone

```bash
# Check current default zone
sudo firewall-cmd --get-default-zone

# Change default zone
sudo firewall-cmd --set-default-zone=public

# Assign an interface to a specific zone
sudo firewall-cmd --zone=public --change-interface=eth0 --permanent

# Make zone assignment permanent (survives reboot)
sudo firewall-cmd --permanent --zone=internal --change-interface=eth1
```

## Managing Services

firewalld has predefined service definitions for common applications:

```bash
# List all predefined services
sudo firewall-cmd --get-services

# Show details of a service
sudo firewall-cmd --info-service=ssh
sudo firewall-cmd --info-service=http

# Add a service to the public zone
sudo firewall-cmd --zone=public --add-service=http
sudo firewall-cmd --zone=public --add-service=https

# Make it permanent (otherwise resets on reload/reboot)
sudo firewall-cmd --permanent --zone=public --add-service=http
sudo firewall-cmd --permanent --zone=public --add-service=https

# Remove a service
sudo firewall-cmd --permanent --zone=public --remove-service=telnet

# Reload to apply permanent changes
sudo firewall-cmd --reload
```

## Managing Ports Directly

If there is no predefined service, manage ports directly:

```bash
# Allow a specific port
sudo firewall-cmd --permanent --zone=public --add-port=8080/tcp

# Allow a port range
sudo firewall-cmd --permanent --zone=public --add-port=8080-8090/tcp

# Allow UDP
sudo firewall-cmd --permanent --zone=public --add-port=51820/udp  # WireGuard

# Remove a port
sudo firewall-cmd --permanent --zone=public --remove-port=8080/tcp

# Apply changes
sudo firewall-cmd --reload

# Check what is open
sudo firewall-cmd --zone=public --list-ports
```

## Restricting Services to Specific Sources

Similar to UFW's `allow from subnet to port` syntax:

```bash
# Allow SSH only from a specific subnet using rich rules
sudo firewall-cmd --permanent --zone=public --add-rich-rule='
  rule family="ipv4"
  source address="10.0.10.0/24"
  service name="ssh"
  accept'

# Allow a port from a specific IP
sudo firewall-cmd --permanent --zone=public --add-rich-rule='
  rule family="ipv4"
  source address="203.0.113.50"
  port port="9090" protocol="tcp"
  accept'

# Block a specific IP
sudo firewall-cmd --permanent --zone=public --add-rich-rule='
  rule family="ipv4"
  source address="198.51.100.100"
  drop'

sudo firewall-cmd --reload
```

Rich rules give you the fine-grained control equivalent to UFW's `allow from/to` syntax.

## Zone Configuration Files

firewalld stores configuration in XML:

```bash
# Default zone configurations
ls /usr/lib/firewalld/zones/

# User-modified zones (overrides defaults)
ls /etc/firewalld/zones/

# View a zone configuration file
cat /etc/firewalld/zones/public.xml
```

A typical public.xml after customization:

```xml
<?xml version="1.0" encoding="utf-8"?>
<zone>
  <short>Public</short>
  <description>For public interfaces</description>
  <service name="ssh"/>
  <service name="http"/>
  <service name="https"/>
  <port protocol="tcp" port="8443"/>
</zone>
```

## Creating Custom Services

Define your own service for cleaner management:

```bash
# Create a custom service definition
sudo nano /etc/firewalld/services/myapp.xml
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>MyApp</short>
  <description>Custom application service</description>
  <port protocol="tcp" port="8080"/>
  <port protocol="tcp" port="8443"/>
</service>
```

```bash
# Reload firewalld to pick up the new service
sudo firewall-cmd --reload

# Now use it like any other service
sudo firewall-cmd --permanent --zone=public --add-service=myapp
sudo firewall-cmd --reload
```

## Direct Rules (iptables-Compatible)

For complex scenarios that rich rules do not cover, firewalld has direct rules that work like iptables:

```bash
# Add an iptables-compatible direct rule
sudo firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 \
  -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set

sudo firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 1 \
  -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update \
  --seconds 60 --hitcount 4 -j DROP

sudo firewall-cmd --reload
```

## Panic Mode

Immediately block all traffic (useful in incidents):

```bash
# Enable panic mode - blocks ALL traffic including established connections
sudo firewall-cmd --panic-on

# Disable panic mode
sudo firewall-cmd --panic-off

# Check panic mode status
sudo firewall-cmd --query-panic
```

## Comparing firewalld and UFW Commands

| Task | UFW | firewalld |
|------|-----|-----------|
| Allow SSH | `ufw allow ssh` | `firewall-cmd --add-service=ssh` |
| Allow port | `ufw allow 8080` | `firewall-cmd --add-port=8080/tcp` |
| Allow from subnet | `ufw allow from 10.0.0.0/8 to any port 22` | `firewall-cmd --add-rich-rule='rule source address="10.0.0.0/8" service name="ssh" accept'` |
| Deny all | `ufw default deny` | `firewall-cmd --set-default-zone=drop` |
| Show rules | `ufw status verbose` | `firewall-cmd --list-all` |
| Reload | `ufw reload` | `firewall-cmd --reload` |

## Logging with firewalld

```bash
# Enable logging for denied packets
sudo firewall-cmd --set-log-denied=all

# Logging options: off, all, unicast, broadcast, multicast
sudo firewall-cmd --set-log-denied=unicast

# View logged packets
sudo journalctl -k | grep "REJECT\|DROP"

# Or add logging to a specific rich rule
sudo firewall-cmd --permanent --zone=public --add-rich-rule='
  rule family="ipv4"
  source address="0.0.0.0/0"
  service name="ssh"
  log prefix="ssh-access: " level="notice"
  accept'
```

## Switching Back to UFW

If you decide firewalld is not for you:

```bash
# Disable firewalld
sudo systemctl stop firewalld
sudo systemctl disable firewalld

# Re-enable UFW
sudo systemctl enable --now ufw
sudo ufw enable
```

firewalld's zone model makes sense for systems that move between networks (laptops that connect to home, office, and public WiFi) or for organizations already standardized on RHEL tooling. For typical Ubuntu servers, UFW's simpler model is often sufficient, but knowing firewalld is worthwhile if you work across distributions.
