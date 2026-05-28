# Validation Summary: How to Build an Event-Driven Architecture on GCP Using Eventarc Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Eventarc
- Eventarc Publishing API
- Cloud Workflows
- Cloud Run
- Cloud Storage direct events
- Google Cloud CLI
- Node.js
- Express
- CloudEvents
- IAM service accounts and roles

## Sources Consulted
- Eventarc Publishing API REST reference: https://docs.cloud.google.com/eventarc/docs/reference/publishing/rest/v1/projects.locations.channels/publishEvents
- Eventarc Publishing Node.js client reference: https://docs.cloud.google.com/nodejs/docs/reference/eventarc-publishing/latest
- Eventarc CloudEvents JSON format: https://cloud.google.com/eventarc/docs/cloudevents-json
- Eventarc trigger CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Eventarc channel CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/channels/create
- Workflows Eventarc trigger documentation: https://docs.cloud.google.com/workflows/docs/trigger-workflow-eventarc
- Workflows HTTP/OIDC request documentation: https://docs.cloud.google.com/workflows/docs/http-requests
- Cloud Run service identity documentation: https://docs.cloud.google.com/run/docs/securing/service-identity
- Cloud Run service-to-service authentication documentation: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Cloud Storage events to Cloud Run with Eventarc: https://docs.cloud.google.com/eventarc/standard/docs/run/route-trigger-cloud-storage
- Eventarc IAM roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/eventarc
- Eventarc retry behavior: https://docs.cloud.google.com/eventarc/docs/retry-events
- Cloud Run logs CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/logs/read

## Issues Found
- The Node.js publishing sample imported `EventarcPublisherClient`, but the current `@google-cloud/eventarc-publishing` client exposes `PublisherClient`. Updated the import and instantiation.
- The publishing samples used an invalid `events[].textData` shape and `specVersion` field. Updated the Node.js and Workflows examples to publish CloudEvents JSON strings through `textEvents`, using the CloudEvents `specversion` field and a `data` payload.
- The workflow decoded `event.data` as a JSON string even though Eventarc passes the CloudEvent to Workflows as a JSON object and the corrected published event carries an object payload. Updated the workflow to assign `order` from `event.data`.
- The setup created service accounts but did not use or grant them the permissions required to publish events and invoke private services. Added Eventarc Publisher grants, Cloud Run deployment service identity for the order API, and Cloud Run Invoker grants for workflow and Eventarc trigger service accounts.
- The Cloud Storage trigger example omitted the Cloud Storage service agent Pub/Sub Publisher grant often required for direct Cloud Storage Eventarc events. Added the project-number lookup and IAM binding.
- The architecture diagram showed services and events that were not implemented in the tutorial, including an inventory service and validation/payment services publishing directly back to Eventarc. Updated the diagram to match the workflow-driven implementation.
- The resilience claim implied indefinite queuing for unavailable services. Updated it to describe Eventarc at-least-once delivery and retry within the retention window, plus workflow failure events for synchronous calls.

## Review Notes
- `gcloud` is not installed in the local environment, so CLI validation was performed against official Google Cloud SDK documentation instead of local `--help` output.
- The tutorial still uses placeholder service URLs such as `https://validation-service-abc123-uc.a.run.app`; readers must replace them with actual deployed Cloud Run URLs.
