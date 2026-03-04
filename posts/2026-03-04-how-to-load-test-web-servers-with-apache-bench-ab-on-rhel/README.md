# How to Load Test Web Servers with Apache Bench (ab) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Apache Bench, Load Testing, Web Server, Performance

Description: Learn how to use Apache Bench (ab) on RHEL to load test web servers and measure request throughput and latency.

---

Apache Bench (ab) is a simple command-line tool for benchmarking HTTP servers. It comes bundled with the Apache HTTP server tools and is useful for quick load testing.

## Installing Apache Bench

```bash
# Install httpd-tools which includes ab
sudo dnf install -y httpd-tools
```

## Basic Load Test

```bash
# Send 1000 requests with 10 concurrent connections
ab -n 1000 -c 10 http://localhost/

# The output shows:
# - Requests per second
# - Time per request (mean and across all concurrent requests)
# - Transfer rate
# - Connection times (min, mean, median, max)
# - Percentage of requests served within a certain time
```

## Testing with Higher Concurrency

```bash
# 10000 requests with 100 concurrent connections
ab -n 10000 -c 100 http://localhost/index.html

# Use -k to enable HTTP KeepAlive
ab -n 10000 -c 100 -k http://localhost/index.html
```

## POST Request Testing

```bash
# Create a JSON payload file
echo '{"key": "value", "name": "test"}' > /tmp/post-data.json

# Send POST requests with a JSON body
ab -n 1000 -c 10 \
  -p /tmp/post-data.json \
  -T 'application/json' \
  http://localhost/api/endpoint
```

## Testing with Custom Headers

```bash
# Add an authorization header
ab -n 1000 -c 10 \
  -H 'Authorization: Bearer your-token-here' \
  http://localhost/api/protected
```

## Understanding the Output

Key metrics to focus on:

```bash
# Example output interpretation:
# Requests per second:    2500.00 [#/sec]  -- throughput
# Time per request:       4.000 [ms]       -- avg latency per request
# Failed requests:        0                -- should be zero
# Percentage of the requests served within a certain time (ms)
#   50%      3
#   90%      5
#   99%     12                             -- P99 latency
```

## Limitations

ab is single-threaded, so it may become the bottleneck before your server does. For more advanced testing, consider using wrk or k6. Always run load tests from a separate machine to avoid skewing results with the testing tool's own resource consumption.
