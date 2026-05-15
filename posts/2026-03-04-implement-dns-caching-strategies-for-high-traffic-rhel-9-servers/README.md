# How to Implement DNS Caching Strategies for High-Traffic RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Caching, Linux

Description: Learn how to implement DNS Caching Strategies for High-Traffic RHEL Servers on RHEL with step-by-step instructions, configuration examples, and best practices.

---

DNS caching reduces latency and network traffic by storing previously resolved queries locally. For high-traffic servers that make many outbound DNS requests, an effective caching strategy can significantly improve application response times.

## Prerequisites

- RHEL
- Root or sudo access
- Understanding of your application's DNS query patterns

## Strategy 1: Local Unbound Cache

Install and configure Unbound as a local caching resolver:

```bash
sudo dnf install -y unbound
```

```text
server:
    interface: 127.0.0.1
    access-control: 127.0.0.0/8 allow
    msg-cache-size: 128m
    rrset-cache-size: 256m
    cache-max-ttl: 86400
    cache-min-ttl: 300
    prefetch: yes
    prefetch-key: yes
    num-threads: 2
```

The `prefetch: yes` setting causes Unbound to refresh popular entries before they expire, keeping the cache warm.

## Strategy 2: nscd for Name Service Caching

```bash
sudo dnf install -y nscd
sudo systemctl enable --now nscd
```

Configure the hosts cache:

```bash
sudo vi /etc/nscd.conf
```

```text
enable-cache            hosts           yes
positive-time-to-live   hosts           3600
negative-time-to-live   hosts           20
suggested-size          hosts           211
```

For DNS-backed host lookups, `nscd` uses the TTL returned by DNS rather than the `positive-time-to-live` value.

## Strategy 3: Application-Level Caching

For applications making many DNS queries, implement caching in the application:

### Python with cachetools

```python
from cachetools import TTLCache
import socket

dns_cache = TTLCache(maxsize=1000, ttl=300)

def cached_resolve(hostname):
    if hostname not in dns_cache:
        dns_cache[hostname] = socket.getaddrinfo(hostname, None)
    return dns_cache[hostname]
```

## Strategy 4: Tune TTL Values

Use Unbound to enforce minimum TTL values for aggressive caching:

```text
server:
    cache-min-ttl: 300
    cache-max-negative-ttl: 60
```

## Monitoring Cache Effectiveness

Enable Unbound remote control before using `unbound-control`:

```text
remote-control:
    control-enable: yes
```

```bash
sudo -u unbound unbound-control-setup
```

```bash
sudo unbound-control stats | grep -E 'total.num|cache'
```

Key metrics:
- Cache hit ratio should be above 80% for a well-tuned cache
- Monitor `num.cachemiss` to identify frequently changing records

## Conclusion

DNS caching on high-traffic RHEL servers reduces latency and external DNS load. Use Unbound for recursive caching, nscd for system-level name service caching, and application-level caching for workloads with predictable DNS patterns.
