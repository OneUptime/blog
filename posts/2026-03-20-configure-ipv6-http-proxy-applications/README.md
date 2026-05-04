# How to Configure IPv6 HTTP Proxy in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HTTP Proxy, Networking, Python, Node.js, Configuration

Description: Learn how to configure HTTP proxy settings in your applications to route traffic over IPv6, covering environment variables, language-specific libraries, and common pitfalls.

---

Configuring an HTTP proxy for IPv6 traffic requires understanding how IPv6 addresses are represented in URLs and how different runtimes interpret proxy settings. IPv6 addresses in URLs must be enclosed in square brackets to distinguish the address from the port number.

## Understanding IPv6 Address Format in URLs

Before configuring a proxy, understand the correct URL format for IPv6:

```text
# Incorrect (ambiguous)

http://2001:db8::1:8080

# Correct (brackets wrap the address)
http://[2001:db8::1]:8080
```

## Setting Proxy Environment Variables

Most applications and HTTP clients respect standard proxy environment variables. For IPv6 proxies, use bracket notation:

```bash
# Set HTTP proxy to an IPv6 address
export HTTP_PROXY="http://[2001:db8::1]:3128"
export HTTPS_PROXY="http://[2001:db8::1]:3128"
export NO_PROXY="::1,localhost,127.0.0.1"

# Verify the variables are set
env | grep -i proxy
```

## Configuring Proxy in Python (requests)

The `requests` library respects environment variables automatically, but you can also configure it explicitly:

```python
import requests

# Define proxy with IPv6 address (brackets required)
proxies = {
    "http": "http://[2001:db8::1]:3128",
    "https": "http://[2001:db8::1]:3128",
}

# Make a request through the IPv6 proxy
response = requests.get("https://example.com", proxies=proxies, timeout=10)
print(f"Status: {response.status_code}")
print(f"Response via proxy: {response.text[:200]}")
```

## Configuring Proxy in Node.js

Node.js's built-in `http` and `https` modules require a proxy agent library for proxy support:

```javascript
const { HttpsProxyAgent } = require("https-proxy-agent");
const fetch = require("node-fetch");

// IPv6 proxy URL with bracket notation
const proxyUrl = "http://[2001:db8::1]:3128";
const agent = new HttpsProxyAgent(proxyUrl);

// Fetch through the IPv6 proxy
async function fetchViaProxy() {
  const response = await fetch("https://example.com", { agent });
  const body = await response.text();
  console.log(`Status: ${response.status}`);
}

fetchViaProxy().catch(console.error);
```

## Configuring Proxy in curl

curl handles IPv6 proxy addresses with bracket notation in the `--proxy` flag:

```bash
# Use an IPv6 proxy with curl
curl --proxy "http://[2001:db8::1]:3128" https://example.com

# Force CONNECT tunneling through the HTTP proxy (useful for non-HTTPS protocols)
curl --proxytunnel --proxy "http://[2001:db8::1]:3128" https://example.com

# Bypass proxy for specific addresses
curl --proxy "http://[2001:db8::1]:3128" \
     --noproxy "::1,localhost" \
     https://example.com
```

## Configuring Proxy in Java (JVM)

Java uses system properties for proxy configuration. IPv6 addresses must use brackets:

```java
// Set Java system properties for IPv6 proxy
System.setProperty("http.proxyHost", "2001:db8::1");  // No brackets for host
System.setProperty("http.proxyPort", "3128");
System.setProperty("https.proxyHost", "2001:db8::1");
System.setProperty("https.proxyPort", "3128");

// Alternatively, pass as JVM arguments at startup:
// -Dhttp.proxyHost=2001:db8::1 -Dhttp.proxyPort=3128
```

## Proxy Configuration File (proxychains)

For system-level proxying of any application over IPv6:

```ini
# /etc/proxychains4.conf
strict_chain
proxy_dns

[ProxyList]
# IPv6 SOCKS5 proxy - brackets not needed in this config format
socks5  2001:db8::1  1080
```

## Verifying IPv6 Proxy Connectivity

After configuration, verify traffic is routing through the IPv6 proxy:

```bash
# Check your egress IP through the proxy
curl --proxy "http://[2001:db8::1]:3128" https://ifconfig.me/ip

# Test proxy connectivity directly
curl --max-time 5 http://[2001:db8::1]:3128 -v 2>&1 | head -20
```

## Common Issues

- **Connection refused**: Verify the proxy server is listening on its IPv6 interface, not just IPv4.
- **Bracket syntax errors**: Always wrap IPv6 addresses in `[` `]` in URLs.
- **NO_PROXY not working**: Use `::1` and full addresses; CIDR notation may not be supported by all clients.
- **TLS errors**: Ensure the proxy certificate covers both IPv4 and IPv6 SANs if using HTTPS proxy.

Properly configured IPv6 proxies enable your applications to route traffic through dual-stack or IPv6-only proxy infrastructure while maintaining compatibility across all major HTTP clients.
