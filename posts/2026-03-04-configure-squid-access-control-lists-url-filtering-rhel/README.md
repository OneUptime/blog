# How to Configure Squid Access Control Lists and URL Filtering on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Squid, ACLs, URL Filtering, Proxy, Security, Linux

Description: Use Squid ACLs on RHEL to filter URLs, block unwanted websites, restrict access by time, and enforce browsing policies for your network.

---

Squid's Access Control Lists (ACLs) provide granular control over what traffic is allowed through the proxy. You can filter by domain, URL pattern, time of day, source IP, and more.

## Basic ACL Types

```bash
sudo tee /etc/squid/squid.conf << 'CONF'
# Proxy port
http_port 3128

# Source-based ACLs
acl localnet src 10.0.0.0/8
acl management src 10.0.1.0/24
acl developers src 10.0.2.0/24
acl guests src 10.0.99.0/24

# Destination domain ACLs
acl blocked_domains dstdomain .facebook.com .twitter.com .tiktok.com
acl allowed_domains dstdomain .company.com .github.com .stackoverflow.com

# URL regex patterns
acl blocked_urls url_regex -i \.exe$ \.torrent$ \.msi$
acl streaming_urls url_regex -i netflix\.com youtube\.com twitch\.tv

# Port ACLs
acl Safe_ports port 80 443 8080 8443
acl SSL_ports port 443

# MIME type blocking
acl blocked_mime rep_mime_type -i video/mp4 video/x-flv

# Time-based ACLs
acl work_hours time MTWHF 08:00-18:00
acl lunch_break time MTWHF 12:00-13:00

# Access rules (order matters - first match wins)
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports

# Management has full access
http_access allow management

# Block downloads of dangerous file types for all
http_access deny blocked_urls

# Developers get broader access
http_access deny developers blocked_domains
http_access allow developers

# Guests have restricted access during work hours
http_access deny guests streaming_urls work_hours
http_access allow guests allowed_domains
http_access deny guests

# Everyone else - block social media during work hours
http_access deny localnet blocked_domains work_hours
http_access allow localnet blocked_domains lunch_break
http_access allow localnet

http_access deny all

# Block responses with video MIME types for guests
http_reply_access deny blocked_mime guests

# Cache
cache_dir ufs /var/spool/squid 5000 16 256
access_log /var/log/squid/access.log squid
visible_hostname proxy.example.com
CONF
```

## Use External ACL Files

For large blocklists, use external files:

```bash
# Create a blocked domains file
sudo tee /etc/squid/blocked-domains.txt << 'LIST'
.facebook.com
.twitter.com
.instagram.com
.tiktok.com
.reddit.com
.pinterest.com
LIST

# Create a blocked URL patterns file
sudo tee /etc/squid/blocked-urls.txt << 'LIST'
\.exe$
\.torrent$
\.msi$
gambling
casino
LIST

# Reference them in squid.conf
# acl blocked_domains dstdomain "/etc/squid/blocked-domains.txt"
# acl blocked_urls url_regex -i "/etc/squid/blocked-urls.txt"
```

## Block by Content Type

```bash
# Add to squid.conf to block specific content types
acl blocked_content urlpath_regex -i \.(mp3|mp4|avi|mkv|flv|wmv)$
http_access deny blocked_content
```

## Bandwidth Limiting

```bash
# Add delay pools to limit bandwidth for certain users
delay_pools 1
delay_class 1 2
delay_parameters 1 1000000/1000000 256000/256000
delay_access 1 allow guests
delay_access 1 deny all
```

## Custom Deny Page

```bash
# Create a custom error page
sudo tee /usr/share/squid/errors/en/ERR_CUSTOM_ACCESS_DENIED << 'HTML'
<!DOCTYPE html>
<html>
<head><title>Access Denied</title></head>
<body>
<h1>Access Denied</h1>
<p>Your request to <b>%U</b> has been blocked by the proxy server.</p>
<p>If you believe this is an error, contact IT support.</p>
</body>
</html>
HTML

# Reference it in squid.conf
# deny_info ERR_CUSTOM_ACCESS_DENIED blocked_domains
```

## Apply and Test

```bash
# Verify configuration
sudo squid -k parse

# Reload configuration without restart
sudo squid -k reconfigure

# Test blocked access
curl -x http://proxy:3128 http://www.facebook.com
# Should return 403

# Test allowed access
curl -x http://proxy:3128 http://www.github.com
# Should return 200

# Monitor in real time
sudo tail -f /var/log/squid/access.log | grep -E "TCP_DENIED|DENIED"
```

Squid ACLs give you fine-grained control over network traffic flowing through the proxy, enabling you to enforce organizational browsing policies effectively.
