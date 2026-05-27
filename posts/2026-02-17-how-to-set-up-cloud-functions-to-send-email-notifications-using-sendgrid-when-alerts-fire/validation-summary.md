# Validation Summary: How to Set Up Cloud Functions to Send Email Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run functions / Cloud Functions gen2
- Google Cloud Pub/Sub
- Google Cloud Secret Manager
- Google Cloud CLI
- Node.js
- Python
- Twilio SendGrid Mail Send API
- SendGrid Node.js and Python helper libraries

## Sources Consulted
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Secret Manager create secret documentation: https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Cloud Run functions event-driven function documentation: https://cloud.google.com/run/docs/write-functions
- Google Cloud Run functions local Pub/Sub CloudEvent example: https://cloud.google.com/functions/docs/running/direct
- Google Cloud Pub/Sub publish messages documentation: https://cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub message format reference: https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage
- Google Cloud Run functions runtime support schedule: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud functions best practices for email and SendGrid: https://cloud.google.com/functions/docs/bestpractices/tips
- Twilio SendGrid Mail Send API reference: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
- Official SendGrid Node.js helper library repository: https://github.com/sendgrid/sendgrid-nodejs
- SendGrid Python helper package documentation: https://pypi.org/project/sendgrid/

## Issues Found
- The post stated that Google Cloud does not allow direct SMTP connections from Cloud Functions. Google Cloud's current documentation is narrower: Cloud Run functions do not allow outbound connections on port 25, while other SMTP ports such as 465 or 587 can be used depending on the provider and networking configuration. Updated the statement to refer specifically to non-secure SMTP on port 25.
- The deployment command used `--runtime=nodejs20`. Google Cloud lists Node.js 20 for Cloud Run functions as deprecated as of 2026-04-30, with decommission scheduled for 2026-10-30. Updated the command to `--runtime=nodejs24`, which is a current supported runtime.
- The Python example called `build_html(alert, severity)` without defining it, so the snippet would fail at runtime. Added a minimal `build_html` helper and removed the unused `Content` import.
- The Python recipient parsing could include an empty recipient when `ALERT_RECIPIENTS` was unset or had trailing commas. Added a simple truthy filter to match the filtering already used in the Node.js example.

## Review Notes
The JavaScript examples use current CloudEvents-style Functions Framework handlers for Pub/Sub events, and the Pub/Sub `publishMessage` example correctly passes message data as a Node.js `Buffer`. The SendGrid Node.js fields shown in the post match the helper library's documented camelCase input style for Mail Send API properties. For production hardening, the HTML-building examples should consistently escape alert-supplied values and use persistent throttling storage if throttling must work across scaled instances.
