# How to Benchmark HTTP Performance with wrk on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, wrk, HTTP Benchmarking, Performance Testing, Web Server

Description: Learn how to install and use wrk on RHEL for high-performance HTTP benchmarking with multi-threaded load generation.

---

wrk is a modern HTTP benchmarking tool that uses multiple threads and an event-driven architecture. It can generate significant load from a single machine, making it more capable than Apache Bench for heavy testing.

## Installing wrk

wrk is not in the default RHEL repositories, so you need to build it from source:

```bash
# Install build dependencies
sudo dnf install -y gcc make git openssl-devel

# Clone and build wrk
git clone https://github.com/wg/wrk.git /tmp/wrk
cd /tmp/wrk
make -j$(nproc)

# Install the binary
sudo cp wrk /usr/local/bin/
```

## Basic Benchmarking

```bash
# Run a benchmark with 4 threads and 100 connections for 30 seconds
wrk -t4 -c100 -d30s http://localhost/

# Output includes:
# - Requests/sec (throughput)
# - Latency (avg, stdev, max)
# - Transfer/sec (bandwidth)
```

## Extended Duration Test

```bash
# Run a longer test with more connections
wrk -t8 -c400 -d120s http://localhost/api/endpoint

# Add --latency flag for detailed latency distribution
wrk -t8 -c400 -d120s --latency http://localhost/api/endpoint
```

## Using Lua Scripts for Custom Requests

wrk supports Lua scripts for advanced scenarios:

```lua
-- Save as /tmp/post.lua
-- This script sends POST requests with a JSON body
wrk.method = "POST"
wrk.body   = '{"username": "test", "action": "benchmark"}'
wrk.headers["Content-Type"] = "application/json"
```

```bash
# Run wrk with the Lua script
wrk -t4 -c100 -d30s -s /tmp/post.lua http://localhost/api/endpoint
```

## Custom Headers Script

```lua
-- Save as /tmp/auth.lua
-- Add authentication header to each request
request = function()
  wrk.headers["Authorization"] = "Bearer my-token"
  return wrk.format(nil, "/api/data")
end
```

```bash
wrk -t4 -c100 -d30s -s /tmp/auth.lua http://localhost/
```

## Interpreting Results

```
# Sample output:
#   Latency   Avg     Stdev     Max   +/- Stdev
#             1.2ms   0.5ms    15ms     85%
#   Req/Sec   25k     2k       30k      90%
#   Requests: 3000000  Total: 30s
#   Requests/sec: 100000
```

A high standard deviation in latency indicates inconsistent server response times. Focus on the max latency and the percentage within one standard deviation for reliability analysis.
