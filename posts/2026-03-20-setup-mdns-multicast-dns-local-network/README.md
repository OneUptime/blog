# How to Set Up mDNS (Multicast DNS) on a Local Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, mDNS, Multicast, DNS, Avahi, Linux

Description: Configure mDNS on Linux using Avahi to enable zero-configuration hostname resolution across a local network segment without a traditional DNS server.

## Introduction

Multicast DNS (mDNS, RFC 6762) allows devices to resolve `.local` hostnames on a local network segment without a central DNS server. It uses IPv4 multicast address `224.0.0.251`, IPv6 multicast address `FF02::FB`, and UDP port 5353. Avahi is the standard mDNS implementation on Linux.

## Installing Avahi

```bash
# Ubuntu/Debian

sudo apt update && sudo apt install -y avahi-daemon avahi-utils libnss-mdns

# RHEL/CentOS/Fedora (enable EPEL if nss-mdns is unavailable)
sudo dnf install -y avahi avahi-tools nss-mdns
```

## Starting and Enabling the Avahi Daemon

```bash
# Enable and start the Avahi daemon
sudo systemctl enable --now avahi-daemon

# Verify it is running
sudo systemctl status avahi-daemon
```

## Configuring Avahi

The main configuration file is `/etc/avahi/avahi-daemon.conf`:

```bash
sudo nano /etc/avahi/avahi-daemon.conf
```

Key settings to review:

```ini
[server]
# Hostname advertised on the network (defaults to system hostname)
host-name=myserver

# Domain to use (default: local)
domain-name=local

# Only advertise on specific interfaces (leave empty for all local non-loopback interfaces)
allow-interfaces=eth0

# Ignore specific interfaces
deny-interfaces=eth1

[publish]
# Publish address records for local IP addresses
publish-addresses=yes

# Publish a workstation service for browsing hosts
publish-workstation=yes
```

Restart after changes:

```bash
sudo systemctl restart avahi-daemon
```

## Testing mDNS Resolution

```bash
# Resolve a .local hostname using avahi-resolve
avahi-resolve --name myserver.local

# Ping a .local host (works if nsswitch.conf includes mdns)
ping myserver.local
```

## Configuring nsswitch.conf for .local Resolution

Ensure the system uses mDNS for `.local` lookups:

```bash
# Check /etc/nsswitch.conf hosts line
grep ^hosts /etc/nsswitch.conf
```

It should include `mdns4_minimal` before `dns`:

```text
hosts: files mdns4_minimal [NOTFOUND=return] dns
```

If not, edit it:

```bash
sudo sed -i 's/^hosts:.*/hosts: files mdns4_minimal [NOTFOUND=return] dns/' /etc/nsswitch.conf
```

## Browsing mDNS Services

```bash
# List all services advertised via mDNS on the local network
avahi-browse --all --resolve --terminate

# Browse only HTTP services
avahi-browse _http._tcp --resolve --terminate
```

## Publishing a Custom Service

Create a service definition file to advertise a service via mDNS:

```bash
# Create an mDNS service file for an HTTP server on port 80
sudo tee /etc/avahi/services/http.service > /dev/null << 'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">%h Web Server</name>
  <service>
    <type>_http._tcp</type>
    <port>80</port>
  </service>
</service-group>
EOF

# Reload Avahi to publish the new service
sudo systemctl reload avahi-daemon
```

## Allowing mDNS Through the Firewall

```bash
# Allow IPv4 mDNS traffic (UDP port 5353 to 224.0.0.251)
sudo iptables -A INPUT -p udp --dport 5353 -d 224.0.0.251 -j ACCEPT
sudo iptables -A OUTPUT -p udp --dport 5353 -d 224.0.0.251 -j ACCEPT
```

## Conclusion

Avahi makes mDNS setup straightforward on Linux. With `avahi-daemon` running and `mdns4_minimal` in `nsswitch.conf`, devices on the same local link can discover each other by `.local` hostname without any DNS server infrastructure.
