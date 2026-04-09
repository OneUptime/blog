# How to Monitor Ceph Logs for Security Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Monitoring, Log Analysis, SIEM

Description: Detect authentication failures, unauthorized access attempts, and suspicious Ceph activity by monitoring and alerting on security-relevant log patterns.

---

Ceph logs contain valuable security signals including CephX authentication failures, unauthorized pool access, and configuration changes. Monitoring these patterns proactively helps detect compromised credentials and insider threats.

## Key Security Log Patterns

Identify the log strings that indicate security events:

| Event | Log Pattern |
|-------|-------------|
| Auth failure | `auth: could not find secret` |
| Key rotation | `key changed` |
| Unknown user | `unknown entity` |
| OSD permission denied | `Permission denied` |
| RGW unauthorized | `HTTP/1.1" 403` |

## Detect Authentication Failures

Use grep on Ceph log streams:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mon --tail=1000 | \
  grep -i "auth\|could not find\|authentication"
```

For RGW access logs showing 403 errors:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=500 | \
  grep " 403 \| 401 "
```

## Set Up Alerting with Loki and Grafana

Create a Grafana alert on security log patterns using LogQL:

```bash
# Query for auth failures in Loki
count_over_time({namespace="rook-ceph", app="rook-ceph-mon"} |= "auth" |= "error" [5m]) > 5
```

Add this as a Grafana alert rule:

```yaml
apiVersion: 1
groups:
- name: ceph-security
  folder: Ceph
  interval: 1m
  rules:
  - title: Ceph Auth Failure Spike
    condition: A
    data:
    - refId: A
      queryType: instant
      relativeTimeRange:
        from: 300
        to: 0
      datasourceUid: loki-uid
      model:
        expr: 'count_over_time({namespace="rook-ceph"} |= "could not find secret" [5m])'
```

## Configure Elasticsearch Watcher for SIEM

If using Elasticsearch, create a watcher for security events:

```bash
curl -X PUT "http://elasticsearch:9200/_watcher/watch/ceph-auth-failures" \
  -H 'Content-Type: application/json' \
  -d '{
    "trigger": {"schedule": {"interval": "5m"}},
    "input": {
      "search": {
        "request": {
          "indices": ["ceph-logs-*"],
          "body": {
            "query": {
              "bool": {
                "must": [
                  {"match_phrase": {"log": "could not find secret"}},
                  {"range": {"@timestamp": {"gte": "now-5m"}}}
                ]
              }
            }
          }
        }
      }
    },
    "condition": {"compare": {"ctx.payload.hits.total.value": {"gt": 10}}},
    "actions": {
      "send_email": {
        "email": {
          "to": "security@example.com",
          "subject": "Ceph Auth Failure Alert"
        }
      }
    }
  }'
```

## Audit RGW Access with S3 Logs

Enable per-bucket access logging in RGW using the S3 PutBucketLogging API:

```bash
aws --endpoint-url http://<rgw-endpoint> s3api put-bucket-logging \
  --bucket sensitive-bucket \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "audit-logs",
      "TargetPrefix": "sensitive-bucket/"
    }
  }'
```

## Summary

Monitoring Ceph logs for security events requires identifying key patterns like authentication failures and HTTP 403 responses, then routing those patterns to alerting systems. Using Loki LogQL queries or Elasticsearch Watchers on your centralized log stream provides near-real-time detection of suspicious activity across the entire Ceph cluster.
