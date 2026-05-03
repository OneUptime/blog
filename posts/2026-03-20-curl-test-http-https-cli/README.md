# How to Use curl to Test HTTP/HTTPS Connectivity from the Command Line

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: curl, HTTP, HTTPS, CLI, Debugging, Networking, DevOps

Description: A practical guide to using curl for testing HTTP and HTTPS endpoints, including status codes, headers, response times, and TLS verification.

## Why curl for HTTP Testing?

`curl` is the Swiss Army knife of HTTP debugging. It ships on virtually every Unix-like system, requires no dependencies, and gives you precise control over every aspect of an HTTP request. Whether you're checking connectivity, inspecting headers, or timing requests, curl has a flag for it.

## Basic Connectivity Check

```bash
# Fetch a URL and print response body to stdout

curl https://example.com

# Fetch headers only (-I = HEAD request)
curl -I https://example.com

# Verbose output showing full request and response headers
curl -v https://example.com
```

## Checking HTTP Status Codes

```bash
# Print only the HTTP status code using a format string
curl -o /dev/null -s -w "%{http_code}\n" https://example.com

# Follow redirects and show the final status code
curl -L -o /dev/null -s -w "%{http_code}\n" https://example.com
```

`-o /dev/null` discards the body, `-s` suppresses progress output, and `-w` formats the output.

## Measuring Response Times

The `-w` flag with timing variables is invaluable for performance investigations:

```bash
# Measure detailed timing breakdown for a request
curl -o /dev/null -s -w \
  "DNS lookup:      %{time_namelookup}s\n\
TCP connect:     %{time_connect}s\n\
TLS handshake:   %{time_appconnect}s\n\
TTFB:            %{time_starttransfer}s\n\
Total:           %{time_total}s\n" \
  https://example.com
```

## Sending Custom Headers

```bash
# Add a custom Authorization header
curl -H "Authorization: Bearer mytoken123" https://api.example.com/data

# Simulate a specific User-Agent
curl -H "User-Agent: MyMonitor/1.0" https://example.com
```

## POST Requests with JSON Body

```bash
# Send a JSON payload via POST
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret"}' \
  https://api.example.com/login
```

## Testing TLS Certificates

```bash
# Skip certificate verification (useful for self-signed certs in dev)
curl -k https://dev.example.internal

# Use a specific CA bundle
curl --cacert /path/to/ca-bundle.crt https://example.com

# Show certificate details without downloading content
curl -v --head https://example.com 2>&1 | grep -A5 "Server certificate"
```

## Testing with Specific DNS or IP

```bash
# Override DNS and connect to a specific IP (useful for testing before DNS propagation)
curl --resolve example.com:443:93.184.216.34 https://example.com

# Connect to a specific IP but send correct Host header
curl -H "Host: example.com" https://93.184.216.34
```

## Checking HTTP/2 Support

```bash
# Force HTTP/2 and show protocol version
curl -I --http2 https://example.com
```

## Saving Response to a File

```bash
# Save response body to a file, show progress
curl -o output.html https://example.com

# Download with output filename derived from URL
curl -O https://example.com/file.tar.gz
```

## Conclusion

`curl` is an indispensable tool for diagnosing HTTP and HTTPS issues directly from the command line. Mastering its `-v`, `-w`, `-H`, and `--resolve` flags lets you quickly pinpoint connectivity problems, TLS misconfigurations, and performance bottlenecks without needing a GUI tool.
