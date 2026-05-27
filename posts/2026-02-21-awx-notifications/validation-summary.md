# Validation Summary: How to Set Up AWX Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWX
- Ansible
- awx.awx Ansible collection
- AWX notification templates
- Slack notifications
- Email notifications
- Webhook notifications
- PagerDuty notifications
- Microsoft Teams webhooks
- AWX REST API
- curl

## Sources Consulted
- AWX Notifications user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/notifications.html
- awx.awx.notification_template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/notification_template_module.html
- awx.awx.job_template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/job_template_module.html
- awx.awx.workflow_job_template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/workflow_job_template_module.html
- AWX OpenAPI reference for notification template test endpoint: https://docs.ansible.com/projects/awx/en/latest/open_api/explorer.html
- Microsoft Teams Incoming Webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook

## Issues Found
- AWX does not list Microsoft Teams as a native notification type. Changed the introductory claim to say Teams is handled through webhooks.
- The examples used the top-level `url` variable in several custom message fields. Changed these to `job.url`, matching the documented custom notification examples.
- The webhook custom message examples used JSON strings as `body` values. Changed them to dictionary bodies, because AWX documents webhook and PagerDuty message bodies as dictionary definitions.
- The PagerDuty example omitted `subdomain`, which AWX documents as a PagerDuty notification configuration field. Added a placeholder subdomain.
- The Teams example used an old concrete `outlook.office.com/webhook` placeholder URL. Replaced it with a generic Teams webhook URL placeholder and kept the example as an AWX webhook notification.

## Review Notes
Microsoft 365 Connectors are nearing deprecation according to Microsoft documentation. Teams webhook setups should prefer the current Teams Workflows webhook path where appropriate, but the AWX side remains a generic webhook notification.
