# How to Set Up AWX Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWX, Notifications, Slack, Email

Description: Configure AWX notification templates for Slack, email, webhooks, and PagerDuty to alert on job success, failure, and approval requests.

---

AWX can send notifications when jobs start, succeed, fail, or require approval. This is essential for any team using AWX in production because you need to know when deployments complete, when patching finishes, and especially when something fails. AWX supports multiple notification channels including email, Slack, Microsoft Teams, PagerDuty, webhooks, and more. This post covers setting up each type and attaching them to job templates and workflows.

## Notification Flow

```mermaid
graph LR
    A[Job Template / Workflow] --> B{Event}
    B -->|Started| C[Notification Template]
    B -->|Success| C
    B -->|Failure| C
    B -->|Approval| C
    C --> D[Slack]
    C --> E[Email]
    C --> F[Webhook]
    C --> G[PagerDuty]
```

Notifications are configured in two steps:
1. Create a notification template (defines the channel and message format)
2. Attach the template to a job template or workflow (defines when to send)

## Email Notifications

```yaml
# create-notifications.yml
---
- name: Configure AWX Notifications
  hosts: localhost
  connection: local
  collections:
    - awx.awx

  vars:
    awx_host: "https://awx.example.com"
    awx_token: "{{ lookup('env', 'AWX_TOKEN') }}"

  tasks:
    - name: Create email notification
      awx.awx.notification_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "Email - Operations Team"
        description: "Send email notifications to the ops team"
        organization: "Default"
        notification_type: email
        notification_configuration:
          host: "smtp.example.com"
          port: 587
          username: "awx@example.com"
          password: "{{ lookup('env', 'SMTP_PASSWORD') }}"
          use_tls: true
          use_ssl: false
          sender: "awx@example.com"
          recipients:
            - "ops-team@example.com"
            - "devops-lead@example.com"
        messages:
          started:
            message: "AWX Job Started: {{ '{{' }} job.name {{ '}}' }}"
            body: >
              Job "{{ '{{' }} job.name {{ '}}' }}" has started.
              Job ID: {{ '{{' }} job.id {{ '}}' }}
              Started by: {{ '{{' }} job.created_by {{ '}}' }}
              URL: {{ '{{' }} url {{ '}}' }}
          success:
            message: "AWX Job Succeeded: {{ '{{' }} job.name {{ '}}' }}"
            body: >
              Job "{{ '{{' }} job.name {{ '}}' }}" completed successfully.
              Job ID: {{ '{{' }} job.id {{ '}}' }}
              Duration: {{ '{{' }} job.elapsed {{ '}}' }} seconds
              URL: {{ '{{' }} url {{ '}}' }}
          error:
            message: "AWX Job FAILED: {{ '{{' }} job.name {{ '}}' }}"
            body: >
              Job "{{ '{{' }} job.name {{ '}}' }}" has FAILED.
              Job ID: {{ '{{' }} job.id {{ '}}' }}
              Duration: {{ '{{' }} job.elapsed {{ '}}' }} seconds
              URL: {{ '{{' }} url {{ '}}' }}
              Please investigate immediately.
        state: present
```

## Slack Notifications

```yaml
    - name: Create Slack notification
      awx.awx.notification_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "Slack - DevOps Channel"
        description: "Post notifications to #devops Slack channel"
        organization: "Default"
        notification_type: slack
        notification_configuration:
          token: "{{ lookup('env', 'SLACK_BOT_TOKEN') }}"
          channels:
            - "#devops"
            - "#deployments"
        messages:
          started:
            message: >
              :rocket: *Job Started*: {{ '{{' }} job.name {{ '}}' }}
              Launched by: {{ '{{' }} job.created_by {{ '}}' }}
              <{{ '{{' }} url {{ '}}' }}|View Job>
          success:
            message: >
              :white_check_mark: *Job Succeeded*: {{ '{{' }} job.name {{ '}}' }}
              Duration: {{ '{{' }} job.elapsed {{ '}}' }}s
              <{{ '{{' }} url {{ '}}' }}|View Job>
          error:
            message: >
              :x: *Job FAILED*: {{ '{{' }} job.name {{ '}}' }}
              Duration: {{ '{{' }} job.elapsed {{ '}}' }}s
              <{{ '{{' }} url {{ '}}' }}|View Job> - Please investigate!
        state: present
```

## Webhook Notifications

Webhooks send a POST request with job data to any URL. This is flexible and works with any system that accepts HTTP callbacks.

```yaml
    - name: Create webhook notification
      awx.awx.notification_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "Webhook - Monitoring System"
        description: "Send job events to monitoring webhook"
        organization: "Default"
        notification_type: webhook
        notification_configuration:
          url: "https://monitoring.example.com/api/webhook/awx"
          headers:
            Content-Type: "application/json"
            Authorization: "Bearer {{ lookup('env', 'WEBHOOK_TOKEN') }}"
          http_method: "POST"
        messages:
          started:
            body: >
              {"event": "job_started", "job_name": "{{ '{{' }} job.name {{ '}}' }}", "job_id": {{ '{{' }} job.id {{ '}}' }}}
          success:
            body: >
              {"event": "job_success", "job_name": "{{ '{{' }} job.name {{ '}}' }}", "job_id": {{ '{{' }} job.id {{ '}}' }}, "duration": {{ '{{' }} job.elapsed {{ '}}' }}}
          error:
            body: >
              {"event": "job_failure", "job_name": "{{ '{{' }} job.name {{ '}}' }}", "job_id": {{ '{{' }} job.id {{ '}}' }}, "duration": {{ '{{' }} job.elapsed {{ '}}' }}}
        state: present
```

