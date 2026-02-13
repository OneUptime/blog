# How to Set Up OpenSearch Alerting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Alerting, Monitoring

Description: A complete guide to configuring alerting in Amazon OpenSearch Service, including monitors, triggers, notification channels, and composite alerts.

---

You can build the prettiest dashboards in the world, but if nobody's watching them when things break at 3 AM, they're not much help. OpenSearch's alerting plugin lets you define monitors that continuously check your data and send notifications when conditions are met. It's built right into the service - no separate alerting tool needed.

This guide covers the different types of monitors, how to set up notification channels, and some practical alert configurations for common scenarios.

## Notification Channels

Before creating monitors, set up where you want alerts to go. OpenSearch supports several destination types:

```bash
# Create a Slack notification channel
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_notifications/configs" \
    -H "Content-Type: application/json" \
    -d '{
    "config_id": "slack-ops-channel",
    "config": {
        "name": "Ops Team Slack",
        "description": "Alerts for the operations team",
        "config_type": "slack",
        "is_enabled": true,
        "slack": {
            "url": "https://hooks.slack.com/services/T00/B00/XXXXX"
        }
    }
}'

# Create an SNS notification channel for PagerDuty integration
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_notifications/configs" \
    -H "Content-Type: application/json" \
    -d '{
    "config_id": "pagerduty-sns",
    "config": {
        "name": "PagerDuty via SNS",
        "description": "Critical alerts that page on-call",
        "config_type": "sns",
        "is_enabled": true,
        "sns": {
            "topic_arn": "arn:aws:sns:us-east-1:123456789012:pagerduty-alerts",
            "role_arn": "arn:aws:iam::123456789012:role/OpenSearchSNSRole"
        }
    }
}'

# Create an email notification channel
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_notifications/configs" \
    -H "Content-Type: application/json" \
    -d '{
    "config_id": "email-team",
    "config": {
        "name": "Engineering Team Email",
        "description": "Non-urgent alerts via email",
        "config_type": "email_group",
        "is_enabled": true,
        "email_group": {
            "recipient_list": [
                {"recipient": "team@company.com"},
                {"recipient": "oncall@company.com"}
            ]
        }
    }
}'
```

## Query-Level Monitors

A query-level monitor runs a search query on a schedule and evaluates the results against trigger conditions. This is the most common type.

Here's a monitor that alerts when error count exceeds a threshold:

```bash
# Monitor for high error rates - alerts when more than 100 errors in 5 minutes
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors" \
    -H "Content-Type: application/json" \
    -d '{
    "type": "monitor",
    "name": "High Error Rate",
    "monitor_type": "query_level_monitor",
    "enabled": true,
    "schedule": {
        "period": {
            "interval": 5,
            "unit": "MINUTES"
        }
    },
    "inputs": [
        {
            "search": {
                "indices": ["logs-*"],
                "query": {
                    "size": 0,
                    "query": {
                        "bool": {
                            "filter": [
                                {"term": {"level": "ERROR"}},
                                {"range": {"timestamp": {"gte": "{{period_end}}||-5m", "lte": "{{period_end}}"}}}
                            ]
                        }
                    },
                    "aggs": {
                        "error_count": {
                            "value_count": {"field": "_id"}
                        }
                    }
                }
            }
        }
    ],
    "triggers": [
        {
            "query_level_trigger": {
                "name": "Error count too high",
                "severity": "2",
                "condition": {
                    "script": {
                        "source": "ctx.results[0].aggregations.error_count.value > 100",
                        "lang": "painless"
                    }
                },
                "actions": [
                    {
                        "name": "Notify Slack",
                        "destination_id": "slack-ops-channel",
                        "message_template": {
                            "source": "High error rate detected!\nError count: {{ctx.results[0].aggregations.error_count.value}} errors in the last 5 minutes.\nDashboard: https://search-domain/_dashboards/app/dashboards#/view/error-dashboard"
                        },
                        "throttle_enabled": true,
                        "throttle": {
                            "value": 15,
                            "unit": "MINUTES"
                        }
                    }
                ]
            }
        }
    ]
}'
```

The `throttle` setting is important - without it, you'll get an alert every 5 minutes as long as the condition is true. A 15-minute throttle means you get one notification and then silence for 15 minutes.

## Bucket-Level Monitors

Bucket-level monitors are great when you want per-entity alerting. Instead of "are there too many errors overall?", you can ask "which specific services have too many errors?"

