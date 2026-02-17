# How to Configure PagerDuty Event Orchestration for GCP Multi-Service Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, PagerDuty, Event Orchestration, Alerting, Incident Management, Google Cloud

Description: Learn how to configure PagerDuty Event Orchestration to intelligently route, deduplicate, and prioritize alerts from multiple Google Cloud services.

---

When you run a dozen services on Google Cloud, each with its own monitoring and alerting, the result is often alert chaos. Cloud Monitoring fires alerts for CPU spikes, Cloud SQL sends notifications about storage, GKE reports pod failures, and your application layer adds its own error alerts. Without intelligent routing, your on-call engineer gets flooded with noise while critical issues get buried.

PagerDuty Event Orchestration solves this by giving you a rules engine that sits between your GCP alert sources and your incident response teams. It can deduplicate related alerts, route them to the right team, suppress noise, and escalate critical issues - all automatically.

## How Event Orchestration Works

Event Orchestration processes incoming events through a series of rules organized in a router and multiple service-level rule sets. The router decides which PagerDuty service receives each event. Then, within each service, additional rules can modify severity, add context, or suppress the event entirely.

Think of it as a traffic controller for your alerts. Every alert from GCP enters the orchestration, gets classified, enriched, and sent to the right destination.

## Setting Up the GCP to PagerDuty Pipeline

First, create a PagerDuty integration key for Google Cloud Monitoring.

### Create PagerDuty Services

Set up PagerDuty services that map to your team structure or service ownership.

```bash
# Using PagerDuty API to create services
# Create a service for the infrastructure team
curl -X POST "https://api.pagerduty.com/services" \
  -H "Authorization: Token token=YOUR_PD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": {
      "name": "GCP Infrastructure",
      "description": "Compute, networking, and storage alerts",
      "escalation_policy": {"id": "POLICY_ID", "type": "escalation_policy_reference"},
      "alert_creation": "create_alerts_and_incidents"
    }
  }'
```

### Connect GCP Cloud Monitoring to PagerDuty

Create a notification channel in Cloud Monitoring that sends to PagerDuty.

```bash
# Create a PagerDuty notification channel in Cloud Monitoring
gcloud alpha monitoring channels create \
  --type=pagerduty \
  --display-name="PagerDuty - GCP Infrastructure" \
  --channel-labels=service_key=YOUR_PAGERDUTY_INTEGRATION_KEY
```

Now create alerting policies that use this channel.

```bash
# Example: Alert policy for high CPU on Compute Engine instances
gcloud alpha monitoring policies create \
  --display-name="High CPU - Compute Engine" \
  --condition-display-name="CPU above 90%" \
  --condition-filter='resource.type="gce_instance" AND metric.type="compute.googleapis.com/instance/cpu/utilization"' \
  --condition-threshold-value=0.9 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --documentation-content="High CPU detected on GCE instance. Check for runaway processes or scaling needs."
```

## Configuring Event Orchestration Rules

Now the interesting part. In PagerDuty, set up Event Orchestration rules that process incoming GCP alerts intelligently.

### The Global Router

The global router looks at every incoming event and decides which service should handle it.

```json
{
  "orchestration_path": {
    "sets": [
      {
        "id": "start",
        "rules": [
          {
            "label": "Route GKE alerts to Kubernetes team",
            "conditions": [
              {
                "expression": "event.custom_details.resource_type matches 'k8s_*' or event.custom_details.resource_type matches 'gke_*'"
              }
            ],
            "actions": {
              "route_to": "SERVICE_ID_KUBERNETES_TEAM"
            }
          },
          {
            "label": "Route Cloud SQL alerts to database team",
            "conditions": [
              {
                "expression": "event.custom_details.resource_type matches 'cloudsql_*'"
              }
            ],
            "actions": {
              "route_to": "SERVICE_ID_DATABASE_TEAM"
            }
          },
          {
            "label": "Route networking alerts to platform team",
            "conditions": [
              {
                "expression": "event.custom_details.resource_type matches 'https_lb_rule' or event.custom_details.metric_type matches 'loadbalancing*'"
              }
            ],
            "actions": {
              "route_to": "SERVICE_ID_PLATFORM_TEAM"
            }
          }
        ]
      }
    ],
    "catch_all": {
      "actions": {
        "route_to": "SERVICE_ID_DEFAULT_ONCALL"
      }
    }
  }
}
```

