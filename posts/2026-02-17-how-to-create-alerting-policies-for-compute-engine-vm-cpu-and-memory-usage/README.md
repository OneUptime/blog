# How to Create Alerting Policies for Compute Engine VM CPU and Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Cloud Monitoring, Alerting, Virtual Machines

Description: Learn how to create Cloud Monitoring alerting policies for Compute Engine VM CPU and memory usage to catch performance issues before they impact users.

---

If you are running applications on Compute Engine VMs, you need to know when things start going sideways. CPU maxing out, memory running low - these are the early warning signs that precede outages. Cloud Monitoring makes it straightforward to set up alerting policies for these metrics, and in this post I will walk through every method: the console, gcloud CLI, API, and Terraform.

## Understanding Compute Engine Metrics

Compute Engine VMs automatically report metrics to Cloud Monitoring. The two most important ones for this discussion are:

- **CPU utilization** (`compute.googleapis.com/instance/cpu/utilization`): Reported as a fraction between 0 and 1, representing the percentage of allocated CPU being used. A value of 0.85 means 85 percent utilization.

- **Memory utilization** (`agent.googleapis.com/memory/percent_used`): This one requires the Ops Agent. Unlike CPU, memory usage is not collected automatically - you need the monitoring agent installed on the VM.

### Installing the Ops Agent for Memory Metrics

If you have not installed the Ops Agent yet, here is how to do it on a single VM:

```bash
# Install the Ops Agent on a Compute Engine VM
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

For fleet-wide installation, use the VM Manager OS policy:

```bash
# Create an OS policy assignment to install Ops Agent on all VMs
gcloud compute os-config os-policy-assignments create install-ops-agent \
  --project=my-project \
  --location=us-central1-a \
  --file=ops-agent-policy.yaml
```

The policy YAML file:

```yaml
# OS policy to install the Ops Agent across a fleet
osPolicies:
  - id: install-ops-agent
    mode: ENFORCEMENT
    resourceGroups:
      - resources:
          - id: add-repo
            exec:
              validate:
                interpreter: SHELL
                script: |
                  if systemctl is-active google-cloud-ops-agent; then
                    exit 100
                  fi
                  exit 101
              enforce:
                interpreter: SHELL
                script: |
                  curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
                  bash add-google-cloud-ops-agent-repo.sh --also-install
                  exit 100
instanceFilter:
  all: true
rollout:
  disruptionBudget:
    percent: 20
  minWaitDuration: 60s
```

## Creating CPU Utilization Alerts

### Method 1: Cloud Console

1. Go to **Monitoring** > **Alerting** > **Create Policy**
2. Click **Add Condition**
3. Search for the metric: `Compute Engine VM Instance - CPU utilization`
4. Under **Transform Data**:
   - Rolling window: 5 minutes
   - Rolling window function: Mean
5. Under **Configure Alert Trigger**:
   - Condition type: Threshold
   - Threshold: 0.85
   - For: 5 minutes
6. Add notification channels and create

### Method 2: gcloud CLI

Define the policy in JSON:

```json
{
  "displayName": "Compute Engine VM - High CPU Utilization",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "CPU utilization above 85%",
      "conditionThreshold": {
        "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.85,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN",
            "crossSeriesReducer": "REDUCE_NONE"
          }
        ],
        "trigger": {
          "count": 1
        }
      }
    }
  ],
  "notificationChannels": [],
  "documentation": {
    "content": "CPU utilization on a Compute Engine VM has exceeded 85% for more than 5 minutes. Check running processes and consider scaling up the instance or adding more VMs behind a load balancer.",
    "mimeType": "text/markdown"
  }
}
```

Create the policy:

```bash
# Create the CPU alert policy from the JSON file
gcloud alpha monitoring policies create --policy-from-file=vm-cpu-alert.json
```

### Method 3: Terraform

```hcl
# Compute Engine CPU utilization alert
resource "google_monitoring_alert_policy" "vm_cpu" {
  display_name = "VM High CPU Utilization"
  combiner     = "OR"

  conditions {
    display_name = "CPU above 85%"

    condition_threshold {
      filter          = "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_NONE"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]

  documentation {
    content   = "CPU utilization has exceeded 85%. Investigate the workload and consider scaling."
    mime_type = "text/markdown"
  }
}
```

## Creating Memory Utilization Alerts

Memory alerts use the Ops Agent metric, so the metric path is different from CPU.

### JSON Policy Definition

```json
{
  "displayName": "Compute Engine VM - High Memory Usage",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Memory usage above 90%",
      "conditionThreshold": {
        "filter": "resource.type=\"gce_instance\" AND metric.type=\"agent.googleapis.com/memory/percent_used\" AND metric.labels.state=\"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 90,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN",
            "crossSeriesReducer": "REDUCE_NONE"
          }
        ]
      }
    }
  ],
  "documentation": {
    "content": "Memory usage on a Compute Engine VM has exceeded 90%. The VM may be at risk of OOM kills. Consider identifying memory-hungry processes or upgrading the machine type.",
    "mimeType": "text/markdown"
  }
}
```

Note the `metric.labels.state=\"used\"` filter. The memory metric has multiple states (used, buffered, cached, free). You want to alert on the "used" state specifically.

