# How to Write IPv6 Addresses in URLs with Square Brackets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, URL, HTTP, Networking, Web Development

Description: Learn the correct syntax for including IPv6 addresses in URLs using square brackets as required by RFC 2732 and RFC 3986, with examples across common tools and languages.

## Introduction

IPv6 addresses contain colons (`:`), which conflict with the colon used to separate a host from a port number in URLs (`host:port`). RFC 2732, later obsoleted by RFC 3986, resolves this by requiring IPv6 addresses in URLs to be enclosed in square brackets `[ ]`.

## Basic Syntax

```text
# Standard URL with IPv4 address and port

http://192.168.1.1:8080/path

# IPv6 address in a URL - square brackets required
http://[2001:db8::1]:8080/path
http://[::1]:3000/

# Without a port, brackets are still required
http://[2001:db8::1]/path
https://[2001:db8:cafe::1]/api/v1/
```

## Correct vs Incorrect Formats

```text
# CORRECT
http://[2001:db8::1]/
http://[2001:db8::1]:8080/api
https://[::1]:443/
ftp://[2001:db8::1]:21/files/

# INCORRECT - missing brackets
http://2001:db8::1/         # Colon ambiguity
http://2001:db8::1:8080/    # Cannot parse port

# INCORRECT - brackets in wrong position
http://[2001:db8::1:8080]/  # Port inside brackets is wrong
```

## Using IPv6 URLs in Common Tools

```bash
# curl with IPv6 address
curl http://[2001:db8::1]:8080/api/health
curl -6 http://[::1]:3000/

# wget with IPv6
wget http://[2001:db8::1]/file.tar.gz

# ssh with IPv6 address in URL-like notation
ssh -6 user@2001:db8::1    # Note: ssh doesn't use brackets

# git clone over IPv6
git clone http://[2001:db8::1]/repo.git

# Browsers accept IPv6 URLs directly
# Just paste: http://[::1]:8080/
```

## IPv6 URLs with Zone IDs

When a link-local address needs a zone ID in a URL, the `%` separator must be percent-encoded as `%25`:

```bash
# Zone ID in URL (% must be %25)
curl http://[fe80::1%25eth0]:8080/

# Python: properly encode a link-local URL
python3 -c "
addr = 'fe80::1'
zone = 'eth0'
port = 8080
# %25 is the percent-encoded form of %
url = f'http://[{addr}%25{zone}]:{port}/'
print(url)
"
# Output: http://[fe80::1%25eth0]:8080/
```

## Handling IPv6 URLs in Code

```python
# Python: parse and construct IPv6 URLs correctly
from urllib.parse import urlparse, urlunparse

# Parsing an IPv6 URL
url = "http://[2001:db8::1]:8080/api/v1/"
parsed = urlparse(url)

print(f"Scheme: {parsed.scheme}")    # http
print(f"Hostname: {parsed.hostname}") # 2001:db8::1 (brackets stripped)
print(f"Port: {parsed.port}")         # 8080
print(f"Path: {parsed.path}")         # /api/v1/

# Constructing an IPv6 URL
import ipaddress

def make_ipv6_url(scheme, addr, port, path="/"):
    ip = ipaddress.ip_address(addr)
    if ip.version == 6:
        host = f"[{addr}]"
    else:
        host = addr
    return f"{scheme}://{host}:{port}{path}"

print(make_ipv6_url("https", "2001:db8::1", 443, "/health"))
# Output: https://[2001:db8::1]:443/health
```

```javascript
// JavaScript: construct IPv6 URLs
function makeIPv6URL(scheme, addr, port, path = '/') {
    // Check if it's an IPv6 address (contains colons)
    const host = addr.includes(':') ? `[${addr}]` : addr;
    return `${scheme}://${host}:${port}${path}`;
}

console.log(makeIPv6URL('http', '2001:db8::1', 8080, '/api'));
// Output: http://[2001:db8::1]:8080/api

// Using the URL API (handles IPv6 automatically)
const url = new URL('http://[2001:db8::1]:8080/api');
console.log(url.hostname); // [2001:db8::1]
console.log(url.port);     // 8080
```

## Configuring Web Servers to Listen on IPv6

```nginx
# Nginx: listen on IPv6 address
server {
    # IPv6 only
    listen [::1]:80;
    listen [2001:db8::1]:443 ssl;

    # Listen on all IPv6 addresses
    listen [::]:80;
    listen [::]:443 ssl;

    server_name example.com;
}
```

```apache
# Apache: listen on IPv6
Listen [::]:80
Listen [2001:db8::1]:8080

<VirtualHost [::]:80>
    ServerName example.com
    DocumentRoot /var/www/html
</VirtualHost>
```

## Conclusion

Square brackets in IPv6 URLs are mandatory per RFC 3986 and are supported by all modern HTTP clients, libraries, and web servers. When building applications that accept or construct URLs, always bracket IPv6 addresses, percent-encode zone IDs, and test with both `::1` (loopback) and full addresses to ensure correct behavior.
