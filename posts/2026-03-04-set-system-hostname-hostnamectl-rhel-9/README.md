# How to Set the System Hostname with hostnamectl on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Hostnamectl, Hostname, Linux

Description: Learn how to properly set and manage the system hostname on RHEL using hostnamectl, including static, transient, and pretty hostnames.

---

Setting the hostname on a Linux server seems like it should be simple, and on RHEL it mostly is, thanks to `hostnamectl`. But there are some nuances that matter, especially in production environments where the hostname affects logging, monitoring, cluster membership, and authentication. This post covers everything you need to know about hostname management on RHEL.

## The Three Types of Hostnames

RHEL actually maintains three different hostnames, each serving a different purpose:

1. **Static hostname** - The persistent hostname stored on disk. This is the "real" hostname that survives reboots. Stored in `/etc/hostname`.

2. **Transient hostname** - A temporary hostname assigned by the network (e.g., via DHCP). If no static hostname is set, the transient one is used.

3. **Pretty hostname** - A free-form, human-readable description. Can include spaces and special characters. Purely cosmetic, used for display purposes.

```mermaid
flowchart TD
    A[hostnamectl] --> B[Static Hostname]
    A --> C[Transient Hostname]
    A --> D[Pretty Hostname]
    B --> E[/etc/hostname]
    B --> F[Persists across reboots]
    C --> G[Set by DHCP or kernel]
    C --> H[Lost on reboot]
    D --> I[/etc/machine-info]
    D --> J[Display purposes only]
```

## Checking the Current Hostname

```bash
# Show all hostname information
hostnamectl status

# Show just the static hostname
hostnamectl hostname

# Show the hostname using the traditional command
hostname

# Show the FQDN
hostname -f
```

The `hostnamectl status` output shows you all three hostnames plus additional system information:

```bash
 Static hostname: server01.example.com
       Icon name: computer-server
         Chassis: server
      Machine ID: abc123...
         Boot ID: def456...
  Operating System: Red Hat Enterprise Linux 9.4
            Kernel: Linux 5.14.0-362.el9.x86_64
      Architecture: x86-64
   Hardware Vendor: Dell Inc.
```

## Setting the Static Hostname

```bash
# Set the static hostname
hostnamectl set-hostname server01.example.com

# Verify the change
hostnamectl hostname
```

This command:
- Writes the hostname to `/etc/hostname`
- Updates the kernel hostname immediately
- Takes effect without a reboot

### Hostname Naming Rules

The static hostname should follow these rules:

- Only lowercase letters (a-z), digits (0-9), hyphens (-), and dots (.)
- Must not start or end with a hyphen or dot
- Maximum 64 characters for the short hostname
- Maximum 253 characters for the FQDN
- Should be a valid FQDN for production systems

```bash
# Good hostnames
hostnamectl set-hostname web-01.prod.example.com
hostnamectl set-hostname db-primary.dc1.example.com
hostnamectl set-hostname monitor-server.infra.example.com

# Bad hostnames (avoid these)
# hostnamectl set-hostname MyServer     # uppercase
# hostnamectl set-hostname server_01    # underscores
# hostnamectl set-hostname -server01    # starts with hyphen
```

## Setting the Pretty Hostname

The pretty hostname is for human consumption and has no restrictions on characters:

```bash
# Set a pretty hostname
hostnamectl set-hostname "Production Web Server 01" --pretty

# Verify
hostnamectl status | grep "Pretty"
```

The pretty hostname is stored in `/etc/machine-info` and is used by some GUI tools and system information displays.

## Setting the Transient Hostname

```bash
# Set a transient hostname (does not persist across reboots)
hostnamectl set-hostname temp-hostname --transient
```

The transient hostname is rarely set manually. It is typically set by DHCP or the kernel during boot.

## Setting Individual Hostname Types

You can set each type independently:

```bash
# Set only the static hostname
hostnamectl set-hostname server01.example.com --static

# Set only the transient hostname
hostnamectl set-hostname server01.example.com --transient

# Set only the pretty hostname
hostnamectl set-hostname "Server 01 - Production" --pretty
```

## Updating /etc/hosts After Changing the Hostname

After setting a new hostname, update `/etc/hosts` to match:

```bash
# Set the hostname
hostnamectl set-hostname server01.example.com

# Add the hostname to /etc/hosts with the server's real IP
echo "10.0.1.50 server01.example.com server01" >> /etc/hosts
```