## PagerDuty Notifications

For critical job failures that need immediate attention.

```yaml
    - name: Create PagerDuty notification
      awx.awx.notification_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "PagerDuty - Critical Alerts"
        description: "Page on-call for critical job failures"
        organization: "Default"
        notification_type: pagerduty
        notification_configuration:
          token: "{{ lookup('env', 'PAGERDUTY_TOKEN') }}"
          service_key: "{{ lookup('env', 'PAGERDUTY_SERVICE_KEY') }}"
          client_name: "AWX"
        state: present
```

## Microsoft Teams Notifications

```yaml
    - name: Create Teams notification
      awx.awx.notification_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "Teams - Infrastructure"
        description: "Post to Infrastructure Teams channel"
        organization: "Default"
        notification_type: webhook
        notification_configuration:
          url: "https://outlook.office.com/webhook/your-webhook-url"
          http_method: "POST"
          headers:
            Content-Type: "application/json"
        messages:
          success:
            body: >
              {"@type": "MessageCard", "summary": "AWX Job Succeeded", "themeColor": "00FF00",
               "title": "Job Succeeded: {{ '{{' }} job.name {{ '}}' }}",
               "text": "Duration: {{ '{{' }} job.elapsed {{ '}}' }}s. [View Job]({{ '{{' }} url {{ '}}' }})"}
          error:
            body: >
              {"@type": "MessageCard", "summary": "AWX Job Failed", "themeColor": "FF0000",
               "title": "Job FAILED: {{ '{{' }} job.name {{ '}}' }}",
               "text": "Duration: {{ '{{' }} job.elapsed {{ '}}' }}s. [View Job]({{ '{{' }} url {{ '}}' }})"}
        state: present
```

## Attaching Notifications to Job Templates

After creating notification templates, attach them to job templates to define when they trigger.

```yaml
    - name: Attach notifications to deployment template
      awx.awx.job_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "Deploy Web Application"
        notification_templates_started:
          - "Slack - DevOps Channel"
        notification_templates_success:
          - "Slack - DevOps Channel"
          - "Email - Operations Team"
        notification_templates_error:
          - "Slack - DevOps Channel"
          - "Email - Operations Team"
          - "PagerDuty - Critical Alerts"
        state: present

    - name: Attach notifications to backup template
      awx.awx.job_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "Backup Databases"
        # Only notify on failure for routine jobs
        notification_templates_error:
          - "Slack - DevOps Channel"
          - "PagerDuty - Critical Alerts"
        state: present
```

## Attaching Notifications to Workflows

Workflows support the same notification attachment plus approval notifications.

```yaml
    - name: Attach notifications to workflow
      awx.awx.workflow_job_template:
        controller_host: "{{ awx_host }}"
        controller_oauthtoken: "{{ awx_token }}"
        name: "Full Deployment Pipeline"
        notification_templates_started:
          - "Slack - DevOps Channel"
        notification_templates_success:
          - "Slack - DevOps Channel"
          - "Email - Operations Team"
        notification_templates_error:
          - "Slack - DevOps Channel"
          - "PagerDuty - Critical Alerts"
        notification_templates_approvals:
          - "Slack - DevOps Channel"
          - "Email - Operations Team"
        state: present
```

## Testing Notifications

Always test notification templates before relying on them.

```bash
# Test a notification template via API
curl -X POST "https://awx.example.com/api/v2/notification_templates/1/test/" \
  -H "Authorization: Bearer $AWX_TOKEN"

# Check the test result
curl -s "https://awx.example.com/api/v2/notification_templates/1/notifications/" \
  -H "Authorization: Bearer $AWX_TOKEN" | jq '.results[0].status'
```

## Creating Notifications via the API

```bash
# Create a Slack notification template
curl -X POST "https://awx.example.com/api/v2/notification_templates/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AWX_TOKEN" \
  -d '{
    "name": "Slack Alerts",
    "organization": 1,
    "notification_type": "slack",
    "notification_configuration": {
      "token": "xoxb-your-slack-token",
      "channels": ["#alerts"]
    }
  }'
```

## Notification Strategy

Not every job needs every notification type. Here is a sensible strategy:

| Job Type | Started | Success | Failure |
|---|---|---|---|
| Deployments | Slack | Slack + Email | Slack + Email + PagerDuty |
| Backups | None | None | Slack + PagerDuty |
| Patching | Slack | Slack + Email | Slack + Email + PagerDuty |
| Health Checks | None | None | PagerDuty |
| Development Jobs | None | None | Slack |

The goal is to avoid notification fatigue while making sure critical failures get attention immediately. Routine success notifications for things like backups just create noise. Save the aggressive notifications (PagerDuty) for failures that need immediate human intervention.

AWX notifications turn your automation platform into a communication hub. When configured thoughtfully, they keep the team informed about deployments, alert on failures, and make approval workflows visible. Start with Slack or email for general notifications and add PagerDuty for critical job failures.
