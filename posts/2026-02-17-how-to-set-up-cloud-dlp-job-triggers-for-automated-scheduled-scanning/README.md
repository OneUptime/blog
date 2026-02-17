# How to Set Up Cloud DLP Job Triggers for Automated Scheduled Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, Job Triggers, Automation, Data Security

Description: Learn how to create Cloud DLP job triggers that automatically scan your BigQuery tables and Cloud Storage buckets on a schedule to continuously detect sensitive data.

---

Running DLP scans manually works for one-off checks, but it does not scale. New data arrives constantly - nightly ETL loads, real-time streaming pipelines, file uploads from partners. You need scanning that runs automatically and regularly to catch sensitive data as it flows into your systems.

Cloud DLP job triggers let you schedule inspection jobs that run on a cadence you define. Set it up once, and DLP scans your data stores automatically - daily, weekly, or at whatever interval makes sense for your data flow.

## What Are Job Triggers?

A job trigger is a Cloud DLP resource that contains:

- An inspection job configuration (what to scan, what to look for)
- A schedule (how often to run)
- Optional conditions (like minimum time between scans)

When the trigger fires, it creates a DLP job that runs just like a manually created one. Results go wherever you configure them - BigQuery, Pub/Sub, or Cloud Security Command Center.

## Step 1: Create a Basic Job Trigger

Let us start with a trigger that scans a BigQuery dataset daily for PII:

```python
from google.cloud import dlp_v2

def create_daily_scan_trigger(project_id, dataset_id, table_id):
    """Create a job trigger that scans a BigQuery table daily for PII."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Define the inspection configuration
    inspect_config = {
        "info_types": [
            {"name": "EMAIL_ADDRESS"},
            {"name": "PHONE_NUMBER"},
            {"name": "US_SOCIAL_SECURITY_NUMBER"},
            {"name": "CREDIT_CARD_NUMBER"},
            {"name": "PERSON_NAME"},
        ],
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        "limits": {
            "max_findings_per_request": 5000,
        },
    }

    # Point to the BigQuery table
    storage_config = {
        "big_query_options": {
            "table_reference": {
                "project_id": project_id,
                "dataset_id": dataset_id,
                "table_id": table_id,
            },
            "rows_limit": 100000,
            "sample_method": "RANDOM_START",
        }
    }

    # Define what to do with findings
    actions = [
        {
            # Save findings to a BigQuery table
            "save_findings": {
                "output_config": {
                    "table": {
                        "project_id": project_id,
                        "dataset_id": "dlp_scan_results",
                        "table_id": f"{table_id}_findings",
                    }
                }
            }
        },
        {
            # Also publish to Pub/Sub for real-time alerting
            "pub_sub": {
                "topic": f"projects/{project_id}/topics/dlp-findings"
            }
        },
    ]

    # Configure the trigger with a daily schedule
    job_trigger = {
        "inspect_job": {
            "inspect_config": inspect_config,
            "storage_config": storage_config,
            "actions": actions,
        },
        "triggers": [
            {
                "schedule": {
                    # Run every 24 hours
                    "recurrence_period_duration": {"seconds": 86400}
                }
            }
        ],
        "display_name": f"Daily scan: {dataset_id}.{table_id}",
        "description": f"Automated daily PII scan for {dataset_id}.{table_id}",
        "status": "HEALTHY",
    }

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.create_job_trigger(
        parent=parent,
        job_trigger=job_trigger,
        trigger_id=f"daily-scan-{dataset_id}-{table_id}",
    )

    print(f"Created job trigger: {response.name}")
    return response

create_daily_scan_trigger("my-project", "analytics", "user_events")
```

## Step 2: Create a Cloud Storage Scanning Trigger

For scanning files in Cloud Storage on a weekly basis:

```python
def create_gcs_scan_trigger(project_id, bucket_name, prefix):
    """Create a trigger that scans Cloud Storage files weekly."""

    dlp_client = dlp_v2.DlpServiceClient()

    inspect_config = {
        "info_types": [
            {"name": "EMAIL_ADDRESS"},
            {"name": "PHONE_NUMBER"},
            {"name": "US_SOCIAL_SECURITY_NUMBER"},
            {"name": "CREDIT_CARD_NUMBER"},
            {"name": "PERSON_NAME"},
            {"name": "STREET_ADDRESS"},
        ],
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
    }

    # Configure Cloud Storage source
    storage_config = {
        "cloud_storage_options": {
            "file_set": {
                "url": f"gs://{bucket_name}/{prefix}"
            },
            # Only scan certain file types
            "file_types": ["TEXT_FILE", "CSV", "JSON"],
            # Limit per-file scanning to 5MB
            "bytes_limit_per_file": 5242880,
        },
        # Only scan files modified since the last scan
        "timespan_config": {
            "enable_auto_population_of_timespan_config": True,
        },
    }

    actions = [
        {
            "save_findings": {
                "output_config": {
                    "table": {
                        "project_id": project_id,
                        "dataset_id": "dlp_scan_results",
                        "table_id": "gcs_findings",
                    }
                }
            }
        },
        {
            # Send findings to Security Command Center
            "publish_summary_to_cscc": {}
        },
    ]

    job_trigger = {
        "inspect_job": {
            "inspect_config": inspect_config,
            "storage_config": storage_config,
            "actions": actions,
        },
        "triggers": [
            {
                "schedule": {
                    # Run weekly (7 days)
                    "recurrence_period_duration": {"seconds": 604800}
                }
            }
        ],
        "display_name": f"Weekly GCS scan: {bucket_name}/{prefix}",
        "status": "HEALTHY",
    }

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.create_job_trigger(
        parent=parent,
        job_trigger=job_trigger,
        trigger_id=f"weekly-gcs-{bucket_name.replace('.', '-')}",
    )

    print(f"Created GCS trigger: {response.name}")
    return response
```

Notice the `timespan_config` with `enable_auto_population_of_timespan_config` set to `True`. This tells DLP to only scan files modified since the last run, which is critical for efficiency on buckets that grow over time.

## Step 3: Use Templates with Triggers

For consistency, reference inspection templates in your triggers instead of inline configs:

```python
def create_trigger_with_template(project_id, template_id, dataset_id, table_id):
    """Create a trigger that uses an inspection template."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Reference the template instead of defining inline config
    inspect_template = f"projects/{project_id}/locations/global/inspectTemplates/{template_id}"

    storage_config = {
        "big_query_options": {
            "table_reference": {
                "project_id": project_id,
                "dataset_id": dataset_id,
                "table_id": table_id,
            }
        }
    }

    job_trigger = {
        "inspect_job": {
            "inspect_template_name": inspect_template,
            "storage_config": storage_config,
            "actions": [
                {
                    "save_findings": {
                        "output_config": {
                            "table": {
                                "project_id": project_id,
                                "dataset_id": "dlp_results",
                                "table_id": f"{table_id}_scan",
                            }
                        }
                    }
                }
            ],
        },
        "triggers": [
            {
                "schedule": {
                    "recurrence_period_duration": {"seconds": 86400}
                }
            }
        ],
        "display_name": f"Template scan: {table_id}",
        "status": "HEALTHY",
    }

    parent = f"projects/{project_id}/locations/global"
    response = dlp_client.create_job_trigger(
        parent=parent,
        job_trigger=job_trigger,
    )

    print(f"Created trigger: {response.name}")
    return response
```

## Step 4: Manage Triggers with gcloud

You can also manage triggers from the command line:

```bash
# List all job triggers in a project
gcloud dlp job-triggers list --project=PROJECT_ID

# Describe a specific trigger
gcloud dlp job-triggers describe \
  projects/PROJECT_ID/locations/global/jobTriggers/daily-scan-analytics-user-events

# Pause a trigger (stop scheduled runs)
gcloud dlp job-triggers update \
  projects/PROJECT_ID/locations/global/jobTriggers/daily-scan-analytics-user-events \
  --status=PAUSED

# Resume a paused trigger
gcloud dlp job-triggers update \
  projects/PROJECT_ID/locations/global/jobTriggers/daily-scan-analytics-user-events \
  --status=HEALTHY

# Delete a trigger
gcloud dlp job-triggers delete \
  projects/PROJECT_ID/locations/global/jobTriggers/old-trigger
```

