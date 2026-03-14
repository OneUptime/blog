# How to Set Up Squid as a Transparent Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Squid, Transparent Proxy, Iptables, Network, Linux

Description: Configure Squid as a transparent proxy on RHEL so client machines are automatically routed through the proxy without any client-side configuration.

---

A transparent proxy intercepts traffic without requiring clients to configure proxy settings. Network traffic is redirected to Squid via firewall rules. This guide covers setting up a transparent Squid proxy on RHEL.

## Install Squid

```bash
sudo dnf install -y squid
```

## Configure Squid for Transparent Mode

```bash
sudo tee /etc/squid/squid.conf << 'CONF'
# Transparent proxy configuration
# The "intercept" keyword enables transparent mode
http_port 3128 intercept
https_port 3129 intercept ssl-bump cert=/etc/squid/ssl/squid-ca.pem

# Define local networks
acl localnet src 10.0.0.0/8
acl localnet src 192.168.0.0/16

# Standard port ACLs
acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 443

# Access rules
http_access deny !Safe_ports
http_access allow localnet
http_access allow localhost
http_access deny all

# Cache settings
cache_dir ufs /var/spool/squid 5000 16 256
maximum_object_size 128 MB
cache_mem 256 MB

# DNS
dns_nameservers 8.8.8.8 8.8.4.4

# Logging
access_log /var/log/squid/access.log squid

# Visible hostname
visible_hostname transparent-proxy.example.com
CONF
```

## Enable IP Forwarding

```bash
# Enable IP forwarding so the proxy can route traffic
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-proxy.conf
sudo sysctl -p /etc/sysctl.d/99-proxy.conf

# Verify
sysctl net.ipv4.ip_forward
```

## Configure iptables for Traffic Redirection

```bash
# Install iptables-services
sudo dnf install -y iptables-services

# Redirect HTTP traffic (port 80) to Squid (port 3128)
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 \
  -j REDIRECT --to-port 3128

# If this machine is also a gateway, redirect traffic from other machines
sudo iptables -t nat -A PREROUTING -s 192.168.1.0/24 -p tcp --dport 80 \
  -j REDIRECT --to-port 3128

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow Squid port
sudo iptables -A INPUT -p tcp --dport 3128 -j ACCEPT

# Save the iptables rules
sudo iptables-save | sudo tee /etc/sysconfig/iptables
sudo systemctl enable --now iptables
```

## Alternative: Use nftables

```bash
# If using nftables instead of iptables
sudo nft add table ip nat
sudo nft add chain ip nat prerouting { type nat hook prerouting priority -100 \; }
sudo nft add rule ip nat prerouting iifname "eth0" tcp dport 80 redirect to :3128

# Save nftables rules
sudo nft list ruleset | sudo tee /etc/nftables/transparent-proxy.nft
```

## Configure Client Default Gateway

For transparent proxy to work, clients must use the proxy server as their default gateway. Configure this on your DHCP server:

```text
# Example DHCP configuration (on your DHCP server)
subnet 192.168.1.0 netmask 255.255.255.0 {
    option routers 192.168.1.1;          # Proxy server IP
    option domain-name-servers 8.8.8.8;
    range 192.168.1.100 192.168.1.200;
}
```

## Start Squid

```bash
# Initialize cache
sudo squid -z

# Verify configuration
sudo squid -k parse

# Start Squid
sudo systemctl enable --now squid
```

## SELinux Configuration

```bash
# Allow Squid to intercept connections
sudo setsebool -P squid_connect_any 1

# If SELinux blocks the redirect
sudo ausearch -m AVC -c squid -ts recent
```

## Test the Transparent Proxy

```bash
# From a client machine (whose gateway is the proxy server)
# No proxy settings needed - traffic is intercepted automatically
curl http://www.example.com

# Check the Squid access log on the proxy server
sudo tail -f /var/log/squid/access.log
```

## Verify Traffic is Being Intercepted

```bash
# On the proxy server, check active connections
sudo squidclient mgr:active_requests

# Check cache hit rate
sudo squidclient mgr:info | grep -A 5 "Cache Hits"
```

Transparent proxying eliminates the need to configure each client individually, but it only works for HTTP traffic by default. HTTPS interception requires additional SSL bump configuration.
