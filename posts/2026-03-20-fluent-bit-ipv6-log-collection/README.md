# How to Configure Fluent Bit for IPv6 Log Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fluent Bit, Log Collection, Kubernetes, Logging

Description: Configure Fluent Bit to collect logs over IPv6 interfaces, filter by IPv6 source address, and forward to Elasticsearch or Loki endpoints accessible over IPv6.

## Introduction

Fluent Bit is a lightweight log collector and forwarder commonly deployed as a DaemonSet in Kubernetes. It supports IPv6 input bindings and IPv6 output connections. This guide covers syslog input on IPv6, log filtering based on IPv6 fields, and forwarding to IPv6-addressed backends.

## Step 1: Fluent Bit Configuration for IPv6 Input

```ini
# /etc/fluent-bit/fluent-bit.conf

[SERVICE]
    Flush         5
    Daemon        Off
    Log_Level     info
    Parsers_File  /etc/fluent-bit/parsers.conf

# Syslog input bound to all IPv6 interfaces

[INPUT]
    Name          syslog
    Mode          tcp
    Listen        ::
    Port          5140
    Parser        syslog-rfc3164
    Tag           syslog

# HTTP input on IPv6 (for push-based log shipping)
[INPUT]
    Name          http
    Listen        ::
    Port          9880
    Tag           http.logs

# Tail log files (not IPv6-specific but common)
[INPUT]
    Name          tail
    Path          /var/log/nginx/access.log
    Tag           nginx.access
    Parser        nginx
```

## Step 2: Parser for IPv6 Log Formats

```ini
# /etc/fluent-bit/parsers.conf

[PARSER]
    Name        nginx
    Format      regex
    Regex       ^(?<remote_addr>[^ ]*) - (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?:(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)"))?$
    Time_Key    time
    Time_Format %d/%b/%Y:%H:%M:%S %z

[PARSER]
    Name        syslog-rfc3164
    Format      regex
    Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
    Time_Key    time
    Time_Format %b %d %H:%M:%S
```

## Step 3: Filter IPv6 Addresses

```ini
# Filter: mark records as IPv6 or IPv4
[FILTER]
    Name          lua
    Match         nginx.access
    Script        /etc/fluent-bit/ipv6_filter.lua
    Call          classify_ip
```

```lua
-- /etc/fluent-bit/ipv6_filter.lua

function classify_ip(tag, timestamp, record)
    local ip = record["remote_addr"] or ""
    -- IPv6 addresses contain colons
    if string.find(ip, ":") then
        record["ip_version"] = "ipv6"
    else
        record["ip_version"] = "ipv4"
    end
    return 1, timestamp, record
end
```

## Step 4: Output to Elasticsearch over IPv6

```ini
# Forward to Elasticsearch on an IPv6 address
[OUTPUT]
    Name            es
    Match           nginx.*
    # Elasticsearch on IPv6
    Host            ${ES_HOST}
    Port            ${ES_PORT}
    Index           nginx-logs
    HTTP_User       elastic
    HTTP_Passwd     changeme
    tls             On
    tls.verify      Off
    Logstash_Format On
    Logstash_Prefix nginx
    Retry_Limit     5
```

## Step 5: Output to Loki over IPv6

```ini
# Forward to Loki on an IPv6 address
[OUTPUT]
    Name            loki
    Match           *
    Host            2001:db8::20
    Port            3100
    Labels          job=fluent-bit,env=production
    Label_Keys      $ip_version,$remote_addr
    Line_Format     json
    Auto_Kubernetes_Labels On
```

## Step 6: Kubernetes DaemonSet with IPv6 Support

```yaml
# fluent-bit-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.0
          args: ["/fluent-bit/bin/fluent-bit", "-c", "/etc/fluent-bit/fluent-bit.conf"]
          env:
            # Pass IPv6 ES endpoint via environment
            - name: ES_HOST
              value: "2001:db8::10"
            - name: ES_PORT
              value: "9200"
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /etc/fluent-bit/
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: fluent-bit-config
```

## Conclusion

Fluent Bit supports IPv6 by binding input plugins to `::` (all IPv6 interfaces) and specifying IPv6 addresses in output plugin `Host` configuration. Lua scripts provide flexible IPv6 field classification, enabling routing decisions based on address type. When deploying as a Kubernetes DaemonSet in a properly configured dual-stack cluster, Fluent Bit pods can receive IPv6 addresses and connect to IPv6-addressed log storage backends without additional Fluent Bit-specific configuration.
