# How to Configure Elasticsearch Alerting with Watcher for Log-Based Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Watcher, Alerting, Monitoring, Logging

Description: Learn how to set up Elasticsearch Watcher for automated log-based alerting, including trigger schedules, input queries, conditions, and action configurations for real-time notifications.

---

Elasticsearch Watcher provides a powerful framework for creating automated alerts based on log data patterns. Instead of manually monitoring logs, you can configure Watcher to continuously evaluate conditions and trigger actions when specific criteria are met. This guide walks through setting up log-based alerts using Watcher.

## Understanding Watcher Components

Watcher operates through a four-stage pipeline. The trigger defines when to check for alerts, typically on a schedule. The input retrieves data from Elasticsearch indices. The condition evaluates whether the data meets alert criteria. Finally, actions determine what happens when conditions are met, such as sending emails or webhooks.

Each watch runs independently and can monitor different log patterns. You can create watches for error rate spikes, unusual activity patterns, threshold violations, or any other log-based condition.

## Installing and Enabling Watcher

Watcher comes bundled with Elasticsearch but requires proper licensing. For production use, you need either a trial license or a paid subscription. Development environments can use the basic license with limited features.

Check if Watcher is available:

```bash
# Verify Watcher is installed
curl -X GET "localhost:9200/_xpack?pretty"

# Check license status
curl -X GET "localhost:9200/_license?pretty"
```

Enable a trial license if needed:

```bash
# Start 30-day trial (production features)
curl -X POST "localhost:9200/_license/start_trial?acknowledge=true&pretty"
```

Verify Watcher is running:

```bash
# Check Watcher stats
curl -X GET "localhost:9200/_watcher/stats?pretty"
```

The response should show Watcher as running with execution statistics.

## Creating a Basic Error Rate Watch

Let's create a watch that alerts when error logs exceed a threshold. This watch checks every minute for elevated error rates in application logs.

```json
PUT _watcher/watch/error_rate_alert
{
  "trigger": {
    "schedule": {
      "interval": "1m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["application-logs-*"],
        "body": {
          "size": 0,
          "query": {
            "bool": {
              "must": [
                {
                  "match": {
                    "log.level": "ERROR"
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "gte": "now-5m"
                    }
                  }
                }
              ]
            }
          },
          "aggs": {
            "error_count": {
              "value_count": {
                "field": "@timestamp"
              }
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.aggregations.error_count.value": {
        "gt": 50
      }
    }
  },
  "actions": {
    "log_error": {
      "logging": {
        "level": "info",
        "text": "High error rate detected: {{ctx.payload.aggregations.error_count.value}} errors in last 5 minutes"
      }
    }
  }
}
```

This watch runs every minute, searches for ERROR level logs from the past 5 minutes, counts them, and logs a message if the count exceeds 50.

## Advanced Query Conditions with Multiple Criteria

Real-world alerts often need more complex logic. Here's a watch that monitors for failed authentication attempts from the same IP address:

```json
PUT _watcher/watch/failed_login_alert
{
  "trigger": {
    "schedule": {
      "interval": "2m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["auth-logs-*"],
        "body": {
          "size": 0,
          "query": {
            "bool": {
              "must": [
                {
                  "match": {
                    "event.action": "login_failed"
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "gte": "now-10m"
                    }
                  }
                }
              ]
            }
          },
          "aggs": {
            "by_ip": {
              "terms": {
                "field": "source.ip",
                "size": 10,
                "min_doc_count": 5
              }
            }
          }
        }
      }
    }
  },
  "condition": {
    "script": {
      "source": "return ctx.payload.aggregations.by_ip.buckets.size() > 0",
      "lang": "painless"
    }
  },
  "actions": {
    "notify_security": {
      "logging": {
        "level": "warn",
        "text": "Brute force attack detected from IPs: {{#ctx.payload.aggregations.by_ip.buckets}}{{key}} ({{doc_count}} attempts), {{/ctx.payload.aggregations.by_ip.buckets}}"
      }
    }
  }
}
```

This watch aggregates failed login attempts by source IP and triggers when any IP has 5 or more failures in 10 minutes.

## Configuring Email Actions

Email notifications provide immediate visibility into critical issues. Configure the email action with SMTP settings:

First, add email account configuration to elasticsearch.yml:

```yaml
xpack.notification.email.account:
  work:
    profile: standard
    smtp:
      auth: true
      starttls.enable: true
      host: smtp.gmail.com
      port: 587
      user: alerts@example.com
```