### Terraform for Memory Alerts

```hcl
# Compute Engine memory utilization alert (requires Ops Agent)
resource "google_monitoring_alert_policy" "vm_memory" {
  display_name = "VM High Memory Usage"
  combiner     = "OR"

  conditions {
    display_name = "Memory above 90%"

    condition_threshold {
      filter          = "resource.type=\"gce_instance\" AND metric.type=\"agent.googleapis.com/memory/percent_used\" AND metric.labels.state=\"used\""
      comparison      = "COMPARISON_GT"
      threshold_value = 90
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_NONE"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email.name
  ]
}
```

## Scoping Alerts to Specific VMs

In many environments, you do not want the same thresholds for every VM. A batch processing server might regularly hit 95 percent CPU and that is fine, while an API server hitting 85 percent is concerning.

You can scope alerts to specific VMs using resource labels:

```json
{
  "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\" AND resource.labels.instance_id=\"1234567890\""
}
```

Or use metadata labels if you tag your VMs:

```json
{
  "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\" AND metadata.system_labels.name=starts_with(\"api-server\")"
}
```

## Setting Up Multi-Condition Alerts

Sometimes you want an alert that only fires when multiple conditions are true simultaneously. For example, alert only when both CPU and memory are high:

```json
{
  "displayName": "VM Under Resource Pressure",
  "combiner": "AND",
  "conditions": [
    {
      "displayName": "CPU above 80%",
      "conditionThreshold": {
        "filter": "resource.type=\"gce_instance\" AND metric.type=\"compute.googleapis.com/instance/cpu/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.80,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    },
    {
      "displayName": "Memory above 85%",
      "conditionThreshold": {
        "filter": "resource.type=\"gce_instance\" AND metric.type=\"agent.googleapis.com/memory/percent_used\" AND metric.labels.state=\"used\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 85,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ]
}
```

Notice the `combiner` is set to `AND` instead of `OR`. This means both conditions must be true for the alert to fire.

## Choosing the Right Thresholds

Here are the thresholds I typically use as starting points:

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Utilization | 75% | 90% |
| Memory Usage | 80% | 95% |

These are starting points. Adjust based on your workload patterns. If your VMs normally run at 60 percent CPU, an 85 percent alert gives you reasonable lead time. If they normally run at 20 percent, even 50 percent might indicate a problem.

## Wrapping Up

CPU and memory alerting for Compute Engine VMs is foundational monitoring. Without it, you are flying blind. The key steps are: install the Ops Agent for memory metrics, create threshold-based alerting policies, and set thresholds that give you enough lead time to act before an outage. Whether you use the console, gcloud, or Terraform, the end result is the same - early warning when your VMs are under stress.
