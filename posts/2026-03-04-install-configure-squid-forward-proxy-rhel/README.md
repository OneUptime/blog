# How to Install and Configure Squid Forward Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Squid, Proxy, Caching, Network, Linux

Description: Install and configure Squid as a forward proxy server on RHEL to cache web content, control internet access, and improve network performance.

---

Squid is a high-performance caching and forwarding HTTP proxy. As a forward proxy, it sits between client machines and the internet, caching content and enforcing access policies.

## Install Squid

```bash
# Install Squid from the default repositories
sudo dnf install -y squid

# Check the installed version
squid -v | head -1
```

## Configure Squid

```bash
# Back up the default configuration
sudo cp /etc/squid/squid.conf /etc/squid/squid.conf.bak

# Create a clean configuration
sudo tee /etc/squid/squid.conf << 'CONF'
# Squid Forward Proxy Configuration

# Define the listening port
http_port 3128

# Define local networks
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16

# Define safe ports
acl SSL_ports port 443
acl Safe_ports port 80        # HTTP
acl Safe_ports port 443       # HTTPS
acl Safe_ports port 21        # FTP
acl Safe_ports port 8080      # Alternative HTTP

# Access rules
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localnet
http_access allow localhost
http_access deny all

# Cache configuration
cache_dir ufs /var/spool/squid 10000 16 256
maximum_object_size 256 MB
cache_mem 512 MB

# Cache peers and DNS
dns_nameservers 8.8.8.8 8.8.4.4

# Logging
access_log /var/log/squid/access.log squid
cache_log /var/log/squid/cache.log

# Visible hostname
visible_hostname proxy.example.com

# Timeouts
connect_timeout 30 seconds
read_timeout 60 seconds

# Do not forward client IP
forwarded_for off
CONF
```

## Initialize and Start Squid

```bash
# Create the cache directories
sudo squid -z

# Verify the configuration syntax
sudo squid -k parse

# Start and enable Squid
sudo systemctl enable --now squid

# Check the status
sudo systemctl status squid
```

## Configure the Firewall

```bash
# Allow the Squid port
sudo firewall-cmd --permanent --add-port=3128/tcp
sudo firewall-cmd --reload
```

## Configure SELinux

```bash
# Allow Squid to connect to the network
sudo setsebool -P squid_connect_any 1
```

## Test the Proxy

```bash
# Test from a client machine
curl -x http://proxy.example.com:3128 http://www.example.com

# Test HTTPS through the proxy
curl -x http://proxy.example.com:3128 https://www.example.com

# Check proxy from the server itself
export http_proxy=http://localhost:3128
export https_proxy=http://localhost:3128
curl http://www.example.com
```

## Configure Clients

```bash
# Set proxy environment variables on client machines
export http_proxy="http://proxy.example.com:3128"
export https_proxy="http://proxy.example.com:3128"
export no_proxy="localhost,127.0.0.1,.internal.example.com"

# Make permanent in ~/.bashrc
echo 'export http_proxy="http://proxy.example.com:3128"' >> ~/.bashrc
echo 'export https_proxy="http://proxy.example.com:3128"' >> ~/.bashrc
```

## Monitor Squid

```bash
# View real-time access logs
sudo tail -f /var/log/squid/access.log

# Check cache utilization
sudo squidclient -h localhost mgr:utilization

# View cache info
sudo squidclient -h localhost mgr:info

# Check active connections
sudo squidclient -h localhost mgr:active_requests
```

## Rotate Logs

```bash
# Squid handles log rotation with this command
sudo squid -k rotate

# Or configure logrotate
sudo tee /etc/logrotate.d/squid << 'ROTATE'
/var/log/squid/*.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    postrotate
        /usr/sbin/squid -k rotate
    endscript
}
ROTATE
```

Squid as a forward proxy improves browsing speed through caching and gives administrators control over what traffic leaves the network.
