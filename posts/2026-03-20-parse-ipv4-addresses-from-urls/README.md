# How to Parse IPv4 Addresses from URLs in Various Languages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, URL Parsing, Python, JavaScript, Go, Java, Networking

Description: Extract IPv4 addresses from URLs in Python, JavaScript, Go, and Java using standard URL parsing libraries and regex, handling edge cases like ports and paths.

## Introduction

URLs may contain an IPv4 host instead of a domain name (e.g., `http://192.168.1.1:8080/api`). Parsing these correctly requires URL-aware libraries rather than ad-hoc string splitting, especially when ports and paths are involved.

## Python

```python
from urllib.parse import urlparse
import re

def extract_ipv4_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    host = parsed.hostname  # strips brackets, removes port
    ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    return host if re.match(ipv4_pattern, host or '') else None

urls = [
    "http://192.168.1.1:8080/api/v1",
    "https://10.0.0.1/login",
    "ftp://example.com/file",
    "http://[::1]/ipv6-host",
]
for u in urls:
    ip = extract_ipv4_from_url(u)
    print(f"{u!r} -> {ip}")
```

## JavaScript

```javascript
function extractIPv4FromUrl(url) {
    try {
        const { hostname } = new URL(url);
        const ipv4Re = /^(\d{1,3}\.){3}\d{1,3}$/;
        return ipv4Re.test(hostname) ? hostname : null;
    } catch {
        return null;
    }
}

const urls = [
    "http://192.168.1.1:8080/api/v1",
    "https://10.0.0.1/login",
    "ftp://example.com/file",
];
urls.forEach(u => console.log(u, '->', extractIPv4FromUrl(u)));
```

## Go

```go
package main

import (
    "fmt"
    "net"
    "net/url"
)

func extractIPv4(rawURL string) string {
    u, err := url.Parse(rawURL)
    if err != nil {
        return ""
    }
    host, _, err := net.SplitHostPort(u.Host)
    if err != nil {
        host = u.Host
    }
    ip := net.ParseIP(host)
    if ip == nil || ip.To4() == nil {
        return ""
    }
    return ip.String()
}

func main() {
    tests := []string{
        "http://192.168.1.1:8080/api",
        "https://10.0.0.1/",
        "http://example.com/",
    }
    for _, t := range tests {
        fmt.Printf("%s -> %q\n", t, extractIPv4(t))
    }
}
```

## Java

```java
import java.net.*;
import java.util.regex.Pattern;

public class IPv4FromUrl {
    private static final Pattern IPV4 = Pattern.compile(
        "^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$"
    );

    public static String extractIPv4(String rawUrl) {
        try {
            URI uri = new URI(rawUrl);
            String host = uri.getHost();
            if (host == null) return null;
            return IPV4.matcher(host).matches() ? host : null;
        } catch (Exception e) {
            return null;
        }
    }

    public static void main(String[] args) {
        String[] urls = {
            "http://192.168.1.1:8080/api",
            "https://10.0.0.1/",
            "http://example.com/"
        };
        for (String u : urls)
            System.out.println(u + " -> " + extractIPv4(u));
    }
}
```

## Regex Validation

```python
import re

IPV4_RE = re.compile(
    r'^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}'
    r'(25[0-5]|2[0-4]\d|[01]?\d\d?)$'
)

def is_valid_ipv4(host: str) -> bool:
    return bool(IPV4_RE.match(host))
```

## Conclusion

Use the URL parsing library native to your language to extract the hostname, then validate it as an IPv4 address. Avoid splitting on `:` or `/` manually - URL parsing libraries correctly handle edge cases like ports, IPv6 addresses in brackets, and encoded characters.
