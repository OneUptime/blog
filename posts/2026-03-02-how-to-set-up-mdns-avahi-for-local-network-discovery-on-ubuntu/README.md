# How to Set Up mDNS/Avahi for Local Network Discovery on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MDNS, Avahi, Service Discovery, Networking

Description: Configure Avahi on Ubuntu to enable mDNS-based local service discovery, publish custom services, and integrate with systemd-resolved for .local hostname resolution.

---

mDNS (Multicast DNS) lets devices on a local network discover each other by hostname without a DNS server. A machine named `server` becomes reachable as `server.local`. Avahi is the Linux implementation of mDNS and DNS-SD (DNS Service Discovery), which is the same technology behind Apple's Bonjour and used extensively for printers, Chromecast, networked speakers, and development environments.

This is particularly useful in home labs, small office networks, and development setups where running a full DNS infrastructure is overkill.

## Installing Avahi

```bash
# Install the Avahi daemon and utilities
sudo apt update
sudo apt install -y avahi-daemon avahi-utils libnss-mdns

# The avahi-daemon starts automatically on installation
sudo systemctl status avahi-daemon

# Verify it's enabled to start at boot
sudo systemctl is-enabled avahi-daemon
```

The `libnss-mdns` package integrates mDNS resolution into the system's NSS (Name Service Switch) so that `.local` lookups work transparently for any application.

## Basic Configuration

Avahi's main configuration file is `/etc/avahi/avahi-daemon.conf`:

```bash
# View the default configuration
sudo cat /etc/avahi/avahi-daemon.conf
```

For most setups, the defaults work fine. Common customizations:

```ini
# /etc/avahi/avahi-daemon.conf

[server]
# Specify which interface to publish on (omit to use all non-loopback interfaces)
# allow-interfaces=eth0,wlan0

# Deny mDNS on specific interfaces (useful for VPN or untrusted interfaces)
# deny-interfaces=wg0,tun0

# Use the system hostname as the mDNS hostname
use-iff-running=no

# Enable IPv4 and/or IPv6
use-ipv4=yes
use-ipv6=yes

# Set hostname explicitly (default: system hostname)
# host-name=myserver

# The domain suffix for local names
domain-name=local

# Do not announce on link-local addresses by default
# publish-address=yes

[publish]
# Whether to publish this machine's hostname and addresses
disable-publishing=no
disable-user-service-publishing=no

# Publish addresses (set to 'no' to be a resolver only)
publish-addresses=yes
publish-hinfo=yes
publish-workstation=yes

[reflector]
# Whether to reflect mDNS between interfaces
# Enable this only if you need mDNS to cross subnet boundaries
enable-reflector=no

[rlimits]
# Resource limits for the daemon
rlimit-core=0
rlimit-nofile=300
rlimit-stack=4194304
```

```bash
# Apply configuration changes
sudo systemctl restart avahi-daemon
```

## NSS Integration for .local Resolution

The `libnss-mdns` package modifies `/etc/nsswitch.conf` to add `mdns4_minimal` to the hosts resolution chain:

```bash
# Check the hosts line in nsswitch.conf
grep hosts /etc/nsswitch.conf

# It should look like:
# hosts: files mdns4_minimal [NOTFOUND=return] dns
```

With this in place, any program that uses `getaddrinfo()` can resolve `.local` names:

```bash
# Test resolution from the command line
ping -c 2 myserver.local

# Resolve using avahi-resolve directly
avahi-resolve --name myserver.local

# Resolve an IP address back to a name
avahi-resolve --address 192.168.1.100
```

## Integration with systemd-resolved

Ubuntu 22.04+ uses systemd-resolved by default. Avahi and systemd-resolved can coexist:

```bash
# Check systemd-resolved status
systemd-resolve --status | head -30

# The MulticastDNS line shows whether resolved has mDNS enabled
# On Ubuntu, Avahi handles mDNS and resolved defers to it

# If you want resolved to handle mDNS instead of Avahi:
# Edit /etc/systemd/resolved.conf:
# [Resolve]
# MulticastDNS=yes

# Then disable Avahi:
# sudo systemctl disable avahi-daemon
# sudo systemctl stop avahi-daemon
```

## Publishing Services