## Step 5: Terraform Configuration

Define triggers in Terraform for version-controlled infrastructure:

```hcl
# Job trigger for daily BigQuery scanning
resource "google_data_loss_prevention_job_trigger" "daily_bq_scan" {
  parent       = "projects/${var.project_id}/locations/global"
  display_name = "Daily BigQuery PII Scan"
  description  = "Scans customer data tables daily for PII"

  triggers {
    schedule {
      recurrence_period_duration = "86400s"
    }
  }

  inspect_job {
    inspect_template_name = google_data_loss_prevention_inspect_template.standard_pii.id

    storage_config {
      big_query_options {
        table_reference {
          project_id = var.project_id
          dataset_id = "customer_data"
          table_id   = "orders"
        }
        rows_limit    = 100000
        sample_method = "RANDOM_START"
      }
    }

    actions {
      save_findings {
        output_config {
          table {
            project_id = var.project_id
            dataset_id = "dlp_results"
            table_id   = "orders_findings"
          }
        }
      }
    }

    actions {
      pub_sub {
        topic = google_pubsub_topic.dlp_alerts.id
      }
    }
  }
}
```

## Step 6: Monitor Trigger Health

Keep an eye on your triggers to make sure they are running successfully:

```python
def check_trigger_health(project_id):
    """List all triggers and check their last run status."""

    dlp_client = dlp_v2.DlpServiceClient()
    parent = f"projects/{project_id}/locations/global"

    # List all triggers
    triggers = dlp_client.list_job_triggers(request={"parent": parent})

    for trigger in triggers:
        print(f"\nTrigger: {trigger.display_name}")
        print(f"  Status: {trigger.status.name}")
        print(f"  Last run: {trigger.last_run_time}")

        # Check if the last job had errors
        if trigger.errors:
            for error in trigger.errors:
                print(f"  ERROR: {error.details}")

        # List recent jobs from this trigger
        jobs = dlp_client.list_dlp_jobs(
            request={
                "parent": parent,
                "filter": f'trigger_name="{trigger.name}"',
                "type_": dlp_v2.DlpJobType.INSPECT_JOB,
            }
        )

        for job in jobs:
            print(f"  Job {job.name}: {job.state.name}")

check_trigger_health("my-project")
```

## Tips for Production Use

**Set appropriate scan intervals.** Daily scans make sense for tables that receive new data daily. Weekly or monthly is fine for archival storage. Match the scan frequency to how often the data changes.

**Use incremental scanning.** The `timespan_config` option for Cloud Storage triggers only scans newly modified files. This dramatically reduces costs and scan time. For BigQuery, consider using identifying fields or timestamp columns to focus on new rows.

**Send findings to multiple destinations.** Save detailed findings to BigQuery for analysis, push to Pub/Sub for real-time alerts, and publish to Security Command Center for your SOC team. Each audience needs information in a different format.

**Set up alerts on trigger failures.** If a trigger fails (permissions changed, table was deleted), you want to know about it. Use Cloud Monitoring to alert on DLP job failures.

**Control costs with sampling and limits.** For large datasets, use `rows_limit` for BigQuery and `bytes_limit_per_file` for Cloud Storage. Sampling is usually sufficient for detecting the presence of sensitive data.

## Summary

Cloud DLP job triggers automate your sensitive data scanning so you do not have to run one-off jobs manually. Configure triggers with the right schedule for your data flows, use templates for consistent inspection configurations, enable incremental scanning for efficiency, and monitor trigger health to catch failures. Automated scanning gives you continuous visibility into where sensitive data lives in your GCP environment.
