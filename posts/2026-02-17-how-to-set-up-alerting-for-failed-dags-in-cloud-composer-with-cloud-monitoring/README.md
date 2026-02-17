# How to Set Up Alerting for Failed DAGs in Cloud Composer with Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Cloud Monitoring, Alerting, Airflow

Description: Learn how to configure Cloud Monitoring alerts for failed DAGs in Google Cloud Composer so you get notified immediately when your Airflow pipelines break.

---

Running Apache Airflow on Cloud Composer is convenient, but DAGs fail. Data sources go down, schemas change without notice, and sometimes your code just has a bug. The real question is how quickly you find out about it. If you are checking the Airflow UI manually every morning, you are already behind. Setting up proper alerting through Cloud Monitoring ensures you know about failures within minutes, not hours.

This guide covers how to create alerting policies that trigger when DAGs fail in Cloud Composer, including notification channels, alert conditions, and some practical patterns for avoiding alert fatigue.

## How Cloud Composer Exposes Metrics

Cloud Composer automatically exports metrics to Cloud Monitoring under the `composer.googleapis.com` namespace. These metrics cover environment health, DAG runs, task instances, and resource utilization. For alerting on DAG failures, the key metrics are:

- `composer.googleapis.com/workflow/run_count` - Count of DAG runs, labeled by state (success, failed)
- `composer.googleapis.com/workflow/task/run_count` - Count of task runs by state
- `composer.googleapis.com/environment/healthy` - Overall environment health

You do not need to install any additional agents or configure any exporters. These metrics are available as soon as your Composer environment is running.

## Setting Up a Notification Channel

Before creating alert policies, you need at least one notification channel. This is where alerts get sent when they fire.

Navigate to Cloud Monitoring, then go to Alerting and click on "Edit Notification Channels." You can configure several types:

- Email
- Slack
- PagerDuty
- SMS
- Webhooks
- Pub/Sub (for programmatic handling)

For most teams, Slack plus PagerDuty works well. Slack for informational alerts, PagerDuty for critical ones that need immediate response.

You can also set up channels with the gcloud CLI:

```bash
# Create an email notification channel
gcloud beta monitoring channels create \
  --type=email \
  --display-name="Data Platform Team Email" \
  --channel-labels=email_address=data-team@example.com
```

## Creating an Alert Policy for Failed DAG Runs

The most important alert to set up is one that fires when any DAG run fails. Here is how to do it through the Console:

1. Go to Cloud Monitoring and select Alerting
2. Click "Create Policy"
3. For the metric, search for `composer.googleapis.com/workflow/run_count`
4. Add a filter for `state = failed`
5. Set the aggregation to "sum" with a 5-minute alignment period
6. Set the condition to "is above" with a threshold of 0
7. Set the duration to "most recent value"
8. Add your notification channels
9. Give the policy a descriptive name

Here is the same thing using Terraform, which is the recommended approach for managing alert policies as code:

```hcl
# Alert policy for failed DAG runs in Cloud Composer
resource "google_monitoring_alert_policy" "composer_dag_failure" {
  display_name = "Cloud Composer - DAG Run Failed"
  combiner     = "OR"

  conditions {
    display_name = "DAG run failure detected"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_composer_environment"
        AND metric.type = "composer.googleapis.com/workflow/run_count"
        AND metric.labels.state = "failed"
      EOT

      # Sum failures over 5-minute windows
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.name,
    google_monitoring_notification_channel.pagerduty.name,
  ]

  alert_strategy {
    auto_close = "1800s"  # Auto-close after 30 minutes
  }

  documentation {
    content   = "A DAG run has failed in Cloud Composer. Check the Airflow UI for details."
    mime_type = "text/markdown"
  }
}
```

## Alerting on Specific High-Priority DAGs

Not all DAGs are equally important. Your revenue-critical ETL pipeline failing at 2 AM deserves a PagerDuty alert. A development DAG that someone left running in production probably does not.

You can filter alerts by DAG ID using the `workflow_name` label:

```hcl
# Alert only for critical DAGs
resource "google_monitoring_alert_policy" "critical_dag_failure" {
  display_name = "Critical DAG Failure - Revenue Pipeline"
  combiner     = "OR"

  conditions {
    display_name = "Critical DAG failure"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_composer_environment"
        AND metric.type = "composer.googleapis.com/workflow/run_count"
        AND metric.labels.state = "failed"
        AND metric.labels.workflow_name = monitoring.regex.full_match("(revenue_etl|billing_sync|customer_export)")
      EOT

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
  ]
}
```

## Alerting on Task-Level Failures

Sometimes a DAG run succeeds overall because of retry logic, but individual tasks are failing repeatedly. This is a sign of an underlying problem. You can alert on task failures separately:

```hcl
# Alert when tasks are failing frequently, even if DAGs eventually succeed
resource "google_monitoring_alert_policy" "task_failure_rate" {
  display_name = "Cloud Composer - High Task Failure Rate"
  combiner     = "OR"

  conditions {
    display_name = "Task failure rate too high"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_composer_environment"
        AND metric.type = "composer.googleapis.com/workflow/task/run_count"
        AND metric.labels.state = "failed"
      EOT

      aggregations {
        alignment_period   = "3600s"
        per_series_aligner = "ALIGN_SUM"
      }

      # Alert if more than 10 task failures in an hour
      comparison      = "COMPARISON_GT"
      threshold_value = 10
      duration        = "0s"

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack.name,
  ]
}
```

## Alerting on Environment Health

Beyond individual DAG failures, you should monitor the overall health of your Composer environment. If the scheduler goes down or the database becomes unresponsive, all DAGs are affected.

```hcl
# Alert when the Composer environment becomes unhealthy
resource "google_monitoring_alert_policy" "composer_unhealthy" {
  display_name = "Cloud Composer - Environment Unhealthy"
  combiner     = "OR"

  conditions {
    display_name = "Environment health check failed"

    condition_threshold {
      filter = <<-EOT
        resource.type = "cloud_composer_environment"
        AND metric.type = "composer.googleapis.com/environment/healthy"
      EOT

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      # Health metric is 1 for healthy, 0 for unhealthy
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "300s"  # Must be unhealthy for 5 minutes
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.pagerduty.name,
  ]

  documentation {
    content   = "The Cloud Composer environment is unhealthy. Check scheduler, database, and worker status."
    mime_type = "text/markdown"
  }
}
```

## Implementing Callback-Based Alerts from DAG Code

For more granular control, you can send alerts directly from your DAG code using Airflow callbacks. This lets you include specific error details in the notification:

```python
# DAG with failure callbacks that send alerts with detailed context
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.operators.pubsub import PubSubPublishMessageOperator
from datetime import datetime, timedelta
import json

def on_failure_callback(context):
    """Send a detailed failure notification via Pub/Sub."""
    dag_id = context['dag'].dag_id
    task_id = context['task_instance'].task_id
    execution_date = str(context['execution_date'])
    exception = str(context.get('exception', 'Unknown error'))

    # Build a structured alert message
    message = {
        'severity': 'ERROR',
        'dag_id': dag_id,
        'task_id': task_id,
        'execution_date': execution_date,
        'error': exception,
        'log_url': context['task_instance'].log_url,
    }
    return message

default_args = {
    'owner': 'data-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'on_failure_callback': on_failure_callback,
}

with DAG(
    'revenue_etl',
    default_args=default_args,
    schedule_interval='@hourly',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:
    pass  # Your tasks here
```

## Avoiding Alert Fatigue

A common mistake is alerting on everything and ending up with so many notifications that the team starts ignoring them. Here are some strategies:

1. **Tier your alerts**: Use PagerDuty for P0 issues (environment down, critical DAG failed), Slack for P1 (non-critical DAG failed), and email for P2 (high retry rate, performance degradation).

2. **Add meaningful duration windows**: Do not alert on a single transient failure. Require the condition to persist for a few minutes before firing.

3. **Group related alerts**: If 20 DAGs fail because the database is down, you want one alert about the database, not 20 alerts about individual DAGs.

4. **Include runbooks in alert documentation**: Every alert policy in Cloud Monitoring supports a documentation field. Put troubleshooting steps there so the on-call engineer knows what to do.

5. **Review and prune regularly**: Set a monthly reminder to review your alerting policies. Remove alerts that have never fired or are consistently ignored.

## Testing Your Alerts

After setting up alert policies, verify they work. You can trigger a test DAG failure intentionally:

```python
# Simple DAG that always fails, useful for testing alerting
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

with DAG('test_alerting_failure', start_date=datetime(2026, 1, 1), schedule_interval=None) as dag:

    def fail_task():
        raise Exception("This is a test failure for alerting validation")

    test_fail = PythonOperator(task_id='intentional_failure', python_callable=fail_task)
```

Trigger this DAG manually, then check that your notification channels receive the alert within the expected timeframe.

## Wrapping Up

Setting up alerting for failed DAGs in Cloud Composer is one of the first things you should do after deploying a production environment. Cloud Monitoring makes it straightforward with built-in Composer metrics. Start with a broad DAG failure alert, then add targeted alerts for critical pipelines and environment health. Use Terraform to manage your alert policies as code, and invest time in tuning thresholds to avoid alert fatigue. Your on-call engineers will thank you.
