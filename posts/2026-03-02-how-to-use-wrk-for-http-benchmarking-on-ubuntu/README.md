# How to Use wrk for HTTP Benchmarking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, Benchmarking, Web Server, Networking

Description: Learn how to install and use wrk for high-performance HTTP benchmarking on Ubuntu, including custom Lua scripts for POST requests, dynamic headers, and pipeline testing.

---

`wrk` is a modern HTTP benchmarking tool capable of generating significant load from a single machine. Unlike ApacheBench, wrk uses multiple threads and event-driven I/O, allowing it to saturate high-throughput servers without itself becoming the bottleneck. Its Lua scripting interface lets you customize request headers, bodies, and response handling.

## Installation

wrk is not in the standard Ubuntu repositories, so you'll compile it from source:

```bash
# Install build dependencies
sudo apt install build-essential libssl-dev git

# Clone the repository
git clone https://github.com/wg/wrk.git
cd wrk

# Build
make

# Install system-wide
sudo cp wrk /usr/local/bin/

# Verify
wrk --version
```

Alternatively, some third-party PPAs package it:

```bash
# Via snap (alternative)
# wrk is not commonly snapped, so source is preferred
```

## Basic Usage

```text
wrk [options] <URL>
```

```bash
# Basic test: 2 threads, 10 connections, 30 seconds
wrk -t2 -c10 -d30s http://localhost/

# More aggressive: 4 threads, 100 connections, 30 seconds
wrk -t4 -c100 -d30s http://localhost/

# With latency histogram
wrk -t4 -c100 -d30s --latency http://localhost/
```

## Key Options

| Option | Description |
|--------|-------------|
| `-t N` | Number of threads |
| `-c N` | Total number of open HTTP connections |
| `-d N[s/m/h]` | Duration (e.g., 30s, 5m, 1h) |
| `--latency` | Print detailed latency statistics |
| `--timeout N[s]` | Request timeout |
| `-H "Header: Value"` | Add HTTP header |
| `-s script.lua` | Load Lua script |

### Thread vs Connection Count

A common question is how to set `-t` and `-c`. The rule of thumb is:
- `-t` should not exceed the number of CPU cores on the benchmarking machine
- `-c` should be the number of concurrent connections you want to simulate
- Each thread handles `c/t` connections

```bash
# For a 4-core benchmarking machine testing 200 concurrent connections
wrk -t4 -c200 -d60s http://target-server/
```

## Reading the Output

```bash
wrk -t4 -c100 -d30s --latency http://localhost/
```

```text
Running 30s test @ http://localhost/
  4 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    12.34ms    4.56ms  89.23ms   78.90%
    Req/Sec     2.05k   312.45     3.21k    68.00%
  Latency Distribution
     50%    10.12ms
     75%    14.28ms
     90%    19.87ms
     99%    32.45ms
  245782 requests in 30.06s, 198.92MB read
Requests/sec:   8178.32
Transfer/sec:      6.62MB
```

### Interpreting the Numbers

**Latency row** - Shows average, standard deviation, and maximum latency per request. High standard deviation relative to average indicates inconsistent response times (often caused by GC pauses, database query variance, or CPU throttling).

**Req/Sec row** - Requests per second per thread. Multiply by thread count for total, or read the summary `Requests/sec` line directly.

**Latency Distribution** - The percentile breakdown. The 99th percentile is what your worst-case users experience. A high p99 with a low p50 usually indicates occasional spikes (GC, slow queries, mutex contention).

**Requests total** - Total requests completed successfully. Use this with the total duration to independently calculate RPS.

## Lua Scripting

This is what separates wrk from simpler tools. Lua scripts can modify every request and process every response.

### POST Requests

```lua
-- post.lua
-- Send a POST request with a JSON body

wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Accept"] = "application/json"
wrk.body = '{"user": "testuser", "action": "ping"}'
```

```bash
wrk -t4 -c100 -d30s -s post.lua http://localhost/api/events
```

### Dynamic Request Bodies

```lua
-- dynamic.lua
-- Generate a unique ID in each request

local counter = 0

function request()
    counter = counter + 1
    local body = string.format('{"id": %d, "timestamp": %d}', counter, os.time())

    local headers = {
        ["Content-Type"] = "application/json",
        ["X-Request-ID"] = tostring(counter)
    }

    return wrk.format("POST", "/api/events", headers, body)
end
```

```bash
wrk -t4 -c100 -d30s -s dynamic.lua http://localhost/
```

### Authentication Headers

```lua
-- auth.lua
-- Add authentication token to all requests

function setup(thread)
    thread:set("token", "Bearer eyJhbGciOiJIUzI1NiJ9.your_jwt_token")
end

function request()
    wrk.headers["Authorization"] = wrk.thread:get("token")
    return wrk.format(nil, nil, nil, nil)
end
```

