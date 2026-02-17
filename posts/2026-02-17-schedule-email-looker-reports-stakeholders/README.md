# How to Schedule and Email Looker Reports to Stakeholders Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Looker, Scheduled Reports, Email Delivery, Dashboards, Automation, LookML

Description: A complete guide to scheduling Looker dashboards and looks for automatic email delivery to stakeholders on a recurring basis.

---

Not everyone wants to log into Looker to check numbers. Executives want their KPI report in their inbox every Monday morning. The sales team wants their pipeline update daily. The ops team wants an alert when error rates cross a threshold. Looker's scheduling feature handles all of these scenarios by automatically running reports and delivering them via email, Slack, webhooks, or cloud storage.

This guide covers how to set up scheduled deliveries that work reliably and stay useful over time.

## Scheduling a Dashboard

To schedule a dashboard for email delivery:

1. Open the dashboard in Looker
2. Click the gear icon in the top right
3. Select "Schedule"
4. Configure the schedule settings

Here are the key settings:

**Recipients:** Add email addresses. You can use individual emails or distribution lists. Recipients do not need Looker accounts if you choose the right format.

**Schedule:** Set the frequency:
- Hourly (every N hours)
- Daily (at a specific time)
- Weekly (on specific days at a specific time)
- Monthly (on a specific date at a specific time)
- Custom cron expression for complex schedules

**Format:** Choose how the content is delivered:
- Inline table - Data rendered as an HTML table in the email body
- Visualization - Charts rendered as images in the email
- PDF attachment - Full dashboard as a PDF file
- CSV attachment - Raw data as a CSV (for Looks, not dashboards)

