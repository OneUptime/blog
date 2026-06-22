# How to Set Up Elasticsearch Audit Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Audit Logging, Security, Compliance, Monitoring, Security Events

Description: A comprehensive guide to setting up Elasticsearch audit logging for security event tracking, compliance requirements, and security monitoring with configuration examples and best practices.

---

Elasticsearch audit logging provides detailed records of security-related events in your cluster. This is essential for compliance requirements, security monitoring, and forensic analysis. This guide covers complete audit logging configuration and analysis.

## Understanding Audit Logging

Audit logs capture:

- **Authentication events** - Login attempts, successes, and failures
- **Authorization events** - Access granted or denied
- **Security configuration changes** - User, role, and API key modifications
- **Index access operations** - Authorization events for index actions when enabled
- **System access** - Anonymous access attempts

## Enabling Audit Logging

Audit logging is available only on certain Elastic subscription levels.

### Basic Configuration

Add to `elasticsearch.yml`:

```yaml
xpack.security.audit.enabled: true
```

Restart Elasticsearch:

```bash
systemctl restart elasticsearch
```

### Audit Log Output

#### File Output

```yaml
xpack.security.audit.enabled: true
```

Logs are written to `$ES_HOME/logs/<cluster_name>_audit.json`

#### Shipping Audit Logs to Elasticsearch

The `logfile` audit output is the supported Elasticsearch audit output. To query audit events in Elasticsearch, ship the audit JSON file with Filebeat, Elastic Agent, or another log shipper.

```yaml
# modules.d/elasticsearch.yml
- module: elasticsearch
  audit:
    enabled: true
    var.paths:
      - /var/log/elasticsearch/*_audit.json
```

## Configuring Event Types

### Include Specific Events

```yaml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - authentication_success
  - authentication_failed
  - access_granted
  - access_denied
  - connection_granted
  - connection_denied
  - tampered_request
  - run_as_granted
  - run_as_denied
  - security_config_change
```

### Exclude Events

```yaml
xpack.security.audit.logfile.events.exclude:
  - authentication_success  # Exclude successful auths (can be noisy)
```

### Event Types Reference

| Event Type | Description |
|------------|-------------|
| authentication_success | Successful authentication |
| authentication_failed | Failed authentication attempt |
| access_granted | Authorization granted for action |
| access_denied | Authorization denied for action |
| connection_granted | TCP connection accepted |
| connection_denied | TCP connection rejected |
| tampered_request | Request with invalid authentication token |
| run_as_granted | Run-as authorization granted |
| run_as_denied | Run-as authorization denied |
| anonymous_access_denied | Anonymous access denied |
| security_config_change | Security configuration modified |

## Filtering Audit Events

### Filter by User

Ignore specific users:

```yaml
xpack.security.audit.logfile.events.include:
  - access_granted
  - access_denied

xpack.security.audit.logfile.events.emit_request_body: true

# Ignore selected system users

xpack.security.audit.logfile.events.ignore_filters:
  system_users:
    users: ["_system", "kibana_system", "beats_system"]
```

Exclude system users:

```yaml
xpack.security.audit.logfile.events.ignore_filters:
  ignore_system:
    users: ["_system", "elastic", "kibana_system"]
```

### Filter by Realm

```yaml
xpack.security.audit.logfile.events.ignore_filters:
  ignore_internal:
    realms: ["_internal", "file"]
```

### Filter by Index

```yaml
xpack.security.audit.logfile.events.ignore_filters:
  ignore_monitoring:
    indices: [".monitoring-*", ".watches", ".triggered_watches"]
```

### Filter by Role

```yaml
xpack.security.audit.logfile.events.ignore_filters:
  ignore_superusers:
    roles: ["superuser"]
```

### Combined Filters

```yaml
xpack.security.audit.logfile.events.ignore_filters:
  system_and_monitoring:
    users: ["_system", "kibana_system"]
    indices: [".monitoring-*", ".kibana*"]

  beats_activity:
    users: ["beats_system"]
    indices: ["metricbeat-*", "filebeat-*"]
```

## Complete Configuration Example

```yaml
# elasticsearch.yml

# Enable audit logging
xpack.security.audit.enabled: true

# Events to include
xpack.security.audit.logfile.events.include:
  - authentication_success
  - authentication_failed
  - access_denied
  - security_config_change
  - tampered_request

# Include request body for detailed analysis
xpack.security.audit.logfile.events.emit_request_body: true

# Ignore noisy system events
xpack.security.audit.logfile.events.ignore_filters:
  system_accounts:
    users: ["_system", "elastic"]

  kibana_system:
    users: ["kibana_system"]
    indices: [".kibana*"]

  monitoring_indices:
    indices: [".monitoring-*"]

  internal_realms:
    realms: ["_internal"]
```