If you are changing a hostname that already exists in `/etc/hosts`, update the existing entry:

```bash
# Replace the old hostname entry
sed -i '/old-hostname/d' /etc/hosts
echo "10.0.1.50 server01.example.com server01" >> /etc/hosts
```

## Checking That the Hostname Is Set Correctly

After changing the hostname, verify everything is consistent:

```bash
# Check hostnamectl
hostnamectl hostname

# Check the hostname command
hostname
hostname -f

# Check /etc/hostname
cat /etc/hostname

# Check that it resolves correctly
getent hosts server01.example.com

# Check that the system's own hostname resolves to a real IP (not 127.0.0.1)
getent hosts $(hostname)
```

The last check is particularly important. Many applications (Java apps, databases, cluster software) need the system hostname to resolve to a real, routable IP address, not localhost.

## Hostname and NetworkManager

NetworkManager can interact with the hostname in several ways:

### Preventing DHCP from Changing the Hostname

If you set a static hostname but DHCP keeps overriding it, configure NetworkManager to leave it alone:

```bash
# Prevent NetworkManager from changing the hostname via DHCP
cat > /etc/NetworkManager/conf.d/hostname.conf << 'EOF'
[main]
hostname-mode=none
EOF

# Reload NetworkManager
systemctl reload NetworkManager
```

### Sending the Hostname to DHCP

To have the DHCP server register your hostname:

```bash
# Configure the connection to send the hostname
nmcli connection modify ens192 ipv4.dhcp-send-hostname yes
nmcli connection modify ens192 ipv4.dhcp-hostname "server01.example.com"
nmcli connection up ens192
```

## Hostname and systemd

systemd reads the hostname from `/etc/hostname` during boot. You can also use `systemd-hostnamed` (the service behind hostnamectl) for D-Bus based hostname management.

```bash
# Check if systemd-hostnamed is running
systemctl status systemd-hostnamed

# The hostname file
cat /etc/hostname
```

## Impact of Changing the Hostname

Changing the hostname affects several things:

**Shell prompt** - The PS1 prompt usually includes the hostname. Open a new shell to see the change.

**Logging** - syslog and journald include the hostname in log messages. After a hostname change, new log entries use the new name.

**Monitoring** - Tools like Prometheus, Nagios, or Zabbix identify hosts by name. Changing the hostname may require updating monitoring configurations.

**Cluster software** - Pacemaker, Kubernetes, and other cluster tools use hostnames for node identification. Changing a hostname in a cluster requires careful coordination.

**Certificates** - If your TLS certificates include the hostname in the CN or SAN fields, you may need new certificates.

**SSH** - The SSH host keys are not affected by hostname changes, but SSH known_hosts entries on client machines may need updating.

## Scripting Hostname Setup

For automated provisioning:

```bash
#!/bin/bash
# set-hostname.sh - Set the hostname and update /etc/hosts

HOSTNAME="$1"
IP_ADDRESS="$2"

if [ -z "$HOSTNAME" ] || [ -z "$IP_ADDRESS" ]; then
    echo "Usage: $0 <hostname> <ip-address>"
    exit 1
fi

# Set the static hostname
hostnamectl set-hostname "$HOSTNAME"

# Get the short hostname
SHORT_HOSTNAME="${HOSTNAME%%.*}"

# Remove any existing entry for this host
sed -i "/$SHORT_HOSTNAME/d" /etc/hosts

# Add the new entry
echo "$IP_ADDRESS $HOSTNAME $SHORT_HOSTNAME" >> /etc/hosts

# Verify
echo "Hostname set to: $(hostnamectl hostname)"
echo "Resolves to: $(getent hosts $HOSTNAME)"
```

## Hostname on Cloud Instances

Cloud providers often set the hostname via DHCP or cloud-init. If you want to override this:

```bash
# Set a persistent hostname that survives cloud-init
hostnamectl set-hostname server01.example.com

# Prevent cloud-init from overwriting the hostname
cat > /etc/cloud/cloud.cfg.d/99-hostname.cfg << 'EOF'
preserve_hostname: true
EOF
```

## Wrapping Up

Setting the hostname on RHEL is a straightforward operation with `hostnamectl`, but getting it right means more than just running one command. You need to update `/etc/hosts`, verify that the hostname resolves to the correct IP, and consider the downstream effects on logging, monitoring, and cluster membership. Take the time to set it up properly during provisioning and you will avoid a surprising number of hard-to-diagnose issues down the road.
