# How to Use curl and wget for HTTP Endpoint Testing in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, HTTP

Description: Master curl and wget commands for testing HTTP endpoints, debugging API connectivity, and troubleshooting web services in Kubernetes clusters.

---

HTTP connectivity testing is essential for debugging web applications and APIs in Kubernetes. While ping and traceroute test network layer connectivity, curl and wget test the complete HTTP stack including DNS resolution, TCP connections, TLS handshakes, HTTP protocol negotiation, and application responses. They reveal issues that lower-level tools cannot detect.

curl and wget are the go-to tools for HTTP debugging because they provide detailed output, support extensive options, and work consistently across environments. Mastering these tools makes you effective at diagnosing web service issues.

## Basic curl vs wget

Both tools fetch HTTP resources but have different strengths:

```bash
# curl: More features, better for APIs
kubectl exec -it my-pod -- curl http://my-service:8080/

# wget: Simpler, better for downloads
kubectl exec -it my-pod -- wget -O- http://my-service:8080/

# curl shows output by default
# wget requires -O- to print to stdout instead of saving
```

Use curl for interactive testing and API debugging. Use wget for scripting and file downloads.

## Testing Service Connectivity

Verify services respond correctly:

```bash
# Test service by name
kubectl exec -it my-pod -- curl http://my-service:8080/

# Test with fully qualified domain name
kubectl exec -it my-pod -- curl http://my-service.my-namespace.svc.cluster.local:8080/

# Test service ClusterIP directly
kubectl exec -it my-pod -- curl http://10.96.1.5:8080/

# All three should return the same response
```

This confirms service discovery and routing work correctly.

## Getting Detailed HTTP Information

Use verbose mode to see full HTTP exchange:

```bash
# curl verbose mode
kubectl exec -it my-pod -- curl -v http://my-service:8080/

# Output shows:
# - DNS resolution
# - TCP connection
# - HTTP request headers
# - HTTP response headers
# - Response body

# Even more detail with trace
kubectl exec -it my-pod -- curl -v --trace-ascii /dev/stdout http://my-service:8080/
```

Verbose output reveals where HTTP requests fail.

## Testing Specific HTTP Methods

Test different HTTP verbs:

```bash
# GET request (default)
kubectl exec -it my-pod -- curl http://my-service:8080/users

# POST request
kubectl exec -it my-pod -- curl -X POST http://my-service:8080/users \
  -H "Content-Type: application/json" \
  -d '{"name":"test","email":"test@example.com"}'

# PUT request
kubectl exec -it my-pod -- curl -X PUT http://my-service:8080/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"updated"}'

# DELETE request
kubectl exec -it my-pod -- curl -X DELETE http://my-service:8080/users/1

# HEAD request (headers only)
kubectl exec -it my-pod -- curl -I http://my-service:8080/
```

Different methods test different API functionality.

## Adding Custom Headers

Include authentication and custom headers:

```bash
# Add authorization header
kubectl exec -it my-pod -- curl http://my-service:8080/api/protected \
  -H "Authorization: Bearer TOKEN123"

# Add multiple headers
kubectl exec -it my-pod -- curl http://my-service:8080/ \
  -H "X-Custom-Header: value" \
  -H "User-Agent: MyApp/1.0"

# Read headers from file
kubectl exec -it my-pod -- curl http://my-service:8080/ \
  -H @headers.txt
```

Headers are essential for testing authenticated APIs.

## Testing with Timeouts

Set timeouts to detect slow responses:

```bash
# Connection timeout (default is long)
kubectl exec -it my-pod -- curl --connect-timeout 5 http://my-service:8080/

# Maximum time for entire operation
kubectl exec -it my-pod -- curl --max-time 10 http://my-service:8080/

# Combination
kubectl exec -it my-pod -- curl --connect-timeout 3 --max-time 10 http://my-service:8080/

# wget timeout
kubectl exec -it my-pod -- wget --timeout=5 -O- http://my-service:8080/
```

Timeouts prevent commands from hanging indefinitely.

## Checking HTTP Status Codes

Extract just the status code:

```bash
# curl: Write only HTTP status code
kubectl exec -it my-pod -- curl -o /dev/null -s -w "%{http_code}\n" http://my-service:8080/

# Output: 200 (or other status code)

# Check if status is 200
if kubectl exec my-pod -- curl -o /dev/null -s -w "%{http_code}" http://my-service:8080/ | grep -q "200"; then
  echo "Service is healthy"
else
  echo "Service returned error"
fi

# wget: Check exit code
kubectl exec my-pod -- wget --spider -q http://my-service:8080/
echo $?  # 0 = success, non-zero = failure
```

Status codes quickly identify HTTP-level problems.

## Testing TLS/HTTPS Connections

Debug HTTPS endpoint issues:

```bash
# Basic HTTPS request
kubectl exec -it my-pod -- curl https://my-service:8443/

# Verbose to see TLS handshake
kubectl exec -it my-pod -- curl -v https://my-service:8443/

# Shows:
# - TLS version negotiation
# - Certificate verification
# - Cipher selection

# Skip certificate verification (testing only!)
kubectl exec -it my-pod -- curl -k https://my-service:8443/

# If -k works but normal curl fails, certificate issue exists
```

HTTPS debugging reveals TLS configuration problems.

## Checking SSL Certificates

Inspect certificate details:

```bash
# View certificate information
kubectl exec -it my-pod -- curl -v https://api.example.com 2>&1 | grep -i "certificate"

# Use openssl for detailed cert info
kubectl exec -it my-pod -- sh -c \
  "echo | openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -text"

# Check certificate expiration
kubectl exec -it my-pod -- sh -c \
  "echo | openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates"
```

Certificate issues prevent HTTPS connections.

## Following Redirects

Handle HTTP redirects properly:

```bash
# Follow redirects automatically
kubectl exec -it my-pod -- curl -L http://my-service:8080/

# Without -L, stops at first redirect
# With -L, follows to final destination

# Limit redirect hops
kubectl exec -it my-pod -- curl -L --max-redirs 5 http://my-service:8080/

# wget follows redirects by default
kubectl exec -it my-pod -- wget -O- http://my-service:8080/
```

Missing redirect handling causes incomplete tests.

## Measuring Request Timing

Analyze request performance:

```bash
# curl timing variables
kubectl exec -it my-pod -- curl -o /dev/null -s -w "\
time_namelookup: %{time_namelookup}\n\
time_connect: %{time_connect}\n\
time_appconnect: %{time_appconnect}\n\
time_pretransfer: %{time_pretransfer}\n\
time_redirect: %{time_redirect}\n\
time_starttransfer: %{time_starttransfer}\n\
time_total: %{time_total}\n" \
http://my-service:8080/

# Shows breakdown:
# - DNS lookup time
# - TCP connect time
# - TLS handshake time (if HTTPS)
# - Time to first byte
# - Total time
```

Timing breakdown identifies performance bottlenecks.

## Testing with POST Data

Send data to APIs:

```bash
# JSON data inline
kubectl exec -it my-pod -- curl -X POST http://my-service:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"secret"}'

# JSON from file
kubectl exec -it my-pod -- curl -X POST http://my-service:8080/api/users \
  -H "Content-Type: application/json" \
  -d @data.json

# Form data
kubectl exec -it my-pod -- curl -X POST http://my-service:8080/submit \
  -d "field1=value1&field2=value2"

# File upload
kubectl exec -it my-pod -- curl -X POST http://my-service:8080/upload \
  -F "file=@document.pdf"
```

POST testing verifies API write operations.

## Saving Response Headers

Capture headers for analysis:

```bash
# Save headers to file
kubectl exec -it my-pod -- curl -D headers.txt http://my-service:8080/

# View saved headers
kubectl exec -it my-pod -- cat headers.txt

# Extract specific header
kubectl exec -it my-pod -- curl -s -D - http://my-service:8080/ | grep "Content-Type"

# wget saves headers with -S
kubectl exec -it my-pod -- wget -S -O response.html http://my-service:8080/
```

Headers contain debugging information like caching, compression, and cookies.

## Testing Load Balancing

Verify requests distribute across backends:

```bash
# Make multiple requests
for i in {1..10}; do
  kubectl exec my-pod -- curl -s http://my-service:8080/ | grep -i "hostname"
done

# Should see different backend pod hostnames
# Even distribution indicates proper load balancing

# Track distribution
for i in {1..100}; do
  kubectl exec my-pod -- curl -s http://my-service:8080/hostname
done | sort | uniq -c
```

Uneven distribution indicates load balancing issues.

## Testing External Endpoints

