# How to Use LogQL to Filter Logs by IPv6 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, LogQL, Loki, Grafana, Log Analysis

Description: Write LogQL queries to filter, extract, and aggregate log data by IPv6 address fields, including exact match, subnet prefix filtering, and address type classification.

## Introduction

LogQL is Grafana Loki's query language. It supports filtering log streams by label values and searching log line content with string, regex, and IP filters. IPv6 addresses can be matched in log labels (for stream selection) or within log line content (for content filtering). This guide covers common LogQL patterns for IPv6 log analysis.

## IPv6 Log Line Filter Patterns

```logql
# Exact IPv6 address match in log content
{job="nginx"} |= ip("2001:db8::1")

# IPv6 subnet prefix match (documentation prefix 2001:db8::/32)
{job="nginx"} |= ip("2001:db8::/32")

# IPv6 address range
{job="nginx"} |= ip("2001:db8::1-2001:db8::ffff")

# IPv6 in bracket notation (URI format)
{job="nginx"} |~ `\[[0-9A-Fa-f:.]+\]`

# Loopback ::1
{job="nginx"} |= ip("::1")

# Link-local unicast (fe80::/10)
{job="nginx"} |= ip("fe80::/10")

# Unique local unicast (fc00::/7)
{job="app"} |= ip("fc00::/7")
```

## Label-Based IPv6 Stream Selection

```logql
# Select only streams labeled with IPv6 ip_version
{job="nginx", ip_version="ipv6"}

# Combine stream selector with content filter
{job="nginx", ip_version="ipv6"} |= "/api/"

# IPv6 log lines with 5xx status in nginx access logs
{job="nginx", ip_version="ipv6"}
| pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
| __error__ = ""
| status =~ "5.."
```

## Extracting IPv6 Fields from Log Lines

```logql
# Extract client_ip from JSON structured logs
{job="app"} | json | __error__ = "" | client_ip = ip("2001:db8::/32")

# Extract with pattern matching (nginx combined log format)
{job="nginx"}
| pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
| __error__ = ""
| remote_addr = ip("2001:db8::/32")

# Regex extraction for IPv6
{job="syslog"}
| regexp `from (?P<src_ip>[^ ]+) port (?P<src_port>\d+)`
| __error__ = ""
| src_ip = ip("2001:db8::/32")
```

## Aggregation Queries

```logql
# Count log lines per IPv6 source (last 1 hour)
sum by (remote_addr) (
  count_over_time(
    {job="nginx", ip_version="ipv6"}
    | pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
    | __error__ = ""
    | remote_addr = ip("::/0") [1h]
  )
)

# Rate of IPv6 requests per second
sum(rate({job="nginx", ip_version="ipv6"}[5m]))

# Top 10 IPv6 sources by request count
topk(10,
  sum by (remote_addr) (
    count_over_time(
      {job="nginx", ip_version="ipv6"}
      | pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
      | __error__ = ""
      | remote_addr = ip("::/0") [1h]
    )
  )
)

# Error rate for IPv6 clients
(
  sum(rate(
    {job="nginx", ip_version="ipv6"}
    | pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
    | __error__ = ""
    | status =~ "5.." [5m]
  ))
) /
(
  sum(rate({job="nginx", ip_version="ipv6"}[5m]))
)
```

## Alerting with LogQL

```yaml
# Loki alerting rule for high IPv6 error rate
# /etc/loki/rules/ipv6-alerts.yaml

groups:
  - name: ipv6-alerts
    rules:
      - alert: HighIPv6ErrorRate
        expr: |
          (
            sum(rate(
              {job="nginx", ip_version="ipv6"}
              | pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
              | __error__ = ""
              | status =~ "5.." [5m]
            ))
            /
            sum(rate({job="nginx", ip_version="ipv6"}[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 error rate above 5%"

      - alert: SuspiciousIPv6Source
        expr: |
          sum by (remote_addr) (
            count_over_time(
              {job="nginx", ip_version="ipv6"}
              | pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
              | __error__ = ""
              | status =~ "4.." [1m]
            )
          ) > 100
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "IPv6 source {{ $labels.remote_addr }} generating excessive 4xx errors"
```

## Practical Examples

```logql
# Find IPv6 clients hitting login endpoint
{job="nginx", ip_version="ipv6"} |= "/login"

# Find failed SSH logins from IPv6 addresses
{job="syslog"}
| regexp `Failed password.*from (?P<src_ip>[^ ]+)`
| __error__ = ""
| src_ip = ip("::/0")

# Count unique IPv6 sources per 5-minute window
count(
  sum by (remote_addr) (
    count_over_time(
      {job="nginx", ip_version="ipv6"}
      | pattern `<remote_addr> - <_> [<_>] "<method> <path> <_>" <status> <bytes> <_>`
      | __error__ = ""
      | remote_addr = ip("::/0") [5m]
    )
  )
)
```

## Conclusion

LogQL provides flexible IPv6 filtering through both stream label selectors and line filter expressions. Assign `ip_version` as a Loki label during log collection to enable efficient stream selection - label-based filtering is faster than full-text search. For subnet-based analysis, extract the IPv6 field with `json`, `pattern`, or `regexp` parsers, then apply `ip()` or regex comparison operators. Use LogQL metric queries with `rate()` and `sum by()` to build IPv6 traffic dashboards in Grafana.
