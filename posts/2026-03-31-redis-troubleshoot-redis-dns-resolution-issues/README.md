# How to Troubleshoot Redis DNS Resolution Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, DNS, Networking, Troubleshooting, Connection

Description: Diagnose and fix Redis DNS resolution failures that prevent clients from connecting, including stale cache, misconfigured hostnames, and cluster DNS issues.

---

Redis clients connect using hostnames in most production environments. When DNS resolution fails or returns stale records, clients cannot connect, causing application errors. This guide covers how to identify and fix Redis DNS issues.

## Symptoms of DNS Resolution Problems

- `Could not connect to Redis at myredis.example.com:6379: Name or service not known`
- Intermittent connection failures after Redis failover
- Cluster clients connecting to old primary after replica promotion

## Test DNS Resolution

Check if the Redis hostname resolves correctly:

```bash
# Basic DNS lookup
dig myredis.example.com

# Check what your application's DNS resolver returns
nslookup myredis.example.com

# Verify the IP matches the actual Redis server
redis-cli -h myredis.example.com -p 6379 ping
```

## Stale DNS Cache After Failover

After a Redis Sentinel or Cluster failover, DNS may still point to the old primary. Clients that cache DNS records will fail:

```bash
# Check TTL of the DNS record
dig myredis.example.com | grep -i ttl

# Flush local DNS cache (Linux)
sudo resolvectl flush-caches
```

In `sentinel.conf`:

```text
sentinel resolve-hostnames yes
sentinel announce-hostnames yes
```

This ensures Sentinel uses hostnames instead of IPs, making failover DNS-friendly.

## Kubernetes DNS for Redis

In Kubernetes, Redis services are accessed via cluster DNS:

```bash
# Check the Redis service exists
kubectl get svc redis-master -n default

# Test DNS from inside a pod
kubectl run -it --rm dns-test --image=busybox --restart=Never -- nslookup redis-master.default.svc.cluster.local
```

If DNS fails inside the cluster, check CoreDNS:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

## Redis Cluster and DNS

Redis Cluster nodes gossip with each other using the addresses in their cluster configuration. If nodes use IP addresses and those change, the cluster breaks:

```bash
# Check cluster node addresses
redis-cli CLUSTER NODES

# Update a node's announced hostname (Redis 7+)
redis-cli CLUSTER MYID
redis-cli CONFIG SET cluster-announce-hostname redis-node1.example.com
```

## Application-Level DNS Caching

Java applications using the JVM cache DNS indefinitely by default. Configure TTL:

```text
# In java.security (e.g. $JAVA_HOME/conf/security/java.security)
networkaddress.cache.ttl=60
networkaddress.cache.negative.ttl=10
```

For Node.js with `ioredis` in Cluster mode, configure the `dnsLookup` option to control DNS resolution:

```javascript
const { Cluster } = require("ioredis");
const dns = require("dns");

const cluster = new Cluster(
  [{ host: "myredis.example.com", port: 6379 }],
  {
    dnsLookup: (address, callback) => dns.lookup(address, callback),
  }
);
```

## Summary

Redis DNS resolution issues typically arise from stale DNS caches after failover, misconfigured Sentinel hostname settings, or short-lived Kubernetes pod IPs. Use `dig` and `nslookup` to verify resolution, enable Sentinel hostname resolution for failover scenarios, and configure appropriate DNS TTLs in your application runtime to prevent caching stale addresses.