Verify pods can reach external APIs:

```bash
# Test external HTTPS endpoint
kubectl exec -it my-pod -- curl -v https://api.github.com

# Test with specific DNS
kubectl exec -it my-pod -- curl --dns-servers 8.8.8.8 https://api.example.com

# Test through proxy if required
kubectl exec -it my-pod -- curl -x http://proxy:8080 https://api.example.com

# wget through proxy
kubectl exec -it my-pod -- wget -e use_proxy=yes -e http_proxy=proxy:8080 https://api.example.com
```

External endpoint tests verify egress configuration.

## Debugging with Proxies

Route requests through proxies:

```bash
# Use HTTP proxy
kubectl exec -it my-pod -- curl -x http://proxy:8080 http://my-service:8080/

# Use SOCKS proxy
kubectl exec -it my-pod -- curl --socks5 proxy:1080 http://my-service:8080/

# Show proxy negotiation
kubectl exec -it my-pod -- curl -v -x http://proxy:8080 http://my-service:8080/

# wget with proxy
kubectl exec -it my-pod -- wget -e use_proxy=yes -e http_proxy=proxy:8080 \
  -O- http://my-service:8080/
```

Proxy routing helps test network paths.

## Continuous Monitoring Loop

Create monitoring script:

```bash
#!/bin/bash
# monitor-endpoint.sh

ENDPOINT=$1
INTERVAL=${2:-5}

while true; do
  RESPONSE=$(kubectl exec my-pod -- curl -o /dev/null -s -w "%{http_code},%{time_total}" $ENDPOINT)
  STATUS=$(echo $RESPONSE | cut -d, -f1)
  TIME=$(echo $RESPONSE | cut -d, -f2)

  if [ "$STATUS" != "200" ]; then
    echo "$(date) - ERROR: HTTP $STATUS (${TIME}s)"
  else
    echo "$(date) - OK: HTTP $STATUS (${TIME}s)"
  fi

  sleep $INTERVAL
done

# Run: ./monitor-endpoint.sh http://my-service:8080/health 10
```

Continuous monitoring detects intermittent issues.

## Testing Health Endpoints

Check application health endpoints:

```bash
# Liveness check
kubectl exec -it my-pod -- curl http://my-service:8080/healthz

# Readiness check
kubectl exec -it my-pod -- curl http://my-service:8080/ready

# Detailed health
kubectl exec -it my-pod -- curl http://my-service:8080/health | jq .

# Check specific health indicators
kubectl exec -it my-pod -- curl http://my-service:8080/health | \
  jq '.checks[] | select(.status != "UP")'
```

Health endpoints reveal application issues.

## Comparing curl and wget Features

Choose the right tool:

```bash
# curl advantages:
# - Better output formatting
# - More protocol support
# - Easier header manipulation
# - Better for APIs
kubectl exec my-pod -- curl -H "Accept: application/json" http://api:8080/

# wget advantages:
# - Recursive downloads
# - Resume partial downloads
# - Better for file downloads
kubectl exec my-pod -- wget -r -np -nd http://files:8080/documents/

# Use curl for testing, wget for downloading
```

Both tools complement each other.

## Best Practices

When using curl and wget in Kubernetes, follow these practices.

First, always use timeouts to prevent hanging commands that waste time during troubleshooting.

Second, save verbose output to files for sharing with teammates or reviewing later when debugging complex issues.

Third, use status code extraction in scripts to make automated testing reliable and parseable.

Fourth, test from multiple pods to verify issues are not pod-specific before investigating network infrastructure.

Fifth, combine with other tools like nslookup for DNS debugging and tcpdump for packet analysis to build a complete picture.

## Conclusion

curl and wget are essential HTTP testing tools in Kubernetes. They test complete HTTP stacks including DNS, TCP connections, TLS, and application-layer protocols. curl excels at API testing with its extensive options for headers, methods, and output formatting. wget works better for file downloads and recursive fetching.

Master verbose mode to see complete request and response details. Use timing options to measure performance. Test different HTTP methods, status codes, headers, and TLS configurations. Create monitoring loops for continuous endpoint verification.

Understanding how to use curl and wget effectively makes you efficient at debugging HTTP connectivity, testing APIs, verifying service behavior, and troubleshooting web applications in Kubernetes. These tools are always available in standard container images or easily added, making them reliable debugging companions.