Store the password in the keystore:

```bash
# Add email password to keystore
bin/elasticsearch-keystore add xpack.notification.email.account.work.smtp.secure_password
```

Create a watch with email action:

```json
PUT _watcher/watch/critical_error_email
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["app-logs-*"],
        "body": {
          "size": 5,
          "query": {
            "bool": {
              "must": [
                {
                  "match": {
                    "log.level": "CRITICAL"
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "gte": "now-5m"
                    }
                  }
                }
              ]
            }
          },
          "sort": [
            {
              "@timestamp": {
                "order": "desc"
              }
            }
          ]
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {
        "gt": 0
      }
    }
  },
  "actions": {
    "send_email": {
      "email": {
        "profile": "standard",
        "to": ["oncall@example.com"],
        "subject": "Critical Errors Detected - {{ctx.payload.hits.total.value}} occurrences",
        "body": {
          "text": "Critical errors found:\n\n{{#ctx.payload.hits.hits}}Time: {{_source.@timestamp}}\nMessage: {{_source.message}}\nService: {{_source.service.name}}\n\n{{/ctx.payload.hits.hits}}"
        }
      }
    }
  }
}
```

This watch sends an email with the first 5 critical errors when any are detected.

## Webhook Actions for External Integration

Webhooks enable integration with external systems like Slack, PagerDuty, or custom applications:

```json
PUT _watcher/watch/slack_notification
{
  "trigger": {
    "schedule": {
      "interval": "3m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["service-logs-*"],
        "body": {
          "size": 0,
          "query": {
            "bool": {
              "must": [
                {
                  "match": {
                    "status": "DOWN"
                  }
                },
                {
                  "range": {
                    "@timestamp": {
                      "gte": "now-3m"
                    }
                  }
                }
              ]
            }
          },
          "aggs": {
            "by_service": {
              "terms": {
                "field": "service.name"
              }
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {
        "gt": 0
      }
    }
  },
  "actions": {
    "notify_slack": {
      "webhook": {
        "scheme": "https",
        "host": "hooks.slack.com",
        "port": 443,
        "method": "post",
        "path": "/services/YOUR/WEBHOOK/PATH",
        "params": {},
        "headers": {
          "Content-Type": "application/json"
        },
        "body": "{\"text\": \"Service Down Alert: {{ctx.payload.aggregations.by_service.buckets.0.key}} has {{ctx.payload.hits.total.value}} DOWN events\"}"
      }
    }
  }
}
```

Replace the webhook path with your actual Slack webhook URL.

## Throttling and Alert Management

Prevent alert fatigue by throttling repeated notifications:

```json
PUT _watcher/watch/throttled_alert
{
  "trigger": {
    "schedule": {
      "interval": "1m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["metrics-*"],
        "body": {
          "query": {
            "range": {
              "cpu.usage": {
                "gte": 90
              }
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total.value": {
        "gt": 0
      }
    }
  },
  "throttle_period": "15m",
  "actions": {
    "log_alert": {
      "logging": {
        "text": "High CPU usage detected"
      }
    }
  }
}
```

The throttle_period ensures the action only fires once every 15 minutes, even if conditions remain true.

## Managing and Testing Watches

Test watches before deployment:

```bash
# Execute watch immediately
curl -X POST "localhost:9200/_watcher/watch/error_rate_alert/_execute?pretty"

# Get watch details
curl -X GET "localhost:9200/_watcher/watch/error_rate_alert?pretty"

# List all watches
curl -X GET "localhost:9200/_watcher/_query/watches?pretty"

# Delete a watch
curl -X DELETE "localhost:9200/_watcher/watch/error_rate_alert?pretty"
```

View watch execution history:

```bash
# Get watch history
curl -X GET "localhost:9200/.watcher-history-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "watch_id": "error_rate_alert"
    }
  },
  "sort": [
    {
      "@timestamp": {
        "order": "desc"
      }
    }
  ]
}
'
```

## Conclusion

Elasticsearch Watcher transforms passive log storage into an active monitoring system. By configuring appropriate triggers, queries, conditions, and actions, you can create automated alerts that catch issues before they escalate. Start with simple watches monitoring error rates, then expand to more sophisticated alerts as you understand your log patterns. Proper throttling and testing ensure your alerts remain actionable without overwhelming your team.
