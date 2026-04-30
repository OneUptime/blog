# How to Configure Graylog for IPv6 Log Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Graylog, GELF, Syslog, Log Management

Description: Configure Graylog inputs to receive logs from IPv6 sources, extract IPv6 address fields using extractors, and create IPv6-focused streams and alerts.

## Introduction

Graylog is a log management platform that uses OpenSearch or Elasticsearch for storage. Its inputs support binding to IPv6 interfaces, allowing log collection from IPv6-only and dual-stack sources. This guide covers input configuration, field extraction, stream creation, and IPv6 alerting in Graylog.

## Step 1: Configure Graylog Server for IPv6

```properties
# /etc/graylog/server/server.conf

# Bind Graylog web interface to IPv6

http_bind_address = [::]:9000

# Elasticsearch (or OpenSearch) connection
# Can use IPv6 address
elasticsearch_hosts = http://[2001:db8::10]:9200

# MongoDB connection (if using IPv6 MongoDB)
mongodb_uri = mongodb://[2001:db8::11]:27017/graylog
```

## Step 2: Create IPv6 Syslog Input

Graylog inputs are configured in the web UI (**System > Inputs**), but can also be created via the REST API:

```bash
# Create a UDP syslog input bound to all IPv6 interfaces
curl -u '<access_token>:token' \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Requested-By: cli" \
  -X POST \
  "http://[::1]:9000/api/system/inputs" \
  -d '{
    "title": "Syslog UDP IPv6",
    "type": "org.graylog2.inputs.syslog.udp.SyslogUDPInput",
    "global": true,
    "configuration": {
      "bind_address": "::",
      "port": 5140,
      "recv_buffer_size": 262144,
      "number_worker_threads": 2,
      "allow_override_date": true,
      "store_full_message": false,
      "force_rdns": false
    }
  }'
```

```bash
# Create a GELF UDP input on IPv6
curl -u '<access_token>:token' \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Requested-By: cli" \
  -X POST \
  "http://[::1]:9000/api/system/inputs" \
  -d '{
    "title": "GELF UDP IPv6",
    "type": "org.graylog2.inputs.gelf.udp.GELFUDPInput",
    "global": true,
    "configuration": {
      "bind_address": "::",
      "port": 12201,
      "recv_buffer_size": 262144
    }
  }'
```

## Step 3: Send GELF Logs via IPv6

```python
#!/usr/bin/env python3
# send_gelf_ipv6.py
import socket
import json
import time

def send_gelf(host: str, port: int, message: dict):
    """Send a GELF message to Graylog over UDP/IPv6."""
    payload = json.dumps(message).encode("utf-8")
    # AF_INET6 for IPv6
    sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    sock.sendto(payload, (host, port, 0, 0))
    sock.close()

gelf_message = {
    "version": "1.1",
    "host": "app-server-01",
    "short_message": "User authentication failed",
    "timestamp": time.time(),
    "level": 4,
    "_client_ip": "2001:db8::1",
    "_user": "alice",
    "_action": "login_failed"
}

send_gelf("2001:db8::20", 12201, gelf_message)
```

## Step 4: Create an Extractor for IPv6 Fields

Create a regex extractor in the Graylog web UI or via API to extract IPv6 addresses from the `message` field:

```bash
# Create regex extractor for IPv6 addresses in syslog messages
curl -u '<access_token>:token' \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Requested-By: cli" \
  -X POST \
  "http://[::1]:9000/api/system/inputs/{input_id}/extractors" \
  -d '{
    "title": "Extract IPv6 Source",
    "cursor_strategy": "copy",
    "source_field": "message",
    "target_field": "src_ipv6",
    "extractor_type": "regex",
    "extractor_config": {
      "regex_value": "(?i)from ((?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:|(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}|(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}|(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}|(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}|[0-9a-f]{1,4}:(?:(?::[0-9a-f]{1,4}){1,6})|:(?:(?::[0-9a-f]{1,4}){1,7}|:)) port"
    },
    "converters": [],
    "condition_type": "regex",
    "condition_value": ":[0-9a-fA-F]",
    "order": 0
  }'
```

## Step 5: Create an IPv6 Stream

Streams route matching messages and can be used to scope searches or event definitions:

```bash
# Create a stream for IPv6 traffic
# Replace {index_set_id} with a writable index set ID
curl -u '<access_token>:token' \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Requested-By: cli" \
  -X POST \
  "http://[::1]:9000/api/streams" \
  -d '{
    "entity": {
      "title": "IPv6 Traffic",
      "description": "All log messages from IPv6 sources",
      "index_set_id": "{index_set_id}",
      "rules": [
        {
          "field": "src_ipv6",
          "type": 5,
          "value": "",
          "inverted": false,
          "description": "src_ipv6 field is present"
        }
      ],
      "matching_type": "AND",
      "remove_matches_from_default_stream": false
    }
  }'
```

New streams are created paused. Start the stream in the UI or resume it via the API:

```bash
curl -u '<access_token>:token' \
  -H "Accept: application/json" \
  -H "X-Requested-By: cli" \
  -X POST \
  "http://[::1]:9000/api/streams/{stream_id}/resume"
```

## Step 6: IPv6 Alert Condition

In the Graylog web UI under **Alerts > Event Definitions**:
- Create an event definition that targets the IPv6 stream
- Condition type: "Filter & Aggregation"
- Filter the IPv6 stream for failed SSH logins
- Set the aggregation threshold to more than 1000 messages in 5 minutes
- Attach a notification to alert on bursts from IPv6 sources

## Conclusion

Graylog supports IPv6 log collection by binding inputs to `::` (all IPv6 interfaces). Create separate UDP syslog and GELF inputs for IPv6 sources, use regex extractors to pull IPv6 addresses into dedicated fields, and create streams to route IPv6 traffic for dedicated storage, dashboards, and event definitions. Configure `http_bind_address` to `[::]:9000` in server.conf to enable the Graylog web interface on IPv6.
