# How to Configure Elastic Stack for IPv6 Log Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Kibana, Logstash, IPv6, SIEM, ECS, Log Analysis

Description: Configure the Elastic Stack (Elasticsearch, Logstash, Kibana) to ingest, index, and analyze IPv6 network logs using ECS field mappings and grok patterns.

## Elastic Common Schema (ECS) IPv6 Fields

ECS defines standard fields for IPv6 addresses:

| ECS Field | Type | Description |
|---|---|---|
| `source.ip` | ip | Source IPv6 address |
| `destination.ip` | ip | Destination IPv6 address |
| `client.ip` | ip | Client-side IP |
| `server.ip` | ip | Server-side IP |
| `network.type` | keyword | Network-layer type such as `ipv6` or `ipv4` |
| `source.address` | keyword | Raw source address before parsing to `.ip` or `.domain` |

Elasticsearch `ip` field type natively stores IPv6 and supports CIDR queries.

## Elasticsearch: Index Template for IPv6

```http
PUT /_index_template/network-logs-template
{
  "index_patterns": ["network-logs-*"],
  "template": {
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "source": {
          "properties": {
            "ip":      { "type": "ip" },
            "port":    { "type": "long" },
            "ip_type": { "type": "keyword" }
          }
        },
        "destination": {
          "properties": {
            "ip":   { "type": "ip" },
            "port": { "type": "long" }
          }
        },
        "network": {
          "properties": {
            "type":      { "type": "keyword" },
            "transport": { "type": "keyword" },
            "direction": { "type": "keyword" }
          }
        },
        "event": {
          "properties": {
            "action":  { "type": "keyword" },
            "outcome": { "type": "keyword" }
          }
        }
      }
    }
  }
}
```

## Logstash: Grok Patterns for IPv6

```conf
# /etc/logstash/conf.d/ipv6-network.conf

input {
  beats {
    port => 5044
    host => "::"  # Listen on IPv6
  }
}

filter {
  # Parse firewall logs with IPv6
  if [fields][log_type] == "firewall" {
    grok {
      match => {
        "message" => [
          "%{SYSLOGTIMESTAMP:timestamp} %{HOSTNAME:hostname} kernel: \[%{NUMBER}\] %{WORD:action} SRC=%{IP:source_ip} DST=%{IP:destination_ip} (?:LEN=%{NUMBER:length} )?.*PROTO=%{WORD:transport}",
          ".*SRC=%{IP:source_ip} DST=%{IP:destination_ip}(?: .*PROTO=%{WORD:transport})?"
        ]
      }
    }

    # ECS field mapping
    mutate {
      rename => {
        "source_ip"      => "[source][ip]"
        "destination_ip" => "[destination][ip]"
        "transport"      => "[network][transport]"
        "action"         => "[event][action]"
      }
      lowercase => ["[network][transport]", "[event][action]"]
    }

    if [network][transport] == "icmpv6" {
      mutate {
        replace => { "[network][transport]" => "ipv6-icmp" }
      }
    }

    # Classify address type
    if [source][ip] =~ /:/ {
      mutate {
        add_field => { "[network][type]"   => "ipv6" }
      }

      if [source][ip] =~ /^fe80:/i {
        mutate { add_field => { "[source][ip_type]" => "link-local" } }
      } else if [source][ip] =~ /^(fc|fd)/i {
        mutate { add_field => { "[source][ip_type]" => "ula" } }
      } else {
        mutate { add_field => { "[source][ip_type]" => "global" } }
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["http://[::1]:9200"]  # IPv6 Elasticsearch
    index => "network-logs-%{+YYYY.MM.dd}"
  }
}
```

## Elasticsearch: IPv6 CIDR Queries

```http
// Search for traffic from a specific /48 subnet
GET /network-logs-*/_search
{
  "query": {
    "term": {
      "source.ip": "2001:db8:1000::/48"
    }
  }
}

// Multiple IPv6 subnets
GET /network-logs-*/_search
{
  "query": {
    "bool": {
      "should": [
        { "term": { "source.ip": "2001:db8:1000::/48" } },
        { "term": { "source.ip": "2001:db8:2000::/48" } }
      ]
    }
  }
}

// Find ULA sources contacting external destinations
GET /network-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "source.ip": "fc00::/7" } }
      ],
      "must_not": [
        { "term": { "destination.ip": "fc00::/7" } },
        { "term": { "destination.ip": "fe80::/10" } }
      ]
    }
  }
}
```

## Elasticsearch: IPv6 Aggregations

```http
// Top source IPv6 /64 prefixes by event count
GET /network-logs-*/_search
{
  "size": 0,
  "aggs": {
    "src_prefix64": {
      "ip_prefix": {
        "field": "source.ip",
        "prefix_length": 64,
        "is_ipv6": true
      }
    }
  }
}

// Count events by IPv6 address type
GET /network-logs-*/_search
{
  "size": 0,
  "aggs": {
    "by_type": {
      "terms": {
        "field": "source.ip_type"
      }
    }
  }
}
```

## Kibana: IPv6 Visualization

```text
// Kibana saved search: IPv6 traffic anomalies
// Discover filter: network.type is ipv6

// KQL queries in Kibana:
// Traffic from specific subnet:
source.ip: "2001:db8::/32"

// Find link-local sources (should not be in forwarded logs):
source.ip: "fe80::/10"

// Find IPv4-mapped addresses (dual-stack indicator):
source.ip: "::ffff:0:0/96"

// High port destinations from IPv6:
network.type: ipv6 AND destination.port > 1024 AND event.action: drop
```

## Filebeat: IPv6 Input Configuration

```yaml
# /etc/filebeat/filebeat.yml

filebeat.inputs:
  - type: filestream
    id: ip6tables-filestream
    paths:
      - /var/log/ip6tables.log
    fields:
      log_type: firewall
      network_version: ipv6

output.logstash:
  hosts:
    - "[2001:db8::10]:5044"  # Connect to Logstash via IPv6

# Optional alternative: use the iptables module instead of the raw input above.
# Do not enable both for the same file, or events will be duplicated.
# When sending module events through Logstash, load the Filebeat ingest pipelines first
# and configure Logstash to use `%{[@metadata][pipeline]}` in the Elasticsearch output.
filebeat.modules:
  - module: iptables
    log:
      enabled: true
      var.input: "file"
      var.paths: ["/var/log/ip6tables.log"]
```

## Conclusion

Elastic Stack handles IPv6 natively through the `ip` field type in Elasticsearch, which accepts both IPv4 and IPv6 and supports CIDR prefix queries. Use ECS field names (`source.ip`, `destination.ip`) for compatibility with built-in Kibana security dashboards. In Logstash, use grok with the `%{IP}` pattern or custom regex for non-standard formats, and map transport-layer values such as `TCP` and `UDP` to `network.transport`. Logstash inputs can listen on IPv6 with `host => "::"`, and Elasticsearch can bind to IPv6 addresses with `network.host` or `http.host` in `elasticsearch.yml`. Use `ip_prefix` aggregation with `is_ipv6: true` to summarize traffic by /64 prefix - essential for analyzing large IPv6 address spaces where individual /128 addresses are less meaningful than /64 blocks.
