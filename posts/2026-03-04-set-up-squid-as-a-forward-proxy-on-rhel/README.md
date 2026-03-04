# How to Set Up Squid as a Forward Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Squid, Proxy, Networking, Caching

Description: Install and configure Squid as a forward proxy on RHEL to cache web content, control internet access, and log HTTP traffic from your network.

---

Squid is a widely used caching proxy server. On RHEL, you can set it up as a forward proxy to provide controlled, cached internet access for internal clients.

## Install Squid

```bash
# Install Squid
sudo dnf install -y squid

# Enable and start the service
sudo systemctl enable --now squid

# Check the status
sudo systemctl status squid
```

## Basic Configuration

```bash
# Back up the default config
sudo cp /etc/squid/squid.conf /etc/squid/squid.conf.bak

# Edit the configuration
sudo vi /etc/squid/squid.conf
```

Key settings in `/etc/squid/squid.conf`:

```squid
# Define your internal network
acl localnet src 192.168.1.0/24

# Allow the local network to use the proxy
http_access allow localnet

# Deny everything else
http_access deny all

# Listen on port 3128
http_port 3128

# Cache settings - 10 GB disk cache
cache_dir ufs /var/spool/squid 10000 16 256

# Maximum object size to cache (100 MB)
maximum_object_size 100 MB

# Access log location
access_log /var/log/squid/access.log squid

# Visible hostname in error pages
visible_hostname proxy.example.com
```

```bash
# Verify the configuration
sudo squid -k parse

# Reload Squid with the new config
sudo systemctl reload squid
```

## Open the Firewall

```bash
# Allow port 3128 through the firewall
sudo firewall-cmd --permanent --add-port=3128/tcp
sudo firewall-cmd --reload
```

## Configure Clients to Use the Proxy

On client machines:

```bash
# Set the proxy environment variables
export http_proxy=http://192.168.1.10:3128
export https_proxy=http://192.168.1.10:3128

# Test through the proxy
curl -x http://192.168.1.10:3128 http://example.com

# For persistent proxy settings, add to /etc/environment
echo 'http_proxy="http://192.168.1.10:3128"' | sudo tee -a /etc/environment
echo 'https_proxy="http://192.168.1.10:3128"' | sudo tee -a /etc/environment
```

## Block Specific Sites

```squid
# Add to squid.conf
acl blocked_sites dstdomain .facebook.com .twitter.com
http_access deny blocked_sites
```

## Monitor Squid Logs

```bash
# Watch the access log in real time
sudo tail -f /var/log/squid/access.log

# Check cache hit rate
sudo squidclient -h localhost mgr:info | grep "Hit Ratios"
```

Squid can significantly reduce bandwidth usage by caching frequently accessed content. Monitor the cache hit ratio to verify it is providing value.
