# Validation Summary: How to Automate Security Incident Response with Google Cloud Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workflows
- Pub/Sub
- Eventarc
- Terraform
- IAM REST API
- Compute Engine REST API
- Cloud Logging API
- Cloud Storage JSON API
- BigQuery insertAll API
- Cloud Functions for Python
- Secret Manager
- Slack webhooks
- PagerDuty Events API v2

## Sources Consulted
- Google Cloud Workflows: Trigger a workflow with events or Pub/Sub messages: https://docs.cloud.google.com/workflows/docs/trigger-workflow-eventarc
- Eventarc: Route Pub/Sub events to Workflows: https://cloud.google.com/eventarc/standard/docs/workflows/route-trigger-cloud-pubsub
- Eventarc: Create triggers with Terraform: https://cloud.google.com/eventarc/docs/creating-triggers-terraform
- Terraform Registry: google_eventarc_trigger: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/eventarc_trigger
- Google Cloud Workflows Pub/Sub quickstart and event payload example: https://docs.cloud.google.com/eventarc/standard/docs/workflows/quickstart-pubsub
- Google Cloud Workflows syntax, calls, subworkflows, HTTP requests, and standard library: https://docs.cloud.google.com/workflows/docs/reference/syntax
- IAM REST API service account and key methods: https://docs.cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts and https://docs.cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts.keys
- Compute Engine REST API for instances.stop, machineImages.insert, and firewalls: https://docs.cloud.google.com/compute/docs/reference/rest/v1/
- Cloud Logging entries.list and logging query language: https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/entries/list and https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Cloud Storage JSON API object upload: https://docs.cloud.google.com/storage/docs/uploading-objects
- PagerDuty Events API v2 documentation: https://support.pagerduty.com/main/docs/event-orchestration

## Issues Found
- The original Terraform used a Pub/Sub push subscription pointed at `google_workflows_workflow.incident_response.url`. Workflows should be triggered from Pub/Sub through Eventarc, so the snippet now uses `google_eventarc_trigger` with `google.cloud.pubsub.topic.v1.messagePublished`, a Workflows destination, and the existing Pub/Sub topic as transport.
- The workflow parsed `event.data` directly. Eventarc Pub/Sub events pass the Pub/Sub payload at `event.data.message.data`, so the parse step now decodes that field.
- The workflow called undefined `send_page` and `send_notification` subworkflows. It now calls a defined `send_notification` subworkflow that invokes the notification Cloud Function over HTTP with OIDC authentication.
- The high-severity branch used a brittle override check and skipped evidence collection. It now safely checks the optional `override` field and collects evidence after the review delay path.
- The Compute Engine containment example attempted to snapshot an instance URL with a disk `createSnapshot` method. It now stops the instance and creates a machine image from the instance resource, which matches the Compute Engine API.
- The service account key revocation step listed all key types, including Google-managed keys. It now filters for `USER_MANAGED` keys before deletion.
- The firewall rule used `IPProtocol: "all"`, which is not listed as a valid REST API protocol value in the Compute Engine firewall resource docs. It now denies common exfiltration protocols with separate `tcp`, `udp`, and `icmp` deny rules.
- The evidence collection filter used a raw Unix timestamp and only matched `resource.labels.instance_id`. It now formats the timestamp with `time.format` and also matches `protoPayload.resourceName` for non-VM resources such as service accounts.
- The evidence result assumed `logs_response.body.entries` always exists. It now uses `default(map.get(...), [])` to handle empty result sets.
- The Python notification function referenced an undefined PagerDuty helper and used only `GCP_PROJECT` for project discovery. It now includes `send_pagerduty_alert` and checks `GOOGLE_CLOUD_PROJECT` first, falling back to `GCP_PROJECT`.
- The subworkflow snippets were presented as separate YAML files even though Workflows subworkflows must be deployed in the same workflow definition. The comments and surrounding text now say to add them to the same workflow file.

## Review Notes
The snippets are still illustrative and omit IAM role bindings, API enablement, Cloud Function deployment, BigQuery dataset/table creation, and forensics bucket creation. Those are deployment prerequisites rather than errors in the shown workflow logic.
