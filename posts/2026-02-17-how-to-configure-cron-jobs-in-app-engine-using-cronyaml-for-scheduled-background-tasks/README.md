# How to Configure Cron Jobs in App Engine Using cron.yaml for Scheduled Background Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Cron Jobs, cron.yaml, Scheduling, Background Tasks

Description: Learn how to set up scheduled background tasks in App Engine using cron.yaml to run reports, clean up data, send emails, and perform recurring maintenance.

---

Every application has tasks that need to run on a schedule. Daily reports, cache cleanup, sending digest emails, refreshing API tokens, checking for stale data - the list goes on. App Engine has a built-in cron service that lets you schedule HTTP requests to your application at regular intervals, and it is configured through a simple `cron.yaml` file.

The App Engine cron service is reliable, free (you only pay for the request execution), and requires zero infrastructure to manage. No separate scheduler to run, no message queues to configure - just define your schedule and App Engine handles the rest.

## Basic cron.yaml Structure

Create a `cron.yaml` file in the root of your App Engine project:

```yaml
# cron.yaml - Schedule background tasks for App Engine
cron:
  # Generate a daily report at 2 AM UTC
  - description: "Daily Report Generator"
    url: /tasks/generate-daily-report
    schedule: every day 02:00
    target: default

  # Clean up expired sessions every hour
  - description: "Session Cleanup"
    url: /tasks/cleanup-sessions
    schedule: every 1 hours
    target: default

  # Send weekly digest emails on Monday morning
  - description: "Weekly Digest Email"
    url: /tasks/send-weekly-digest
    schedule: every monday 09:00
    timezone: America/New_York
    target: default
```

Deploy the cron configuration:

```bash
# Deploy the cron.yaml configuration
gcloud app deploy cron.yaml
```

## Schedule Syntax

App Engine cron uses a custom schedule syntax that is readable but different from Unix cron. Here are the common patterns.

Simple intervals:

```yaml
cron:
  # Every 5 minutes
  - url: /tasks/heartbeat
    schedule: every 5 minutes

  # Every 2 hours
  - url: /tasks/sync-data
    schedule: every 2 hours

  # Every 24 hours (same as daily)
  - url: /tasks/daily-task
    schedule: every 24 hours
```

Specific times:

```yaml
cron:
  # Every day at midnight UTC
  - url: /tasks/midnight-job
    schedule: every day 00:00

  # Every day at 3:30 PM UTC
  - url: /tasks/afternoon-job
    schedule: every day 15:30

  # First day of every month at 6 AM
  - url: /tasks/monthly-report
    schedule: 1 of month 06:00
```

Day-specific schedules:

```yaml
cron:
  # Every weekday at 9 AM
  - url: /tasks/weekday-job
    schedule: every monday,tuesday,wednesday,thursday,friday 09:00

  # Every Saturday at 4 AM
  - url: /tasks/weekend-cleanup
    schedule: every saturday 04:00

  # First and fifteenth of each month
  - url: /tasks/bimonthly-job
    schedule: 1,15 of month 00:00
```

## Setting the Timezone

By default, cron jobs run in UTC. Specify a timezone if you need local time scheduling:

```yaml
cron:
  # Run at 9 AM Eastern Time (handles daylight saving automatically)
  - description: "Morning Report"
    url: /tasks/morning-report
    schedule: every day 09:00
    timezone: America/New_York

  # Run at 6 PM Pacific Time
  - description: "EOD Summary"
    url: /tasks/eod-summary
    schedule: every day 18:00
    timezone: America/Los_Angeles
```

## Handling Cron Requests in Your Application

App Engine sends cron requests as regular HTTP GET requests to the URLs you specify. Your application needs handlers for these URLs.

Here is a Python (Flask) example:

```python
# main.py - Cron job handlers for App Engine
from flask import Flask, request, abort
import logging

app = Flask(__name__)

@app.route('/tasks/generate-daily-report')
def generate_daily_report():
    """Handler for the daily report cron job."""
    # Verify the request came from App Engine cron
    if not request.headers.get('X-Appengine-Cron'):
        abort(403)

    logging.info("Starting daily report generation...")

    # Your report logic here
    generate_report()
    send_report_email()

    logging.info("Daily report completed.")
    return 'OK', 200


@app.route('/tasks/cleanup-sessions')
def cleanup_sessions():
    """Handler for the session cleanup cron job."""
    if not request.headers.get('X-Appengine-Cron'):
        abort(403)

    # Delete sessions older than 24 hours
    deleted_count = delete_expired_sessions(hours=24)
    logging.info(f"Cleaned up {deleted_count} expired sessions.")
    return 'OK', 200


@app.route('/tasks/send-weekly-digest')
def send_weekly_digest():
    """Handler for the weekly email digest."""
    if not request.headers.get('X-Appengine-Cron'):
        abort(403)

    users = get_users_with_digest_enabled()
    for user in users:
        send_digest_email(user)

    logging.info(f"Sent weekly digest to {len(users)} users.")
    return 'OK', 200
```