### Randomized URL Paths

```lua
-- random_paths.lua
-- Test multiple endpoints with random distribution

local paths = {
    "/api/users",
    "/api/products",
    "/api/orders",
    "/api/search?q=test",
    "/api/stats"
}

function request()
    local idx = math.random(1, #paths)
    return wrk.format("GET", paths[idx])
end
```

```bash
wrk -t4 -c100 -d30s -s random_paths.lua http://localhost/
```

### Request Sequences

```lua
-- sequence.lua
-- Cycle through a series of requests

local sequences = {
    {method="GET",  path="/api/users"},
    {method="POST", path="/api/session", body='{"user":"test"}'},
    {method="GET",  path="/api/profile"},
    {method="DELETE", path="/api/session"}
}

local idx = 0

function request()
    idx = (idx % #sequences) + 1
    local s = sequences[idx]

    local headers = {}
    if s.body then
        headers["Content-Type"] = "application/json"
    end

    return wrk.format(s.method, s.path, headers, s.body)
end
```

### Processing Responses

```lua
-- check_responses.lua
-- Count success vs error responses

local errors = 0
local successes = 0

function response(status, headers, body)
    if status >= 400 then
        errors = errors + 1
    else
        successes = successes + 1
    end
end

function done(summary, latency, requests)
    io.write(string.format("Successes: %d\n", successes))
    io.write(string.format("Errors: %d\n", errors))
    io.write(string.format("Error rate: %.2f%%\n", errors * 100 / (errors + successes)))
end
```

### Custom Latency Summary

```lua
-- custom_stats.lua
-- Extended statistics output

function done(summary, latency, requests)
    local duration = summary.duration / 1e6  -- convert to seconds

    io.write(string.format("Duration: %.2f seconds\n", duration))
    io.write(string.format("Total requests: %d\n", summary.requests))
    io.write(string.format("Total errors: %d\n", summary.errors.connect + summary.errors.read + summary.errors.write + summary.errors.status + summary.errors.timeout))
    io.write(string.format("Throughput: %.2f req/s\n", summary.requests / duration))
    io.write(string.format("Data transferred: %.2f MB\n", summary.bytes / 1e6))
    io.write("\nLatency percentiles:\n")

    local percentiles = {50, 75, 90, 95, 99, 99.9}
    for _, pct in ipairs(percentiles) do
        io.write(string.format("  p%g: %.2fms\n", pct, latency:percentile(pct) / 1000))
    end
end
```

```bash
wrk -t4 -c100 -d30s -s custom_stats.lua --latency http://localhost/
```

## Benchmarking Strategies

### Finding the Throughput Ceiling

Start low and increase concurrency until RPS plateaus:

```bash
#!/bin/bash
URL="http://localhost/"
DURATION="30s"

for connections in 1 5 10 25 50 100 200 500; do
    echo -n "Connections: $connections  "
    wrk -t4 -c$connections -d$DURATION --latency "$URL" 2>/dev/null | \
        grep -E "Requests/sec|50%|99%"
done
```

### Comparing Before and After

```bash
#!/bin/bash
# before_after.sh - Compare two configurations

test_and_report() {
    local label="$1"
    local url="$2"

    echo "=== $label ==="
    result=$(wrk -t4 -c50 -d30s --latency "$url" 2>/dev/null)
    echo "$result" | grep -E "Requests/sec|Latency|50%|95%|99%"
    echo ""
}

# Deploy version A, test
test_and_report "Version A" "http://localhost/"

# Deploy version B, test
echo "Deploy version B and press Enter..."
read
test_and_report "Version B" "http://localhost/"
```

### Warming Up Before Measuring

```bash
# Warm up the server (fills caches, JIT compilation, etc.)
wrk -t4 -c50 -d30s http://localhost/ > /dev/null 2>&1

# Now take the actual measurement
wrk -t4 -c100 -d60s --latency http://localhost/
```

## Common Mistakes

**Running wrk on the same machine as the server** - This means wrk and the server compete for CPU. Always run wrk from a dedicated benchmarking machine when possible.

**Testing with too few connections** - If `-c` is too low, you won't saturate the server and you're measuring something closer to serial throughput. Use enough connections to generate the concurrency you care about.

**Short test duration** - Run tests for at least 30 seconds, preferably 60-120 seconds. Short runs miss JVM warmup effects, GC pauses, and transient spikes.

**Not checking error rates** - If wrk reports a high RPS but errors are high, the server is returning failures, not successful responses.

```bash
# wrk doesn't show errors by default - use a Lua script or watch for messages like:
# "Non-2xx or 3xx responses: 1234"
```

wrk occupies a sweet spot between the simplicity of ApacheBench and the complexity of full load testing frameworks. For developers and sysadmins who need quick, accurate HTTP performance measurements - especially with the flexibility to customize requests via Lua - it's a go-to tool.
