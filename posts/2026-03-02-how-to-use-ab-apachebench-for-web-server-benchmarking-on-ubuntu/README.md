# How to Use ab (ApacheBench) for Web Server Benchmarking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Web Server, Performance, Apache, Benchmarking

Description: A practical guide to using ApacheBench (ab) on Ubuntu to benchmark web servers, interpret results, and identify performance bottlenecks before they affect production.

---

ApacheBench (ab) is a single-file command-line tool for HTTP server benchmarking. Despite being a simple utility, it's effective for quick performance checks: how many requests per second can your server handle? How does latency change under load? Can you reproduce a performance regression from a code change?

ab is not a sophisticated load testing framework - it doesn't simulate realistic user behavior or handle complex authentication flows - but for a fast sanity check on server throughput and latency, it's hard to beat.

## Installation

```bash
# Install apache2-utils (includes ab)
sudo apt install apache2-utils

# Verify
ab -V
```

## Basic Usage

```
ab [options] URL
```

The URL must always end with a path (at minimum `/`).

```bash
# Basic test: 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost/

# Test against HTTPS
ab -n 100 -c 10 https://example.com/

# Test a specific path
ab -n 500 -c 25 http://localhost/api/health
```

## Key Options

| Option | Description |
|--------|-------------|
| `-n NUM` | Total number of requests |
| `-c NUM` | Number of concurrent requests |
| `-t SEC` | Timed testing (seconds) instead of request count |
| `-k` | Enable HTTP KeepAlive |
| `-H "Header: Value"` | Add extra HTTP header |
| `-C "name=value"` | Add cookie |
| `-p FILE` | File with POST data |
| `-T CONTENT_TYPE` | Content type for POST data |
| `-A user:pass` | HTTP Basic authentication |
| `-r` | Don't exit on socket receive errors |
| `-s SEC` | Timeout for each request (default 30s) |
| `-g FILE` | Write timing data to gnuplot file |
| `-e FILE` | Write percentile data to CSV file |
| `-v NUM` | Verbosity level (1-4) |

## Reading and Interpreting Results

```bash
ab -n 1000 -c 50 -k http://localhost/
```

Sample output:

```
Server Software:        nginx/1.24.0
Server Hostname:        localhost
Server Port:            80

Document Path:          /
Document Length:        615 bytes

Concurrency Level:      50
Time taken for tests:   2.847 seconds
Complete requests:      1000
Failed requests:        0
Keep-Alive requests:    1000
Total transferred:      895000 bytes
HTML transferred:       615000 bytes
Requests per second:    351.23 [#/sec] (mean)
Time per request:       142.352 [ms] (mean)
Time per request:       2.847 [ms] (mean, across all concurrent requests)
Transfer rate:          306.98 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.6      0       5
Processing:    18  139  45.2    131     412
Waiting:       18  139  45.2    131     411
Total:         18  139  45.2    131     412

Percentage of the requests served within a certain time (ms)
  50%    131
  66%    144
  75%    152
  80%    158
  90%    196
  95%    228
  98%    302
  99%    358
 100%    412 (longest request)
```

### What Each Metric Means

**Requests per second** - The most commonly cited number. This is the throughput: how many complete HTTP request/response cycles the server handled per second during the test. Higher is better.

**Time per request (mean)** - Average time each request took from the client's perspective. Calculated as `(Concurrency * Time_taken) / Total_requests`.

**Time per request (mean, across all concurrent requests)** - Same as above divided by concurrency. This is the actual throughput measurement.

**Failed requests** - Any non-2xx/3xx responses, connection errors, or timeouts. A non-zero number here usually indicates the server is struggling.

**Connection Times** - Breakdown of where time is spent:
- `Connect` - TCP connection establishment
- `Processing` - Time from connected to first byte received
- `Waiting` - Same as Processing (time to first byte)
- `Total` - Full request lifecycle

**Percentile distribution** - The most important section for latency analysis. The 99th percentile shows worst-case latency your users actually experience. A server with great median latency but a bad p99 is still a problem in production.

## Practical Benchmarking Scenarios

### Testing with KeepAlive

HTTP KeepAlive reuses TCP connections across multiple requests, significantly improving throughput. Most modern applications use it.

```bash
# Without KeepAlive
ab -n 1000 -c 10 http://localhost/

# With KeepAlive (add -k flag)
ab -n 1000 -c 10 -k http://localhost/
```

