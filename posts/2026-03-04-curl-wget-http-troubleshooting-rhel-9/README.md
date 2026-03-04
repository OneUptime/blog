# How to Use curl and wget for HTTP Troubleshooting on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, curl, wget, HTTP, Troubleshooting, Linux

Description: A practical guide to using curl and wget on RHEL 9 for troubleshooting HTTP and HTTPS services, including connection debugging, TLS inspection, header analysis, and performance measurement.

---

When a web service isn't behaving, curl and wget are the tools that let you poke at it from the command line. curl is the more versatile of the two for debugging - it shows you headers, timing, TLS details, and can make any kind of HTTP request. wget is simpler but great for downloading files and testing basic connectivity.

## curl: The HTTP Swiss Army Knife

### Basic Requests

```bash
# Simple GET request
curl https://example.com

# Show response headers along with the body
curl -i https://example.com

# Show ONLY the response headers
curl -I https://example.com

# Verbose output (shows the full request/response exchange)
curl -v https://example.com

# Silent mode (suppress progress bar)
curl -s https://example.com

# Follow redirects
curl -L https://example.com
```

### Debugging Connection Issues

```bash
# Verbose mode shows connection details, TLS handshake, headers
curl -v https://example.com 2>&1 | head -30

# Show only timing information
curl -o /dev/null -s -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nFirstByte: %{time_starttransfer}s\nTotal: %{time_total}s\n" https://example.com
```

This timing output is incredibly useful. It breaks down where the time is spent:
- **time_namelookup** - DNS resolution
- **time_connect** - TCP connection established
- **time_appconnect** - TLS handshake completed
- **time_starttransfer** - First byte received
- **time_total** - Request completed

### Testing Specific HTTP Methods

```bash
# POST request with data
curl -X POST -d '{"key":"value"}' -H "Content-Type: application/json" https://api.example.com/endpoint

# PUT request
curl -X PUT -d '{"key":"updated"}' -H "Content-Type: application/json" https://api.example.com/endpoint

# DELETE request
curl -X DELETE https://api.example.com/endpoint/123
```

### TLS/SSL Debugging

```bash
# Show TLS certificate information
curl -vI https://example.com 2>&1 | grep -A 10 "Server certificate"

# Check certificate expiration
curl -vI https://example.com 2>&1 | grep "expire date"

# Connect with a specific TLS version
curl --tlsv1.2 https://example.com
curl --tlsv1.3 https://example.com

# Skip certificate verification (testing only)
curl -k https://self-signed.example.com

# Use a specific CA certificate
curl --cacert /path/to/ca.crt https://internal.example.com
```

### Testing with Custom Headers

```bash
# Set a custom Host header (testing virtual hosts)
curl -H "Host: site.example.com" http://192.168.1.100

# Add authentication headers
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com

# Set User-Agent
curl -A "Mozilla/5.0" https://example.com
```

### Forcing IPv4 or IPv6

```bash
# Force IPv4
curl -4 https://example.com

# Force IPv6
curl -6 https://example.com
```

### Saving and Resuming Downloads

```bash
# Save to a file
curl -o output.html https://example.com

# Resume a broken download
curl -C - -o large-file.iso https://example.com/large-file.iso
```

## wget: The Reliable Downloader

### Basic Usage

```bash
# Download a file
wget https://example.com/file.tar.gz

# Download and save with a different name
wget -O myfile.tar.gz https://example.com/file.tar.gz

# Download to a specific directory
wget -P /tmp/ https://example.com/file.tar.gz

# Quiet mode
wget -q https://example.com/file.tar.gz
```

### Testing Connectivity

```bash
# Check if a URL is reachable (spider mode, don't download)
wget --spider https://example.com

# Show server response headers
wget -S https://example.com -O /dev/null
```

### Handling Redirects and Authentication

```bash
# Follow redirects (wget does this by default)
wget https://example.com/redirect

# HTTP Basic Authentication
wget --user=admin --password=secret https://example.com/protected

# Download with cookies
wget --load-cookies cookies.txt https://example.com/protected-page
```

### Recursive Downloads

```bash
# Mirror a website
wget -m -p -E -k https://example.com

# Download a directory listing
wget -r -np https://example.com/pub/

# Limit download depth
wget -r -l 2 https://example.com
```

## Troubleshooting Scenarios

**Service returns 502 Bad Gateway:**

```bash
# Check what the server actually returns
curl -v https://example.com 2>&1

# Check if the backend is reachable from the server
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
```

**Slow page loads:**

```bash
# Break down where time is spent
curl -o /dev/null -s -w "DNS: %{time_namelookup}s\nTCP: %{time_connect}s\nTLS: %{time_appconnect}s\nFirst byte: %{time_starttransfer}s\nTotal: %{time_total}s\nSpeed: %{speed_download} bytes/sec\n" https://slow-site.example.com
```

**Certificate problems:**

```bash
# Get full certificate chain details
curl -vI https://example.com 2>&1 | grep -E "(SSL|certificate|issuer|subject|expire)"

# Check certificate from a specific server
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

**Testing load balancer behavior:**

```bash
# Make multiple requests and check which backend responds
for i in $(seq 1 10); do
    curl -s -H "Host: app.example.com" http://load-balancer/ | grep "Server-ID"
done
```

**Checking HTTP/2 support:**

```bash
# Test HTTP/2
curl -v --http2 https://example.com 2>&1 | grep "< HTTP/"
```

## Quick Reference

| Task | curl | wget |
|------|------|------|
| Download file | `curl -O url` | `wget url` |
| Show headers | `curl -I url` | `wget -S url` |
| Follow redirects | `curl -L url` | `wget url` (default) |
| Check status | `curl -o /dev/null -s -w "%{http_code}" url` | `wget --spider url` |
| Verbose | `curl -v url` | `wget -d url` |
| Save as | `curl -o name url` | `wget -O name url` |

## Wrapping Up

curl and wget are complementary tools on RHEL 9. For HTTP troubleshooting, curl is the more powerful option with its timing output, TLS debugging, and flexible request methods. wget excels at downloading files and mirroring sites. Learn curl's `-w` format strings for timing analysis and `-v` for connection debugging. These two tools will cover most of your HTTP troubleshooting needs without ever opening a browser.