### Service-Level Rules for Deduplication

Within each service, set up rules to deduplicate related alerts. When a GKE node goes down, you do not want separate alerts for each pod that was running on it.

```json
{
  "orchestration_path": {
    "sets": [
      {
        "id": "start",
        "rules": [
          {
            "label": "Deduplicate GKE node alerts",
            "conditions": [
              {
                "expression": "event.custom_details.resource_type == 'gke_cluster' and event.summary matches part 'node'"
              }
            ],
            "actions": {
              "alert_grouping": {
                "type": "content_based",
                "configuration": {
                  "fields": ["event.custom_details.cluster_name"]
                },
                "time_window": 600
              }
            }
          },
          {
            "label": "Suppress transient CPU spikes during deployments",
            "conditions": [
              {
                "expression": "event.custom_details.metric_type matches '*cpu*' and event.custom_details.policy_name matches '*deployment*'"
              }
            ],
            "actions": {
              "suppress": true
            }
          },
          {
            "label": "Escalate critical database alerts immediately",
            "conditions": [
              {
                "expression": "event.custom_details.resource_type matches 'cloudsql*' and event.severity == 'critical'"
              }
            ],
            "actions": {
              "severity": "critical",
              "priority": "P1",
              "annotate": {
                "notes": "Critical database alert - check Cloud SQL instance health immediately"
              }
            }
          }
        ]
      }
    ]
  }
}
```

### Time-Based Rules

Suppress low-priority alerts during maintenance windows or outside business hours.

```json
{
  "label": "Suppress info-level alerts during nightly maintenance",
  "conditions": [
    {
      "expression": "event.severity == 'info' and now matches 'Mon-Fri 02:00:00-04:00:00 America/Los_Angeles'"
    }
  ],
  "actions": {
    "suppress": true
  }
}
```

## Adding Context with Event Transforms

Raw GCP alerts often lack the context an on-call engineer needs. Use Event Orchestration to enrich alerts with runbook links, ownership information, and actionable next steps.

```json
{
  "label": "Enrich Cloud SQL alerts with runbook and context",
  "conditions": [
    {
      "expression": "event.custom_details.resource_type matches 'cloudsql*'"
    }
  ],
  "actions": {
    "annotate": {
      "notes": "Runbook: https://wiki.internal/runbooks/cloudsql\nDashboard: https://console.cloud.google.com/sql/instances?project=my-project"
    },
    "variables": [
      {
        "name": "instance_name",
        "path": "event.custom_details.resource_labels.database_id",
        "type": "regex",
        "value": ".*:(.*)"
      }
    ],
    "event_action": "trigger",
    "severity": "{{#if (event.custom_details.metric_value > 90)}}critical{{else}}warning{{/if}}"
  }
}
```

## Testing Your Orchestration

Before relying on the orchestration in production, test it by sending synthetic events.

```bash
# Send a test event through the PagerDuty Events API v2
curl -X POST "https://events.pagerduty.com/v2/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "YOUR_ORCHESTRATION_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test: High CPU on GCE instance my-instance-01",
      "severity": "warning",
      "source": "Google Cloud Monitoring",
      "custom_details": {
        "resource_type": "gce_instance",
        "metric_type": "compute.googleapis.com/instance/cpu/utilization",
        "metric_value": 95,
        "project_id": "my-project",
        "resource_labels": {
          "instance_id": "12345",
          "zone": "us-central1-a"
        }
      }
    }
  }'
```

Verify the event lands in the correct PagerDuty service with the expected severity and annotations.

## Measuring the Impact

After running Event Orchestration for a few weeks, measure the improvement. Track the number of incidents per on-call shift before and after. Look at the percentage of alerts that get suppressed or deduplicated. Monitor your mean time to acknowledge and resolve.

In practice, teams that implement intelligent event orchestration typically see a 40-60% reduction in alert noise. That translates directly to happier on-call engineers and faster response times for real incidents.

Event Orchestration turns your chaotic stream of GCP alerts into a structured incident management pipeline. The investment in setting up rules pays off quickly, especially as your GCP environment grows and alert volume increases.
