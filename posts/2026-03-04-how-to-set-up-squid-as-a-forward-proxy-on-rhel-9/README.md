# How to Set Up Squid as a Forward Proxy on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Proxy

Description: Step-by-step guide on set up squid as a forward proxy on rhel 9 with practical examples and commands.

---

Squid is a caching proxy server that can accelerate web access and provide content filtering on RHEL 9.

## Install Squid

```bash
sudo dnf install -y squid
```

## Basic Configuration

Edit the Squid configuration:

```bash
sudo vi /etc/squid/squid.conf
```

Key settings:

```bash
# Listen port
http_port 3128

# Access control
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16

acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 443
acl Safe_ports port 8080

http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localnet
http_access allow localhost
http_access deny all
```

## Configure Caching

```bash
# Cache settings
cache_dir ufs /var/spool/squid 10000 16 256
maximum_object_size 100 MB
cache_mem 256 MB
```

## Start Squid

```bash
sudo systemctl enable --now squid
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=3128/tcp
sudo firewall-cmd --reload
```

## Configure Clients

Set the proxy on client machines:

```bash
export http_proxy=http://proxy.example.com:3128
export https_proxy=http://proxy.example.com:3128
```

## URL Filtering

Block specific domains:

```bash
acl blocked_sites dstdomain .facebook.com .twitter.com
http_access deny blocked_sites
```

## Authentication

Configure basic authentication:

```bash
sudo dnf install -y httpd-tools
sudo htpasswd -c /etc/squid/passwords proxyuser

# Add to squid.conf
auth_param basic program /usr/lib64/squid/basic_ncsa_auth /etc/squid/passwords
acl authenticated proxy_auth REQUIRED
http_access allow authenticated
```

## Monitor Squid

```bash
sudo tail -f /var/log/squid/access.log
sudo squidclient -h localhost mgr:info
```

## Conclusion

Squid provides caching, access control, and content filtering for RHEL 9 networks. Configure appropriate ACLs and caching parameters based on your network requirements.

