# Validation Summary: How to Send ArgoCD Notifications to Email

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps and Secrets
- Kubernetes `kubectl` annotations and logs
- SMTP email delivery
- Gmail SMTP, AWS SES, SendGrid, and Exchange SMTP
- Argo CD notification templates, triggers, subscriptions, and `oncePer`

## Sources Consulted
- Argo CD Email notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD Notification templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notification triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Triggers and Templates Catalog: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/
- Argo Project notifications-engine source for email template fields and HTML option: https://github.com/argoproj/notifications-engine

## Issues Found
- The HTML email templates used `content-type: text/html` under `email`. Argo CD email templates support `subject` and `body`; HTML mode is controlled by the email service `html` boolean. Removed the unsupported `content-type` fields and updated the text to say `html: true` must be set in the email service.
- The trigger expressions accessed `app.status.operationState.phase` directly. The official Argo CD trigger examples use optional access, `app.status?.operationState.phase`, because `operationState` may be absent before an operation has run. Updated both trigger examples and the `oncePer` example.
- The multiple-recipient annotation comment said recipients were comma-separated, but Argo CD subscription annotations use semicolon-separated recipients. Updated the comment to match the command and official documentation.

## Review Notes
The post is technically relevant and the remaining examples match current Argo CD notification behavior. For future improvement, the article could show a complete HTML-enabled `service.email` block with `html: true` next to the HTML template, but the corrected text now states the required setting.
