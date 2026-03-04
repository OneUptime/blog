# How to Cache YUM/DNF Repositories with Squid Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Squid, YUM, DNF, Caching, Repository, Linux

Description: Use Squid proxy on RHEL to cache RPM packages from YUM/DNF repositories, reducing bandwidth usage and speeding up package installations across multiple servers.

---

When you have many RHEL servers running package updates, each one downloads the same RPM files from the internet. A caching Squid proxy stores these packages locally after the first download, saving bandwidth and speeding up subsequent installs.

## Install and Configure Squid

```bash
sudo dnf install -y squid
```

## Optimize Squid for Repository Caching

```bash
sudo tee /etc/squid/squid.conf << 'CONF'
# Listening port
http_port 3128

# Define local networks
acl localnet src 10.0.0.0/8
acl localnet src 192.168.0.0/16

# Standard ACLs
acl Safe_ports port 80 443 8080
http_access allow localnet
http_access allow localhost
http_access deny all

# Cache directory - allocate generous space for RPM packages
# 50GB cache, 16 first-level dirs, 256 second-level dirs
cache_dir ufs /var/spool/squid 50000 16 256

# Allow caching of large RPM files (up to 2GB)
maximum_object_size 2048 MB

# Memory cache
cache_mem 1024 MB
maximum_object_size_in_memory 128 MB

# Override cache-control headers for RPM repositories
# RPM files never change once published (same filename = same content)
refresh_pattern -i \.rpm$          129600  100%  129600 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-cache
refresh_pattern -i \.drpm$         129600  100%  129600 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-cache
refresh_pattern -i \.srpm$         129600  100%  129600 override-expire override-lastmod reload-into-ims ignore-reload ignore-no-cache

# Cache repository metadata for a shorter time (it changes with updates)
refresh_pattern -i repodata/       0       20%   4320  reload-into-ims
refresh_pattern -i /repomd\.xml$   0       20%   4320  reload-into-ims

# Default refresh patterns
refresh_pattern ^ftp:              1440    20%   10080
refresh_pattern ^gopher:           1440    0%    1440
refresh_pattern -i (/cgi-bin/|\?)  0       0%    0
refresh_pattern .                  0       20%   4320

# Do not cache HTTPS content (we only cache plain HTTP repos)
# If your repos use HTTPS, consider using "peek and splice" SSL bump

# Range request handling (important for yum/dnf partial downloads)
range_offset_limit -1

# Cache store log for debugging
cache_store_log /var/log/squid/store.log

# Access log
access_log /var/log/squid/access.log squid

# DNS
dns_nameservers 8.8.8.8 8.8.4.4

visible_hostname yum-cache.example.com
CONF
```

## Start Squid

```bash
# Initialize cache directories
sudo squid -z

# Verify configuration
sudo squid -k parse

# Start Squid
sudo systemctl enable --now squid
```

## Configure Client Servers

On each RHEL server that should use the cache:

```bash
# Configure DNF to use the proxy
sudo tee /etc/dnf/dnf.conf << 'DNFCONF'
[main]
gpgcheck=1
installonly_limit=3
clean_requirements_on_remove=True
best=True
skip_if_unavailable=False
proxy=http://yum-cache.example.com:3128
DNFCONF
```

Or set it per-repository in `/etc/yum.repos.d/`:

```bash
# Add proxy line to a specific repo
sudo sed -i '/^\[baseos\]/a proxy=http://yum-cache.example.com:3128' \
  /etc/yum.repos.d/redhat.repo
```

## Test the Cache

```bash
# On the first client, install a package
sudo dnf install -y vim

# Check the Squid access log for cache MISS
sudo grep "vim" /var/log/squid/access.log

# On a second client, install the same package
sudo dnf install -y vim

# Check the log - should show TCP_HIT (cached)
sudo grep "vim" /var/log/squid/access.log
```

## Monitor Cache Performance

```bash
# Check cache hit ratio
sudo squidclient mgr:info | grep -A 10 "Cache Hits"

# Check cache storage usage
sudo du -sh /var/spool/squid

# View what is being cached
sudo tail -f /var/log/squid/store.log | grep rpm
```

## Firewall

```bash
sudo firewall-cmd --permanent --add-port=3128/tcp
sudo firewall-cmd --reload
```

## SELinux

```bash
sudo setsebool -P squid_connect_any 1
```

With a properly tuned Squid cache, the first server to download a package caches it locally, and every subsequent server gets it from the cache at LAN speed instead of downloading from the internet again.