```bash
# Bucket-level monitor that alerts per service when error rate is high
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors" \
    -H "Content-Type: application/json" \
    -d '{
    "type": "monitor",
    "name": "Per-Service Error Monitor",
    "monitor_type": "bucket_level_monitor",
    "enabled": true,
    "schedule": {
        "period": {"interval": 5, "unit": "MINUTES"}
    },
    "inputs": [
        {
            "search": {
                "indices": ["logs-*"],
                "query": {
                    "size": 0,
                    "query": {
                        "bool": {
                            "filter": [
                                {"range": {"timestamp": {"gte": "{{period_end}}||-5m", "lte": "{{period_end}}"}}}
                            ]
                        }
                    },
                    "aggs": {
                        "by_service": {
                            "terms": {
                                "field": "service",
                                "size": 50
                            },
                            "aggs": {
                                "error_count": {
                                    "filter": {"term": {"level": "ERROR"}}
                                },
                                "total_count": {
                                    "value_count": {"field": "_id"}
                                },
                                "error_rate": {
                                    "bucket_script": {
                                        "buckets_path": {
                                            "errors": "error_count._count",
                                            "total": "total_count"
                                        },
                                        "script": "params.total > 0 ? (params.errors / params.total) * 100 : 0"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    ],
    "triggers": [
        {
            "bucket_level_trigger": {
                "name": "Service error rate above 5%",
                "severity": "2",
                "condition": {
                    "script": {
                        "source": "params._value > 5.0",
                        "lang": "painless"
                    }
                },
                "actions": [
                    {
                        "name": "Alert on high error rate service",
                        "destination_id": "slack-ops-channel",
                        "message_template": {
                            "source": "Service {{bucket_keys}} has a {{_value}}% error rate in the last 5 minutes."
                        },
                        "action_execution_policy": {
                            "action_execution_scope": {
                                "per_alert": {
                                    "actionable_alerts": ["DEDUPED", "NEW"]
                                }
                            }
                        }
                    }
                ]
            }
        }
    ]
}'
```

With bucket-level monitors, each service bucket that exceeds the threshold generates its own alert. So if `payment-api` has a 12% error rate and `auth-service` has an 8% error rate, you get two separate alerts.

## Document-Level Monitors

Document-level monitors trigger on individual documents that match certain conditions. They're useful for watching for specific events:

```bash
# Alert when any FATAL log appears
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors" \
    -H "Content-Type: application/json" \
    -d '{
    "type": "monitor",
    "name": "Fatal Error Alert",
    "monitor_type": "doc_level_monitor",
    "enabled": true,
    "schedule": {
        "period": {"interval": 1, "unit": "MINUTES"}
    },
    "inputs": [
        {
            "doc_level_input": {
                "description": "Watch for FATAL log entries",
                "indices": ["logs-*"],
                "queries": [
                    {
                        "id": "fatal-query",
                        "name": "Fatal logs",
                        "query": "level:FATAL",
                        "tags": ["fatal", "critical"]
                    },
                    {
                        "id": "oom-query",
                        "name": "Out of memory",
                        "query": "message:OutOfMemoryError OR message:\"Cannot allocate memory\"",
                        "tags": ["oom", "critical"]
                    }
                ]
            }
        }
    ],
    "triggers": [
        {
            "document_level_trigger": {
                "name": "Critical event found",
                "severity": "1",
                "condition": {
                    "script": {
                        "source": "true",
                        "lang": "painless"
                    }
                },
                "actions": [
                    {
                        "name": "Page on-call",
                        "destination_id": "pagerduty-sns",
                        "message_template": {
                            "source": "CRITICAL: Fatal error detected in production logs. Check OpenSearch Dashboards immediately."
                        }
                    }
                ]
            }
        }
    ]
}'
```

## Composite Monitors

Composite monitors let you combine conditions from multiple monitors into a single workflow. For example, you might only want to page someone if both error rates are high AND response times are degraded:

```bash
# Composite monitor that triggers only when multiple conditions are met
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_alerting/workflows" \
    -H "Content-Type: application/json" \
    -d '{
    "name": "Service Degradation Workflow",
    "enabled": true,
    "schedule": {
        "period": {"interval": 5, "unit": "MINUTES"}
    },
    "inputs": {
        "composite_input": {
            "sequence": {
                "delegates": [
                    {"order": 1, "monitor_id": "<error-rate-monitor-id>"},
                    {"order": 2, "monitor_id": "<response-time-monitor-id>"}
                ]
            }
        }
    },
    "triggers": [
        {
            "chained_alert_trigger": {
                "name": "Both conditions met",
                "severity": "1",
                "condition": {
                    "script": {
                        "source": "monitor[id=<error-rate-monitor-id>] && monitor[id=<response-time-monitor-id>]",
                        "lang": "painless"
                    }
                },
                "actions": [
                    {
                        "name": "Page on-call",
                        "destination_id": "pagerduty-sns",
                        "message_template": {
                            "source": "Service degradation confirmed: high errors AND slow response times detected simultaneously."
                        }
                    }
                ]
            }
        }
    ]
}'
```

## Managing Alerts

Check active alerts and acknowledge them:

```bash
# Get all active alerts
curl -XGET "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors/alerts?state=ACTIVE"

# Acknowledge an alert to stop repeat notifications
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_alerting/monitors/<monitor-id>/_acknowledge/alerts" \
    -H "Content-Type: application/json" \
    -d '{
    "alerts": ["<alert-id>"]
}'
```

Alerting in OpenSearch gives you a complete monitoring solution when combined with [log analytics dashboards](https://oneuptime.com/blog/post/2026-02-12-log-analytics-dashboards-opensearch/view) and [anomaly detection](https://oneuptime.com/blog/post/2026-02-12-opensearch-anomaly-detection/view). For managing the indexes that power these alerts, look into [OpenSearch ISM](https://oneuptime.com/blog/post/2026-02-12-opensearch-index-state-management-ism/view).
