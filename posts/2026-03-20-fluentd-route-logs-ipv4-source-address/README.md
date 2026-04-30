# How to Use Fluentd to Route Logs by IPv4 Source Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluentd, IPv4, Log Routing, Log Aggregation, Observability

Description: Configure Fluentd to parse IPv4 addresses from log fields and route log records to different destinations based on source IP or subnet, enabling tenant-based or environment-based log separation.

## Introduction

Fluentd's `record_transformer` filter and `rewrite_tag_filter` output plugin allow routing decisions based on parsed IPv4 addresses. The `grep` filter can also exclude or keep records for specific IPv4 ranges. Combined with `copy` or separate `match` blocks, you can send logs from different subnets to different Elasticsearch indices, S3 buckets, or monitoring systems.

## Parse Nginx Logs and Extract IP

```xml
<!-- /etc/fluent/fluent.conf -->

<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /var/log/fluent/nginx-access.pos
  tag nginx.access
  <parse>
    @type nginx
  </parse>
</source>
```

The built-in `nginx` parser extracts `remote` (client IP) field automatically.

## Route Based on IPv4 Subnet

The `route` plugin rewrites tags based on tag patterns, not record fields such as `remote`. For IPv4 field-based routing, use `rewrite_tag_filter` after adding a classification field with `record_transformer`.

## Rewrite Tag Based on IP (rewrite_tag_filter)

Install `fluent-plugin-rewrite-tag-filter` if it is not already available in your Fluentd distribution.

```xml
<filter nginx.access>
  @type record_transformer
  enable_ruby true
  <record>
    ip_class ${record["remote"].start_with?("10.") || record["remote"].start_with?("192.168.") ? "internal" : "external"}
  </record>
</filter>

<match nginx.access>
  @type rewrite_tag_filter
  <rule>
    key     ip_class
    pattern ^internal$
    tag     nginx.internal
  </rule>
  <rule>
    key     ip_class
    pattern ^external$
    tag     nginx.external
  </rule>
</match>
```

## Route to Different Elasticsearch Indices

If your Fluentd installation does not already bundle the plugin, install `fluent-plugin-elasticsearch` first.

```xml
<match nginx.internal>
  @type elasticsearch
  host elasticsearch.internal
  port 9200
  index_name nginx-internal-%Y.%m.%d
  <buffer time>
    timekey 86400
    timekey_wait 10m
  </buffer>
</match>

<match nginx.external>
  @type elasticsearch
  host elasticsearch.internal
  port 9200
  index_name nginx-external-%Y.%m.%d
  <buffer time>
    timekey 86400
    timekey_wait 10m
  </buffer>
</match>
```

## Filter by Specific IPv4 Range (grep filter)

```xml
<!-- Drop log records from known crawlers/scrapers -->
<filter nginx.access>
  @type grep
  <exclude>
    key    remote
    pattern /^(66\.249\.|40\.77\.|13\.66\.)/
  </exclude>
</filter>
```

## Record Transformer - Add Subnet Tag

```xml
<filter nginx.access>
  @type record_transformer
  enable_ruby true
  <record>
    source_subnet ${
      ip = record["remote"].split(".")
      "#{ip[0]}.#{ip[1]}.#{ip[2]}.0/24"
    }
    environment ${
      record["remote"].start_with?("10.64.") ? "aws-prod" :
      record["remote"].start_with?("10.128.") ? "azure-prod" :
      "external"
    }
  </record>
</filter>
```

## Conclusion

Fluentd routes logs by IPv4 source address using `record_transformer` to add classification fields, `rewrite_tag_filter` to create routing tags, and separate `match` blocks for each destination. Use Ruby string methods in `record_transformer` for simple prefix matching; for precise CIDR matching embed a small Ruby `IPAddr.include?` check in an `enable_ruby true` block.
