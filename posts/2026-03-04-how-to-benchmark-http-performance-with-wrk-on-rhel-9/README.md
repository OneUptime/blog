# How to Benchmark HTTP Performance with wrk on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance, Benchmarking

Description: Step-by-step guide on benchmark http performance with wrk on rhel 9 with practical examples and commands.

---

wrk is a modern HTTP benchmarking tool that uses multithreading for high-performance load testing on RHEL 9.

## Install wrk

```bash
sudo dnf install -y git gcc make openssl-devel
git clone https://github.com/wg/wrk.git
cd wrk
make
sudo cp wrk /usr/local/bin/
```

## Basic Benchmark

```bash
# 2 threads, 100 connections, 30 seconds
wrk -t2 -c100 -d30s http://localhost/
```

## High-Concurrency Test

```bash
wrk -t8 -c1000 -d60s http://localhost/
```

## Custom Request with Lua Script

```lua
-- post.lua
wrk.method = "POST"
wrk.body   = '{"username":"test","password":"test123"}'
wrk.headers["Content-Type"] = "application/json"
```

```bash
wrk -t4 -c200 -d30s -s post.lua http://localhost/api/login
```

## Latency Distribution

```bash
wrk -t4 -c200 -d30s --latency http://localhost/
```

## Key Metrics

```bash
Running 30s test @ http://localhost/
  4 threads and 200 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     5.50ms    2.30ms   50.00ms   85.00%
    Req/Sec    10.00k     1.20k    15.00k    70.00%
  Latency Distribution
     50%    5.00ms
     75%    6.50ms
     90%    8.00ms
     99%   15.00ms
  1200000 requests in 30.00s, 500.00MB read
Requests/sec:  40000.00
Transfer/sec:     16.67MB
```

## Conclusion

wrk on RHEL 9 generates high-performance HTTP load with detailed latency distribution. Use Lua scripts for complex request patterns and compare results across configuration changes.

