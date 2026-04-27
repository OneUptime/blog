# How to Parse IPv6 Addresses from URLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, URL, Parsing, RFC 2732, Web Development, Programming

Description: Parse IPv6 addresses from URLs correctly across multiple languages, handling bracket notation, zone IDs, and port numbers per RFC 2732 and RFC 3986.

## Introduction

IPv6 addresses in URLs require bracket notation per RFC 2732 and RFC 3986 to distinguish the colons in IPv6 from the colon separating a host from a port. For example: `http://[2001:db8::1]:8080/path`. Parsing these correctly requires handling brackets, optional ports, and zone IDs.

## URL Format for IPv6

Per RFC 3986, the IPv6 format in URLs is:

```text
scheme://[ipv6address]:port/path?query#fragment

Examples:
http://[2001:db8::1]/
https://[::1]:443/api
http://[fe80::1%25eth0]:8080/  # Zone ID is percent-encoded as %25
ftp://[2001:db8:cafe::1]:21/
```

## Python: Parsing IPv6 URLs

```python
from urllib.parse import urlparse, urlunparse
import ipaddress

def parse_ipv6_url(url: str) -> dict:
    """Parse a URL that may contain an IPv6 address."""
    parsed = urlparse(url)

    host = parsed.hostname  # urlparse handles brackets automatically
    port = parsed.port

    # Classify the host
    is_ipv6 = False
    if host:
        # Strip zone ID (e.g., "fe80::1%25eth0") before IP validation
        host_clean = host.split('%')[0]
        try:
            addr = ipaddress.ip_address(host_clean)
            is_ipv6 = isinstance(addr, ipaddress.IPv6Address)
        except ValueError:
            pass  # It's a hostname, not an IP

    return {
        'scheme': parsed.scheme,
        'host': host,
        'port': port,
        'path': parsed.path,
        'is_ipv6': is_ipv6,
        'original': url,
    }

# Test cases

urls = [
    'http://[2001:db8::1]:8080/api/v1',
    'https://[::1]/admin',
    'http://[fe80::1%25eth0]:8080/',  # Zone ID percent-encoded
    'https://example.com:443/path',
    'http://192.168.1.1:80/',
]

for url in urls:
    result = parse_ipv6_url(url)
    print(f"URL: {url}")
    print(f"  host={result['host']}, port={result['port']}, isIPv6={result['is_ipv6']}\n")
```

## JavaScript: Parsing IPv6 URLs

```javascript
const { URL } = require('url');

function parseIPv6URL(rawURL) {
  try {
    const parsed = new URL(rawURL);

    // WHATWG URL keeps brackets around IPv6 hostnames (e.g. "[::1]")
    const rawHost = parsed.hostname;
    const host = rawHost.startsWith('[') && rawHost.endsWith(']')
      ? rawHost.slice(1, -1)
      : rawHost;
    const port = parsed.port;

    // net.isIPv6 expects the bare address, without brackets
    const isIPv6 = require('net').isIPv6(host);

    return {
      scheme: parsed.protocol.slice(0, -1),
      host,
      port: port ? parseInt(port) : null,
      path: parsed.pathname,
      isIPv6,
      original: rawURL
    };
  } catch (e) {
    return { error: e.message, original: rawURL };
  }
}

const testURLs = [
  'http://[2001:db8::1]:8080/api',
  'https://[::1]:443/',
  'http://[fe80::1%25eth0]:8080/',
  'https://example.com/path',
];

testURLs.forEach(url => {
  const result = parseIPv6URL(url);
  console.log(`${url}`);
  console.log(`  host=${result.host}, port=${result.port}, isIPv6=${result.isIPv6}\n`);
});
```

## Go: Parsing IPv6 URLs

```go
package main

import (
    "fmt"
    "net"
    "net/url"
)

func parseIPv6URL(rawURL string) {
    u, err := url.Parse(rawURL)
    if err != nil {
        fmt.Printf("Error parsing %s: %v\n", rawURL, err)
        return
    }

    // url.Parse handles brackets; u.Host contains the full host:port
    // Use net.SplitHostPort to extract host and port
    host, port, err := net.SplitHostPort(u.Host)
    if err != nil {
        // No port - host is just the hostname
        host = u.Host
        // Remove brackets if present
        if len(host) > 2 && host[0] == '[' && host[len(host)-1] == ']' {
            host = host[1 : len(host)-1]
        }
        port = ""
    }

    isIPv6 := net.ParseIP(host) != nil && net.ParseIP(host).To4() == nil

    fmt.Printf("URL: %s\n  host=%s port=%s isIPv6=%v\n\n",
        rawURL, host, port, isIPv6)
}

func main() {
    urls := []string{
        "http://[2001:db8::1]:8080/api",
        "https://[::1]/admin",
        "https://example.com:443/path",
    }
    for _, u := range urls {
        parseIPv6URL(u)
    }
}
```

## Building IPv6 URLs Correctly

```python
import ipaddress
from urllib.parse import urlunparse

def build_url(scheme: str, addr: str, port: int = None, path: str = '/') -> str:
    """Build a URL correctly handling IPv6 addresses."""
    try:
        ip = ipaddress.ip_address(addr)
        if isinstance(ip, ipaddress.IPv6Address):
            host = f'[{ip}]'
        else:
            host = str(ip)
    except ValueError:
        host = addr  # It's a hostname

    if port:
        netloc = f'{host}:{port}'
    else:
        netloc = host

    return urlunparse((scheme, netloc, path, '', '', ''))

print(build_url('https', '2001:db8::1', 443, '/api/v1'))
# https://[2001:db8::1]:443/api/v1

print(build_url('http', '192.168.1.1', 8080, '/'))
# http://192.168.1.1:8080/
```

## Common Mistakes

```text
# WRONG: IPv6 without brackets causes parsing ambiguity
http://2001:db8::1:8080/  # Ambiguous - is 8080 part of the address?

# WRONG: Double brackets
http://[[2001:db8::1]]:8080/

# CORRECT: Single brackets
http://[2001:db8::1]:8080/

# CORRECT: Zone ID must be percent-encoded in URLs
http://[fe80::1%25eth0]/  # %25 is percent-encoded %
```

## Conclusion

Parsing IPv6 from URLs requires handling RFC 3986 bracket notation. Use standard URL parsing libraries (`urllib.parse` in Python, `url.URL` in Node.js, `net/url` in Go) which handle brackets correctly. When building URLs containing IPv6 addresses, always wrap the address in brackets and use `net.JoinHostPort()` or equivalent in your language.
