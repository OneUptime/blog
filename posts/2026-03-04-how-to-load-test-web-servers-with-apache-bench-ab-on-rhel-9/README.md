# How to Load Test Web Servers with Apache Bench (ab) on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Web Server

Description: Step-by-step guide on load test web servers with apache bench (ab) on rhel 9 with practical examples and commands.

---

Apache Bench (ab) provides quick HTTP load testing for web servers on RHEL 9.

## Install Apache Bench

```bash
sudo dnf install -y httpd-tools
```

## Basic Load Test

```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost/
```

## Sustained Load Test

```bash
# 10000 requests, 100 concurrent
ab -n 10000 -c 100 http://localhost/index.html
```

## POST Request Testing

```bash
echo '{"key":"value"}' > /tmp/post-data.json
ab -n 1000 -c 50 -p /tmp/post-data.json -T application/json http://localhost/api/data
```

## Keep-Alive Connections

```bash
ab -n 5000 -c 50 -k http://localhost/
```

## Key Metrics

- **Requests per second**: Overall throughput
- **Time per request**: Average response time
- **Transfer rate**: Bandwidth utilization
- **Percentage of requests served within time**: Latency distribution

## Interpret Results

```bash
Requests per second:    5000.00 [#/sec] (mean)
Time per request:       20.000 [ms] (mean)
Time per request:       0.200 [ms] (mean, across all concurrent requests)
Transfer rate:          50000.00 [Kbytes/sec] received

Percentage of the requests served within a certain time (ms)
  50%      15
  66%      18
  75%      22
  90%      35
  95%      50
  99%      100
 100%      250 (longest request)
```

## Conclusion

Apache Bench on RHEL 9 provides quick web server performance testing. Use it for baseline measurements and compare results after configuration changes or hardware upgrades.

