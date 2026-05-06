# How to Configure Elasticsearch to Bind to IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Elasticsearch, Database, Network.host, Search Engine

Description: Learn how to configure Elasticsearch to bind to IPv6 addresses for HTTP and transport communication, enabling IPv6-only and dual-stack deployments.

## Elasticsearch Network Configuration

```yaml
# /etc/elasticsearch/elasticsearch.yml

# If Elasticsearch 8+ added http.host: 0.0.0.0 during security auto-configuration,
# remove it or set http.host explicitly to the same IPv6 address.

# Bind to all available network interfaces

network.host: 0.0.0.0

# Bind to specific IPv6 address
network.host: "2001:db8::10"

# Bind to IPv6 loopback only (local testing)
network.host: "::1"

# Separate HTTP and transport bind addresses
network.bind_host: "2001:db8::10"
network.publish_host: "2001:db8::10"

# Or using array for multiple addresses
network.bind_host: ["::1", "2001:db8::10"]
```

## Special Values for network.host

```yaml
# Elasticsearch provides special values:
# _local_    = loopback addresses (127.0.0.1, ::1)
# _site_     = site-local addresses
# _global_   = global addresses (public)
# _[iface]_  = addresses of a specific interface (e.g., _eth0_)
# 0.0.0.0    = all available network interfaces
# Add :ipv4 or :ipv6 to a special value to limit the address family

# IPv6-specific binding using a special value:
network.host: "_global:ipv6_"
```

## Full Configuration Example

```yaml
# /etc/elasticsearch/elasticsearch.yml

cluster.name: my-cluster
node.name: node-1

# Network
network.host: "2001:db8::10"
# If http.host was auto-configured separately, override it explicitly.
http.host: "2001:db8::10"
http.port: 9200
transport.port: 9300

# Cluster discovery with IPv6
discovery.seed_hosts:
  - "[2001:db8::10]:9300"
  - "[2001:db8::11]:9300"
  - "[2001:db8::12]:9300"

cluster.initial_master_nodes:
  - node-1
  - node-2
  - node-3

# Security (Elasticsearch 8+)
# Security is enabled by default on first start.
# If you configure TLS manually, also configure the required xpack.security.*.ssl certificate settings.
```

## Apply Configuration

```bash
# Restart Elasticsearch
systemctl restart elasticsearch

# Verify listening on IPv6
ss -6 -tln | grep -E ':9200|:9300'
# Should show IPv6 listeners on ports 9200 and 9300

# Test HTTPS API over IPv6 (default on Elasticsearch 8+)
curl -6 --cacert /etc/elasticsearch/certs/http_ca.crt \
    -u elastic:$ELASTIC_PASSWORD https://[2001:db8::10]:9200/

# If HTTP TLS is disabled, use plain HTTP instead
# curl -6 http://[2001:db8::10]:9200/
```

## Test Elasticsearch IPv6 Operations

```bash
# Check cluster health
curl -6 --cacert /etc/elasticsearch/certs/http_ca.crt \
    -u elastic:$ELASTIC_PASSWORD \
    https://[2001:db8::10]:9200/_cluster/health?pretty

# Create an index
curl -6 --cacert /etc/elasticsearch/certs/http_ca.crt \
    -u elastic:$ELASTIC_PASSWORD \
    -X PUT https://[2001:db8::10]:9200/myindex

# Index a document
curl -6 --cacert /etc/elasticsearch/certs/http_ca.crt \
    -u elastic:$ELASTIC_PASSWORD \
    -X POST https://[2001:db8::10]:9200/myindex/_doc/1 \
    -H "Content-Type: application/json" \
    -d '{"title": "IPv6 Test Document"}'

# Search
curl -6 --cacert /etc/elasticsearch/certs/http_ca.crt \
    -u elastic:$ELASTIC_PASSWORD \
    https://[2001:db8::10]:9200/myindex/_search?pretty
```

## JVM IPv6 Preferences

```bash
# Elasticsearch runs on JVM - configure JVM for IPv6

# /etc/elasticsearch/jvm.options.d/ipv6.options
cat > /etc/elasticsearch/jvm.options.d/ipv6.options << 'EOF'
# Prefer IPv6 addresses when a hostname resolves to both IPv4 and IPv6
-Djava.net.preferIPv6Addresses=true

# Use IPv4-only sockets if required
# -Djava.net.preferIPv4Stack=true
EOF
```

## Summary

Configure Elasticsearch IPv6 with `network.host: "2001:db8::10"` in `elasticsearch.yml`. If you need multiple bind addresses, use `network.bind_host: ["::1", "2001:db8::10"]` and set `network.publish_host` to the published IPv6 address. On Elasticsearch 8+, remove or override any existing `http.host: 0.0.0.0` entry so HTTP also binds to the intended IPv6 address. For cluster nodes, set `discovery.seed_hosts` with IPv6 addresses in brackets. Restart with `systemctl restart elasticsearch`. If you want the JVM to prefer IPv6 when both address families are available, add `-Djava.net.preferIPv6Addresses=true` to JVM options. Test with `curl -6 --cacert /etc/elasticsearch/certs/http_ca.crt -u elastic:$ELASTIC_PASSWORD https://[2001:db8::10]:9200/_cluster/health`.