The difference in RPS between these two reveals the overhead of connection setup on your server.

### POST Request Testing

```bash
# Create a JSON payload file
cat > /tmp/payload.json << 'EOF'
{"username": "testuser", "action": "login"}
EOF

# POST test
ab -n 500 -c 20 \
   -p /tmp/payload.json \
   -T 'application/json' \
   http://localhost/api/login
```

### Testing with Authentication

```bash
# HTTP Basic auth
ab -n 100 -c 5 -A username:password http://localhost/protected/

# With cookie
ab -n 100 -c 5 -C "session=abc123" http://localhost/dashboard/

# With custom headers (e.g., Bearer token)
ab -n 100 -c 5 -H "Authorization: Bearer your_token_here" http://localhost/api/
```

### Timed Tests Instead of Request Count

```bash
# Run for 60 seconds at 50 concurrent connections
ab -t 60 -c 50 -k http://localhost/

# Useful for warming up and then measuring steady-state performance
```

## Exporting Data for Analysis

```bash
# Export percentile data to CSV
ab -n 1000 -c 50 -e /tmp/percentiles.csv http://localhost/

# The CSV has columns: percentage served within X ms, time (ms)
cat /tmp/percentiles.csv

# Export timing data for gnuplot
ab -n 1000 -c 50 -g /tmp/timing.tsv http://localhost/

# Plot with gnuplot (if installed)
sudo apt install gnuplot
gnuplot << 'EOF'
set terminal png
set output '/tmp/latency.png'
set title "Request Latency Distribution"
set xlabel "Request"
set ylabel "Response time (ms)"
plot '/tmp/timing.tsv' using 9 with lines title "Response time"
EOF
```

## Comparing Configurations

A common use case is comparing server configurations or code changes:

```bash
#!/bin/bash
# Compare nginx configurations

run_test() {
    local label="$1"
    local url="$2"
    echo "=== $label ==="
    ab -n 2000 -c 100 -k -q "$url" | grep -E "Requests per second|Time per request|Failed|50%|95%|99%"
    echo ""
}

# Baseline
run_test "Baseline (no caching)" "http://localhost/api/data"

# After enabling caching
run_test "With caching enabled" "http://localhost/api/data"
```

## Understanding Concurrency vs Load

ab's `-c` flag controls concurrent connections. This does not represent real users - it represents simultaneous HTTP connections.

```bash
# Ramping test: test at different concurrency levels
for concurrency in 1 5 10 25 50 100 200; do
    rps=$(ab -n 1000 -c $concurrency -k -q http://localhost/ 2>/dev/null | grep "Requests per second" | awk '{print $4}')
    p99=$(ab -n 1000 -c $concurrency -k -q http://localhost/ 2>/dev/null | grep " 99%" | awk '{print $2}')
    echo "Concurrency: $concurrency  RPS: $rps  p99: ${p99}ms"
done
```

This reveals the "knee of the curve" - the concurrency level at which RPS plateaus and latency starts to climb. That's typically where you're saturating your server's resources.

## Common Issues and Gotchas

### apr_socket_recv: Connection reset by peer

The server is closing connections faster than expected. Common causes:
- Server-side timeout (check nginx/Apache `keepalive_timeout`)
- Too many concurrent connections hitting connection limits
- Firewall dropping connections

```bash
# Add -r to continue despite receive errors
ab -n 1000 -c 50 -k -r http://localhost/
```

### Socket: Too many open files

The ab client is hitting the open file descriptor limit:

```bash
# Raise the limit for the current session
ulimit -n 65535

# Permanent change
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf
```

### Benchmarking Locally Inflates Numbers

Testing from the same machine as the server means the network path is just localhost loopback. Results will be much higher than real-world network performance. For realistic results, run ab from a separate machine.

## When NOT to Use ab

ab sends identical requests. It won't:
- Simulate realistic user behavior with different request patterns
- Handle JavaScript rendering
- Manage sessions or follow redirects intelligently across different pages
- Ramp load gradually

For those needs, look at `wrk`, `k6`, `Locust`, or `JMeter`. But for a quick answer to "how fast is this endpoint?" ab remains the fastest tool to reach for.

```bash
# Quick check: can this endpoint handle 100 concurrent users?
ab -n 10000 -c 100 -k https://api.example.com/health
```

If you see acceptable RPS and p99 latency under this load, you have a baseline to work from.
