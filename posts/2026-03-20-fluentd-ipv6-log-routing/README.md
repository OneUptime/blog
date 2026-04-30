# How to Configure Fluentd for IPv6 Log Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fluentd, Log Routing, Logging, DevOps

Description: Configure Fluentd to listen on IPv6 interfaces, route logs based on IPv6 source addresses, and forward to Elasticsearch or other outputs using IPv6 transport.

## Introduction

Fluentd can accept log input over IPv6 sockets and route events based on IPv6 fields extracted from log lines. Configuring Fluentd for IPv6 involves binding input plugins to IPv6 addresses, extracting and normalizing IPv6 fields with filters, and sending output over IPv6 connections.

## Step 1: Bind Fluentd Input to IPv6

```xml
<!-- /etc/fluent/fluent.conf -->

# Listen on all IPv6 interfaces via TCP syslog input

<source>
  @type syslog
  port 5140
  bind ::
  tag syslog
  <transport tcp>
  </transport>
</source>

# HTTP input on IPv6 (for log shipping)
<source>
  @type http
  port 9880
  bind ::
  # Client can POST to http://[::1]:9880/app.log
</source>

# Forward input (Fluentd-to-Fluentd) on IPv6
<source>
  @type forward
  port 24224
  bind ::
</source>
```

## Step 2: Extract IPv6 Address Fields from Logs

```xml
<!-- Parse nginx access logs and extract client_ip -->
<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /var/run/fluentd/nginx.pos
  tag nginx.access
  <parse>
    @type nginx
  </parse>
</source>

<!-- Normalize IPv6 addresses using a record_transformer -->
<filter nginx.access>
  @type record_transformer
  enable_ruby true
  <record>
    # Normalize the remote IP parsed by the nginx parser (handles both IPv4 and IPv6)
    client_ip_normalized ${begin; require "ipaddr"; IPAddr.new(record["remote"]).to_s; rescue IPAddr::InvalidAddressError, ArgumentError; record["remote"]; end}
    # Tag whether source is IPv6
    is_ipv6 ${(record["remote"] || "").include?(":") ? true : false}
  </record>
</filter>
```

## Step 3: Route Logs by IPv6 Subnet

```xml
<!-- Route logs from specific IPv6 subnets to different outputs -->
<match nginx.access>
  @type rewrite_tag_filter
  <rule>
    key client_ip_normalized
    pattern /^2001:db8:/
    tag nginx.ipv6.internal
  </rule>
  <rule>
    key is_ipv6
    pattern /^true$/
    tag nginx.ipv6.external
  </rule>
  <rule>
    key is_ipv6
    pattern /^false$/
    tag nginx.ipv4
  </rule>
</match>
```

## Step 4: Forward to Elasticsearch over IPv6

```xml
<!-- Send to Elasticsearch over IPv6 -->
<match nginx.**>
  @type elasticsearch
  # Elasticsearch on IPv6
  host 2001:db8::10
  port 9200
  scheme https
  ssl_verify false
  user elastic
  password changeme

  index_name nginx-logs
  include_timestamp true

  <buffer>
    @type file
    path /var/log/fluentd/buffer/nginx
    flush_interval 5s
    retry_type exponential_backoff
    retry_max_times 10
  </buffer>
</match>
```

## Step 5: Forward to Another Fluentd Over IPv6

```xml
<!-- Aggregate logs to a central Fluentd over IPv6 -->
<match syslog.**>
  @type forward
  # Use the IPv6 literal as the server host
  <server>
    host 2001:db8::20
    port 24224
  </server>
  <secondary>
    @type file
    path /var/log/fluentd/backup/syslog
  </secondary>
  <buffer>
    @type memory
    flush_interval 2s
  </buffer>
</match>
```

## Step 6: GeoIP Enrichment for IPv6

```xml
<!-- Add GeoIP information to IPv6 log entries -->
<filter nginx.ipv6.**>
  @type geoip
  geoip_lookup_keys client_ip_normalized
  backend_library geoip2_compat

  <record>
    city         ${city.names.en["client_ip_normalized"]}
    country_code ${country.iso_code["client_ip_normalized"]}
    latitude     ${location.latitude["client_ip_normalized"]}
    longitude    ${location.longitude["client_ip_normalized"]}
  </record>

  skip_adding_null_record true
</filter>
```

## Conclusion

Fluentd supports IPv6 natively through its socket-based input plugins - bind `::` to accept connections on IPv6 interfaces, use bracketed IPv6 literals in URL-style endpoints such as `http://[::1]:9880`, and use plain IPv6 literals for plugins that take separate `host` and `port` parameters. The `record_transformer` with Ruby enables IPv6 address normalization and subnet classification, while the `rewrite_tag_filter` plugin routes events from different IPv6 prefixes to appropriate outputs. Always test IPv6 connectivity from Fluentd's process to downstream systems before enabling in production.