## Audit Log Format

### JSON Log Format

Each audit event is a JSON object:

```json
{
  "type": "audit",
  "timestamp": "2024-01-21T10:30:00,000+0000",
  "node.id": "abc123",
  "event.type": "rest",
  "event.action": "authentication_success",
  "authentication.type": "REALM",
  "user.name": "john_doe",
  "user.realm": "native",
  "origin.type": "rest",
  "origin.address": "192.168.1.100",
  "url.path": "/_search",
  "request.method": "GET",
  "request.id": "xyz789"
}
```

### Common Fields

| Field | Description |
|-------|-------------|
| timestamp | Event timestamp in the raw audit log |
| node.id | Node that handled the request |
| event.type | Internal processing layer (rest, transport, ip_filter, security_config_change) |
| event.action | Audit action performed |
| user.name | Username |
| user.realm | Authentication realm |
| origin.type | Request origin (rest, transport) |
| origin.address | Client IP address |
| request.id | Unique request identifier |
| request.name | Request type |
| indices | Affected indices |
| action | Elasticsearch action |

## Querying Audit Logs

The examples below assume your log shipper writes Elasticsearch audit events to an `audit-logs-*` index or data stream.

### From Shipped Audit Logs

```bash
# Get recent authentication failures
curl -u elastic:password -X GET "localhost:9200/audit-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"term": {"event.action": "authentication_failed"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "sort": [{"@timestamp": {"order": "desc"}}],
  "size": 100
}'
```

### Access Denied Events

```bash
curl -u elastic:password -X GET "localhost:9200/audit-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"term": {"event.action": "access_denied"}},
        {"range": {"@timestamp": {"gte": "now-24h"}}}
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": {"field": "user.name.keyword"}
    },
    "by_action": {
      "terms": {"field": "event.action.keyword"}
    }
  }
}'
```

### Security Configuration Changes

```bash
curl -u elastic:password -X GET "localhost:9200/audit-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "term": {"event.type": "security_config_change"}
  },
  "sort": [{"@timestamp": {"order": "desc"}}],
  "size": 50
}'
```

### Events by User

```bash
curl -u elastic:password -X GET "localhost:9200/audit-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"term": {"user.name.keyword": "suspicious_user"}},
        {"range": {"@timestamp": {"gte": "now-7d"}}}
      ]
    }
  },
  "sort": [{"@timestamp": {"order": "desc"}}]
}'
```

### Events by IP Address

```bash
curl -u elastic:password -X GET "localhost:9200/audit-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "term": {"origin.address": "192.168.1.100"}
  },
  "aggs": {
    "event_types": {
      "terms": {"field": "event.action.keyword"}
    }
  }
}'
```

## Analyzing Audit Logs from File

### Parse JSON Logs

```bash
# View recent audit events
tail -100 /var/log/elasticsearch/cluster_audit.json | jq '.'

# Filter authentication failures
cat /var/log/elasticsearch/cluster_audit.json | \
  jq 'select(.["event.action"] == "authentication_failed")'

# Count events by type
cat /var/log/elasticsearch/cluster_audit.json | \
  jq -r '.["event.action"]' | sort | uniq -c | sort -rn

# Get unique users with access denied
cat /var/log/elasticsearch/cluster_audit.json | \
  jq -r 'select(.["event.action"] == "access_denied") | .["user.name"]' | \
  sort | uniq
```

### Log Rotation

Elasticsearch rotates audit logs by default daily or at 1GB. For self-managed clusters, you can customize the audit appender in `log4j2.properties`, although Elastic recommends using the default Log4j2 configuration:

```properties
appender.audit_rolling.type = RollingFile
appender.audit_rolling.name = audit_rolling
appender.audit_rolling.fileName = ${sys:es.logs.base_path}${sys:file.separator}${sys:es.logs.cluster_name}_audit.json
appender.audit_rolling.layout.type = PatternLayout
appender.audit_rolling.layout.pattern = %m%n
appender.audit_rolling.filePattern = ${sys:es.logs.base_path}${sys:file.separator}${sys:es.logs.cluster_name}_audit-%d{yyyy-MM-dd}.json.gz
appender.audit_rolling.policies.type = Policies
appender.audit_rolling.policies.time.type = TimeBasedTriggeringPolicy
appender.audit_rolling.policies.time.interval = 1
appender.audit_rolling.policies.time.modulate = true
appender.audit_rolling.strategy.type = DefaultRolloverStrategy
appender.audit_rolling.strategy.max = 30
```

## Shipped Audit Log Management

### ILM Policy for Audit Logs

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/audit-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "10gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "readonly": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

### Index Template for Audit Logs

