# Validation Summary: How to Set Up Retry Policies for Failed Tasks in Cloud Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Tasks
- Google Cloud CLI (`gcloud`)
- HTTP task handlers
- Node.js / Express
- Cloud Firestore Node.js client
- Google Cloud Pub/Sub Node.js client

## Sources Consulted
- Google Cloud Tasks: Configure Cloud Tasks queues: https://docs.cloud.google.com/tasks/docs/configuring-queues
- Google Cloud Tasks: Create HTTP target tasks: https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks
- Google Cloud Tasks REST API: Queue `RetryConfig`: https://docs.cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues
- Google Cloud Tasks REST API: Task resource fields: https://cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks
- Google Cloud SDK: `gcloud tasks queues create`: https://cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- Google Cloud SDK: `gcloud tasks list`: https://cloud.google.com/sdk/gcloud/reference/tasks/list
- Google Cloud Pub/Sub: Publish message overview: https://cloud.google.com/pubsub/docs/publish-message-overview
- Google Cloud Firestore Node.js client reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/overview

## Issues Found
- Corrected the description of `max-retry-duration`. The original text said no more retries are scheduled after the duration passes from the first attempt. Official Cloud Tasks documentation says that when `max-attempts` is finite and `max-retry-duration` is greater than zero, Cloud Tasks stops retrying only when both limits are satisfied. The post now states this nuance and separately explains the `max-attempts=-1` case.
- Clarified the "unlimited retries" queue comment to "unlimited attempts" because `max-attempts=-1` is still bounded by `max-retry-duration` unless the duration is set to `0`.
- Updated the payment handler example to pass a provider-level idempotency key to `chargeCustomer`. The previous check-then-charge-then-record flow could double-charge if the charge succeeded but recording the processed payment failed before Cloud Tasks retried the task.
- Fixed the progressive retry dead-letter call to pass a task name and error object matching the later `saveToDeadLetter(taskName, payload, error)` helper signature.

## Review Notes
The `gcloud` CLI is not installed in this workspace, so command verification was performed against the official Google Cloud SDK reference rather than local `--help` output.
