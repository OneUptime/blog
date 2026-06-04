# Validation Summary: How to Use Harbor Webhook Notifications for Image Push Events

## Status
validated

## Post Type
Short technical guide

## Technologies Covered
- Harbor
- Webhook notifications
- HTTP/HTTPS webhook endpoints
- Slack incoming webhooks
- Container image registry events

## Sources Consulted
- Harbor documentation: Configure Webhook Notifications, https://goharbor.io/docs/2.14.0/working-with-projects/project-configuration/configure-webhooks/
- CloudEvents specification, https://cloudevents.io/

## Issues Found
- The post said Harbor webhooks can "customize payloads" and "verify signatures for security." Current Harbor documentation describes selecting the HTTP payload format as `Default` or `CloudEvents`, and configuring an authentication header if the listener implements authentication. It does not document arbitrary payload customization or a built-in webhook signature verification mechanism. Updated the sentence to say users can select event types and payload formats, and use HTTPS plus an authentication header when required.

## Review Notes
The remaining high-level claims are consistent with Harbor documentation: webhooks are configured per project, support HTTP and Slack endpoint types, can subscribe to selected event types such as artifact push, scan completion, quota exceeded, and replication, and can trigger downstream CI/CD or security automation.