Here is a Node.js (Express) example:

```javascript
// app.js - Cron job handlers for App Engine in Node.js
const express = require('express');
const app = express();

// Middleware to verify cron requests
function verifyCron(req, res, next) {
    // Only allow requests from App Engine cron service
    if (req.headers['x-appengine-cron'] !== 'true') {
        return res.status(403).send('Forbidden');
    }
    next();
}

// Daily report endpoint
app.get('/tasks/generate-daily-report', verifyCron, async (req, res) => {
    try {
        await generateDailyReport();
        console.log('Daily report generated successfully');
        res.status(200).send('OK');
    } catch (error) {
        console.error('Report generation failed:', error);
        res.status(500).send('Error');
    }
});

// Session cleanup endpoint
app.get('/tasks/cleanup-sessions', verifyCron, async (req, res) => {
    const count = await cleanupExpiredSessions();
    console.log(`Cleaned up ${count} sessions`);
    res.status(200).send('OK');
});
```

## Securing Cron Endpoints

It is important to verify that cron requests actually come from App Engine and not from someone hitting the URL directly. The `X-Appengine-Cron` header is set to `true` by App Engine and cannot be spoofed from external requests.

You can also restrict these URLs in your `app.yaml`:

```yaml
# app.yaml - Restrict cron task URLs to admin users
handlers:
  - url: /tasks/.*
    script: auto
    login: admin
```

The `login: admin` setting ensures that only App Engine system requests (like cron) and project admins can access these URLs.

## Targeting Specific Services

If your App Engine application has multiple services, you can direct cron jobs to specific services:

```yaml
cron:
  # Run on the default service
  - url: /tasks/generate-report
    schedule: every day 02:00
    target: default

  # Run on a dedicated worker service
  - url: /tasks/process-queue
    schedule: every 5 minutes
    target: worker

  # Run on the API service
  - url: /tasks/refresh-cache
    schedule: every 1 hours
    target: api
```

## Retry Configuration

If a cron job fails (returns a non-2xx response), App Engine does not retry by default. For jobs that need reliability, implement retry logic in your handler, or use Cloud Tasks for more sophisticated retry behavior.

```python
# Cron handler with built-in retry logic
@app.route('/tasks/important-job')
def important_job():
    if not request.headers.get('X-Appengine-Cron'):
        abort(403)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            perform_important_work()
            return 'OK', 200
        except Exception as e:
            logging.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                logging.error("All retries exhausted")
                return 'Failed', 500
            time.sleep(2 ** attempt)  # Exponential backoff
```

## Viewing and Managing Cron Jobs

Check your deployed cron configuration:

```bash
# View all configured cron jobs
gcloud app cron-jobs list
```

View cron execution logs in the Cloud Console under App Engine > Cron jobs, or query Cloud Logging:

```bash
# View cron job execution logs
gcloud logging read \
  'resource.type="gae_app" AND protoPayload.resource="/tasks/"' \
  --limit=20
```

## Removing Cron Jobs

To remove all cron jobs, deploy an empty cron.yaml:

```yaml
# cron.yaml - Empty configuration removes all cron jobs
cron:
```

```bash
gcloud app deploy cron.yaml
```

To remove specific jobs, just remove them from the file and redeploy.

## Limitations and Workarounds

App Engine cron has some limitations:

- Minimum interval is 1 minute
- Maximum of 250 cron jobs per application
- No built-in support for job dependencies or complex workflows
- The cron request has the same timeout as regular requests (60 seconds for Standard automatic scaling)

For long-running tasks, use the cron job as a trigger that enqueues work to Cloud Tasks:

```python
# Use cron to trigger work that gets processed by Cloud Tasks
from google.cloud import tasks_v2

@app.route('/tasks/batch-process')
def batch_process():
    if not request.headers.get('X-Appengine-Cron'):
        abort(403)

    # Create tasks for each item to process
    client = tasks_v2.CloudTasksClient()
    queue_path = client.queue_path('my-project', 'us-central1', 'my-queue')

    items = get_items_to_process()
    for item in items:
        task = {
            'app_engine_http_request': {
                'http_method': 'POST',
                'relative_uri': f'/worker/process-item/{item.id}',
            }
        }
        client.create_task(parent=queue_path, task=task)

    return f'Enqueued {len(items)} tasks', 200
```

App Engine cron is one of those features that just works. It is dead simple to configure, costs nothing extra to run, and handles the operational burden of keeping your scheduled tasks on time. For straightforward scheduling needs, it is hard to beat.
