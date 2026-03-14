# How to Set Up Service Discovery with DNS-SD on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, DNS-SD, Service Discovery, MDNS, Avahi, Linux

Description: Learn how to set up DNS-based Service Discovery (DNS-SD) on RHEL using Avahi and standard DNS SRV records to enable automatic service discovery across your network.

---

DNS-based Service Discovery (DNS-SD) lets services announce themselves on a network and lets clients find those services without hardcoding IP addresses or ports. On RHEL, you can implement DNS-SD using Avahi for local networks (mDNS/DNS-SD) or using standard DNS SRV and TXT records for larger environments. This guide covers both approaches.

## Understanding DNS-SD

DNS-SD uses three types of DNS records:

- **PTR records** - map a service type to specific service instances
- **SRV records** - provide the hostname and port for a service instance
- **TXT records** - carry additional key-value metadata about the service

A client looking for a web server would query for `_http._tcp.local` (PTR), get back service instance names, then query those names for SRV records to get the actual host and port.

## Setting Up Avahi for Local DNS-SD

Avahi is an mDNS/DNS-SD implementation that works on local networks without any central DNS infrastructure:

```bash
# Install Avahi
sudo dnf install -y avahi avahi-tools nss-mdns
```

```bash
# Enable and start Avahi
sudo systemctl enable --now avahi-daemon
```

Verify Avahi is running:

```bash
# Check Avahi status
sudo systemctl status avahi-daemon
```

## Configuring Avahi

Edit the main Avahi configuration:

```bash
# Edit Avahi configuration
sudo tee /etc/avahi/avahi-daemon.conf > /dev/null << 'EOF'
[server]
host-name=myserver
domain-name=local
use-ipv4=yes
use-ipv6=yes
allow-interfaces=eth0
deny-interfaces=

[wide-area]
enable-wide-area=yes

[publish]
publish-addresses=yes
publish-hinfo=yes
publish-workstation=yes
publish-domain=yes
publish-aaaa-on-ipv4=yes

[reflector]
enable-reflector=no

[rlimits]
rlimit-core=0
rlimit-data=4194304
rlimit-fstack=4194304
rlimit-nofile=768
rlimit-nproc=3
EOF
```

```bash
# Restart Avahi after configuration changes
sudo systemctl restart avahi-daemon
```

## Publishing a Service with Avahi

Create a service definition file:

```bash
# Define a web service
sudo tee /etc/avahi/services/webapp.service > /dev/null << 'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>My Web Application</name>
  <service>
    <type>_http._tcp</type>
    <port>8080</port>
    <txt-record>path=/api</txt-record>
    <txt-record>version=2.1</txt-record>
  </service>
</service-group>
EOF
```

Avahi picks up new service files automatically. Verify the service is published:

```bash
# Browse for HTTP services on the network
avahi-browse -t _http._tcp
```

```bash
# Resolve a specific service to get host and port
avahi-resolve-host-name myserver.local
```

## Publishing Multiple Services

You can publish multiple services from the same host:

```bash
# Define a database service
sudo tee /etc/avahi/services/database.service > /dev/null << 'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>PostgreSQL Database</name>
  <service>
    <type>_postgresql._tcp</type>
    <port>5432</port>
    <txt-record>database=myapp</txt-record>
    <txt-record>version=15</txt-record>
  </service>
</service-group>
EOF
```

```bash
# Define an SSH service
sudo tee /etc/avahi/services/ssh.service > /dev/null << 'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>SSH on %h</name>
  <service>
    <type>_ssh._tcp</type>
    <port>22</port>
  </service>
</service-group>
EOF
```

## Discovering Services from the Command Line

Use avahi-browse to discover services:

```bash
# Browse all services on the network
avahi-browse -a -t
```

```bash
# Browse and resolve a specific service type
avahi-browse -r _http._tcp
```

```bash
# Browse with detailed output including TXT records
avahi-browse -r -t _postgresql._tcp
```

## Discovering Services Programmatically

Use Python to discover services:

```python
# discover_services.py
import subprocess
import json

def discover_services(service_type):
    result = subprocess.run(
        ["avahi-browse", "-r", "-t", "-p", service_type],
        capture_output=True, text=True
    )
    services = []
    for line in result.stdout.strip().split("\n"):
        if line.startswith("="):
            parts = line.split(";")
            if len(parts) >= 10:
                services.append({
                    "name": parts[3],
                    "host": parts[6],
                    "address": parts[7],
                    "port": int(parts[8]),
                    "txt": parts[9] if len(parts) > 9 else ""
                })
    return services

http_services = discover_services("_http._tcp")
for svc in http_services:
    print(f"Found: {svc['name']} at {svc['address']}:{svc['port']}")
```

## DNS-SD with Standard DNS Infrastructure

For larger environments where mDNS does not scale, use standard DNS SRV records. Configure your BIND DNS server:

```bash
# Add SRV records to your zone file
# /var/named/internal.example.com.zone
_http._tcp.internal.example.com.  IN SRV 10 0 8080 webapp1.internal.example.com.
_http._tcp.internal.example.com.  IN SRV 10 0 8080 webapp2.internal.example.com.
_http._tcp.internal.example.com.  IN SRV 20 0 8080 webapp3.internal.example.com.

; TXT records for service metadata
_http._tcp.internal.example.com.  IN TXT "version=2.1" "path=/api"

; PTR records for service enumeration
_services._dns-sd._udp.internal.example.com.  IN PTR _http._tcp.internal.example.com.
```

Query the SRV records:

```bash
# Look up the SRV records
dig SRV _http._tcp.internal.example.com
```

```bash
# Look up associated TXT records
dig TXT _http._tcp.internal.example.com
```

## Configuring NSS for mDNS Resolution

Enable mDNS hostname resolution system-wide:

```bash
# Edit nsswitch.conf to add mDNS support
sudo sed -i 's/^hosts:.*/hosts:      files mdns4_minimal [NOTFOUND=return] dns myhostname/' /etc/nsswitch.conf
```

Now you can resolve .local hostnames:

```bash
# Resolve an mDNS hostname
ping myserver.local
```

## Firewall Configuration

Allow mDNS traffic through the firewall:

```bash
# Open mDNS port
sudo firewall-cmd --permanent --add-service=mdns
sudo firewall-cmd --reload
```

## Conclusion

DNS-SD on RHEL gives you automatic service discovery that works at the protocol level without requiring additional infrastructure for local networks. Avahi handles the mDNS/DNS-SD implementation for local discovery, while standard DNS SRV records scale the same pattern to larger environments. Both approaches let your services find each other dynamically rather than relying on hardcoded addresses.