```bash
curl -u elastic:password -X PUT "localhost:9200/_index_template/audit-logs" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["audit-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "audit-logs-policy",
      "index.lifecycle.rollover_alias": "audit-logs"
    }
  }
}'
```

### Bootstrap Write Index

```bash
curl -u elastic:password -X PUT "localhost:9200/audit-logs-000001" -H 'Content-Type: application/json' -d'
{
  "aliases": {
    "audit-logs": {
      "is_write_index": true
    }
  }
}'
```

## Security Monitoring Alerts

### Alert on Multiple Failed Logins

Using Elasticsearch Watcher:

```bash
curl -u elastic:password -X PUT "localhost:9200/_watcher/watch/failed_login_alert" -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["audit-logs-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                {"term": {"event.action": "authentication_failed"}},
                {"range": {"@timestamp": {"gte": "now-5m"}}}
              ]
            }
          },
          "aggs": {
            "by_user": {
              "terms": {"field": "user.name.keyword"}
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {
        "gte": 5
      }
    }
  },
  "actions": {
    "notify_security": {
      "webhook": {
        "method": "POST",
        "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
        "body": "Multiple failed login attempts detected: {{ctx.payload.hits.total.value}} in the last 5 minutes"
      }
    }
  }
}'
```

### Alert on Security Configuration Changes

```bash
curl -u elastic:password -X PUT "localhost:9200/_watcher/watch/security_config_change" -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": {
      "interval": "1m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["audit-logs-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                {"term": {"event.type": "security_config_change"}},
                {"range": {"@timestamp": {"gte": "now-1m"}}}
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {
        "gte": 1
      }
    }
  },
  "actions": {
    "notify_security": {
      "email": {
        "to": "security@example.com",
        "subject": "Elasticsearch Security Configuration Changed",
        "body": "Security configuration was modified. Please review audit logs."
      }
    }
  }
}'
```

## Compliance Requirements

### GDPR Compliance

Track access to personal data:

```yaml
xpack.security.audit.logfile.events.include:
  - access_granted
  - access_denied

xpack.security.audit.logfile.events.ignore_filters:
  non_pii_indices:
    indices: ["logs-*", "metrics-*"]
    # Only audit indices containing PII
```

### PCI DSS Compliance

Log all authentication and access events:

```yaml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - authentication_success
  - authentication_failed
  - access_granted
  - access_denied
  - security_config_change

# Retain logs for required period (typically 1 year)
```

### HIPAA Compliance

Track all access to protected health information:

```yaml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - authentication_success
  - authentication_failed
  - access_granted
  - access_denied
  - security_config_change
  - run_as_granted
  - run_as_denied

xpack.security.audit.logfile.events.emit_request_body: true
```

## Best Practices

### 1. Selective Logging

Balance detail with performance:

```yaml
# Production - focus on security-relevant events
xpack.security.audit.logfile.events.include:
  - authentication_failed
  - access_denied
  - security_config_change
  - tampered_request

# Investigation mode - temporarily enable all events
xpack.security.audit.logfile.events.include:
  - authentication_success
  - authentication_failed
  - access_granted
  - access_denied
  - security_config_change
```

### 2. Protect Audit Logs

Ensure audit logs cannot be tampered with:

```bash
# File permissions
chmod 600 /var/log/elasticsearch/*_audit.json
chown elasticsearch:elasticsearch /var/log/elasticsearch/*_audit.json

# Send to external SIEM
# Configure Filebeat to ship audit logs to external system
```

### 3. Regular Review

Implement regular audit log review process:

```bash
# Daily summary script
curl -u elastic:password -X GET "localhost:9200/audit-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "range": {"@timestamp": {"gte": "now-24h"}}
  },
  "aggs": {
    "event_summary": {
      "terms": {"field": "event.action.keyword"}
    },
    "failed_users": {
      "filter": {"term": {"event.action": "authentication_failed"}},
      "aggs": {
        "users": {"terms": {"field": "user.name.keyword"}}
      }
    }
  }
}'
```

### 4. Retention Policy

Implement appropriate retention based on compliance needs:

```bash
# Delete old shipped audit indices
curl -u elastic:password -X DELETE "localhost:9200/audit-logs-2023*"
```

## Summary

Elasticsearch audit logging provides:

1. **Security event tracking** - Monitor authentication, authorization, and configuration changes
2. **Compliance support** - Meet regulatory requirements with detailed logs
3. **Forensic capability** - Investigate security incidents with complete audit trails
4. **Alerting integration** - Detect suspicious activity in real-time

Key configuration considerations:

- Enable appropriate event types
- Filter out noisy system events
- Implement proper log retention
- Set up alerting for critical events
- Protect audit log integrity

With properly configured audit logging, you have complete visibility into security-related activity in your Elasticsearch cluster.