**Filters:** Apply filters to the scheduled run. This lets you send the same dashboard to different recipients with different filters (e.g., regional managers each getting their own region's data).

## Scheduling a Look

Looks (saved queries) can also be scheduled. The process is similar:

1. Open the Look
2. Click the gear icon
3. Select "Schedule"

Looks offer additional format options that dashboards do not:

- **CSV** - Comma-separated values
- **Excel** - Native Excel spreadsheet
- **Google Sheets** - Writes directly to a Google Sheet
- **JSON** - Raw JSON format (useful for API integrations)

## Creating a Schedule via the API

For programmatic schedule management, use the Looker API:

```python
import looker_sdk

def create_dashboard_schedule(dashboard_id, recipients, cron_tab):
    """Create a scheduled plan for a Looker dashboard."""
    sdk = looker_sdk.init40()

    # Define the schedule
    schedule = looker_sdk.models40.WriteScheduledPlan(
        name=f"Weekly Dashboard Report - {dashboard_id}",
        dashboard_id=dashboard_id,
        crontab=cron_tab,
        enabled=True,
        run_as_recipient=False,
        include_links=True,
        scheduled_plan_destination=[
            looker_sdk.models40.ScheduledPlanDestination(
                format="wysiwyg_pdf",
                apply_formatting=True,
                apply_vis=True,
                address=email,
                type="email",
            )
            for email in recipients
        ],
    )

    created = sdk.create_scheduled_plan(body=schedule)
    print(f"Schedule created: {created.id}")
    return created

# Schedule a dashboard to be sent every Monday at 8 AM ET
create_dashboard_schedule(
    dashboard_id=42,
    recipients=["exec-team@company.com", "vp-sales@company.com"],
    cron_tab="0 8 * * 1 America/New_York"
)
```

## Scheduling with Filters

One of the most useful patterns is sending the same dashboard to different people with different filters applied. A regional sales dashboard sent to each regional manager showing only their region's data.

### Manual Filter Scheduling

1. Schedule the dashboard as normal
2. In the schedule dialog, click "Filters"
3. Set the filter values for this schedule
4. Save the schedule
5. Create another schedule for the next set of filters

### Automated Multi-Filter Scheduling via API

```python
import looker_sdk

def schedule_regional_reports(dashboard_id, regions_and_recipients):
    """Create one schedule per region, each with different filters."""
    sdk = looker_sdk.init40()

    for region, recipients in regions_and_recipients.items():
        schedule = looker_sdk.models40.WriteScheduledPlan(
            name=f"Regional Report - {region}",
            dashboard_id=dashboard_id,
            crontab="0 8 * * 1 America/New_York",
            enabled=True,
            # Apply the region filter
            filters_string=f"Region={region}",
            scheduled_plan_destination=[
                looker_sdk.models40.ScheduledPlanDestination(
                    format="wysiwyg_pdf",
                    apply_formatting=True,
                    apply_vis=True,
                    address=email,
                    type="email",
                )
                for email in recipients
            ],
        )

        created = sdk.create_scheduled_plan(body=schedule)
        print(f"Created schedule for {region}: {created.id}")

# Define who gets what
regions = {
    "West": ["west-manager@company.com", "west-team@company.com"],
    "East": ["east-manager@company.com"],
    "Central": ["central-manager@company.com"],
    "International": ["intl-manager@company.com"],
}

schedule_regional_reports(dashboard_id=42, regions_and_recipients=regions)
```

## Sending to Slack

Looker integrates with Slack for schedule delivery:

1. In the schedule dialog, choose "Slack" as the destination
2. Select the Slack workspace and channel
3. Choose the format (visualization, data table, or PDF)

For Slack, inline visualizations work better than PDFs because they show up directly in the channel without requiring a download.

## Sending to Cloud Storage

For data pipeline integrations, send scheduled results to GCS or S3:

1. In the schedule dialog, choose "Amazon S3" or another storage destination
2. Configure the bucket, path, and credentials

This is useful for:
- Automated data exports
- Feeding Looker results into other systems
- Creating audit trails of report snapshots

## Conditional Delivery

Sometimes you only want to send a report when there is something to report. Looker supports conditional delivery:

1. In the schedule dialog, look for "Send this schedule"
2. Choose "Only if results have changed since last run"
3. Or choose "Only if results are not empty"

This prevents flooding inboxes with empty or unchanged reports.

For threshold-based alerts, schedule a Look with a filter that only returns results when the condition is met:

```sql
-- Look SQL: Only returns rows when error rate exceeds 5%
SELECT
  service_name,
  error_count,
  total_requests,
  error_count / total_requests AS error_rate
FROM service_metrics
WHERE error_count / total_requests > 0.05
  AND metric_date = CURRENT_DATE()
```

Set the schedule to "Only send if results are not empty." The email is only sent when the error rate threshold is breached.

## Managing Schedules at Scale

When you have dozens of schedules, management becomes important.

### Listing All Schedules

```python
import looker_sdk

def list_all_schedules():
    """List all scheduled plans in the Looker instance."""
    sdk = looker_sdk.init40()
    schedules = sdk.all_scheduled_plans(all_users=True)

    for s in schedules:
        print(f"ID: {s.id}, Name: {s.name}, "
              f"Cron: {s.crontab}, Enabled: {s.enabled}, "
              f"Dashboard: {s.dashboard_id}, "
              f"Last Run: {s.last_run_at}")

list_all_schedules()
```

### Disabling Schedules for Maintenance

```python
def disable_all_schedules():
    """Temporarily disable all scheduled plans."""
    sdk = looker_sdk.init40()
    schedules = sdk.all_scheduled_plans(all_users=True)

    for s in schedules:
        if s.enabled:
            sdk.update_scheduled_plan(
                s.id,
                body=looker_sdk.models40.WriteScheduledPlan(enabled=False)
            )
            print(f"Disabled: {s.name}")

def enable_all_schedules():
    """Re-enable all scheduled plans."""
    sdk = looker_sdk.init40()
    schedules = sdk.all_scheduled_plans(all_users=True)

    for s in schedules:
        if not s.enabled:
            sdk.update_scheduled_plan(
                s.id,
                body=looker_sdk.models40.WriteScheduledPlan(enabled=True)
            )
            print(f"Enabled: {s.name}")
```

## Monitoring Schedule Health

Failed schedules can go unnoticed for weeks. Set up monitoring:

```python
def check_failed_schedules():
    """Find schedules that failed on their last run."""
    sdk = looker_sdk.init40()
    schedules = sdk.all_scheduled_plans(all_users=True)

    failed = []
    for s in schedules:
        if s.enabled and s.last_run_at:
            # Check the job status of the most recent run
            jobs = sdk.scheduled_plan_run_once_by_id(s.id)
            # Log any failures for investigation
            if hasattr(s, 'last_run_at'):
                failed.append({
                    'id': s.id,
                    'name': s.name,
                    'last_run': s.last_run_at
                })

    return failed
```

You can also check schedule history through Looker's System Activity:

1. Go to Admin, then Scheduler
2. View the schedule history
3. Filter for failed runs
4. Check error messages

Common failure reasons:
- Recipient email address is invalid
- Dashboard no longer exists
- Underlying data source has errors
- Slack channel was deleted or renamed
- Schedule owner lost access to the data

## Best Practices

**Set appropriate times.** Schedule reports for when recipients are likely to read them. A Monday morning KPI email at 8 AM local time works better than one at midnight.

**Use PDF for executives.** Executives often read reports on mobile or in email clients that do not render HTML well. PDF attachments are the most reliable format.

**Include context.** Add text tiles to your dashboard that explain what the numbers mean. The scheduled email is often read without the context of a live conversation.

**Review schedules quarterly.** Schedules accumulate over time. Unused schedules waste compute resources and clutter inboxes. Review and clean up regularly.

**Test before committing.** Use "Send test" to see what the email looks like before saving the schedule. Check formatting on both desktop and mobile email clients.

## Wrapping Up

Scheduled reports are how Looker insights reach people who do not log into Looker. The scheduling system is flexible enough to handle everything from simple weekly emails to complex multi-filter regional reports. The key to long-term success is treating schedules as managed infrastructure - monitor for failures, review regularly, and clean up what is no longer needed. Start with one or two high-value schedules and expand based on stakeholder feedback.