Avahi can announce services so other devices discover them without prior configuration. Service files go in `/etc/avahi/services/`.

### Publishing an SSH Service

```xml
<!-- /etc/avahi/services/ssh.service -->
```

```bash
sudo tee /etc/avahi/services/ssh.service > /dev/null <<'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <!-- Human-readable name for this announcement -->
  <name replace-wildcards="yes">%h SSH Service</name>

  <service>
    <!-- Service type in DNS-SD notation: _service._protocol -->
    <type>_ssh._tcp</type>

    <!-- Port the service listens on -->
    <port>22</port>
  </service>
</service-group>
EOF
```

### Publishing an HTTP Service

```bash
sudo tee /etc/avahi/services/http.service > /dev/null <<'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">%h Web Server</name>

  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <!-- Optional TXT records with service metadata -->
    <txt-record>path=/</txt-record>
    <txt-record>version=1.0</txt-record>
  </service>

  <!-- Publish HTTPS on a separate port in the same group -->
  <service>
    <type>_https._tcp</type>
    <port>443</port>
    <txt-record>path=/</txt-record>
  </service>
</service-group>
EOF
```

### Publishing a Custom Application Service

```bash
sudo tee /etc/avahi/services/myapp.service > /dev/null <<'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <!-- Use a fixed name instead of the hostname wildcard -->
  <name>MyApp API Server</name>

  <service>
    <!-- Create a custom service type for your application -->
    <type>_myapp._tcp</type>
    <port>8080</port>
    <txt-record>api_version=2</txt-record>
    <txt-record>environment=production</txt-record>
  </service>
</service-group>
EOF

# Avahi automatically detects new service files; a restart is not required
# But you can restart to apply immediately
sudo systemctl restart avahi-daemon
```

## Browsing and Discovering Services

```bash
# Browse all services on the local network
avahi-browse --all

# Browse only SSH services
avahi-browse _ssh._tcp

# Browse with automatic resolution of addresses
avahi-browse --all --resolve

# Terminate after listing (don't wait for new announcements)
avahi-browse --all --terminate

# Browse using a more readable format
avahi-browse --all --parsable --terminate
```

## mDNS Across VLANs with Avahi Reflector

By default, mDNS is link-local - it doesn't cross router boundaries. If you have devices on different VLANs that need to discover each other, the Avahi reflector mode proxies mDNS packets between interfaces:

```bash
sudo tee -a /etc/avahi/avahi-daemon.conf > /dev/null <<'EOF'

[reflector]
enable-reflector=yes
# reflect-ipv=yes  # Also reflect IPv6 mDNS
EOF

sudo systemctl restart avahi-daemon
```

Note that the host enabling reflection needs to have interfaces in both VLANs - typically this is the router or a multi-homed server.

## Security Considerations

mDNS is inherently a trust-based protocol - any device on the network can announce any service name. In untrusted network environments:

```bash
# Restrict Avahi to specific trusted interfaces
# Edit /etc/avahi/avahi-daemon.conf:
# allow-interfaces=eth0

# Or deny it on untrusted interfaces:
# deny-interfaces=tun0,wg0

sudo systemctl restart avahi-daemon
```

For environments where mDNS is a security concern, you can disable Avahi entirely and use a proper DNS infrastructure with split-horizon or short-TTL records for service discovery.

## Troubleshooting

```bash
# Check Avahi daemon logs
sudo journalctl -u avahi-daemon -f

# Verify mDNS packets are being sent (port 5353, multicast 224.0.0.251)
sudo tcpdump -i eth0 -n 'udp port 5353'

# Test if the local machine's hostname is being announced
avahi-resolve --name $(hostname).local

# If .local names aren't resolving, check nsswitch.conf
grep hosts /etc/nsswitch.conf

# Check if mdns is in the right position - 'dns' should come after mdns4_minimal
# Correct: files mdns4_minimal [NOTFOUND=return] dns

# Verify Avahi sees your interfaces
sudo avahi-daemon --check

# List all interfaces Avahi is using
avahi-browse --dump-db 2>&1 | head -20
```

Avahi is a reliable, low-overhead solution for local network discovery. For development environments especially, the ability to address machines by `hostname.local` instead of IP addresses makes configuration much more portable and readable.
