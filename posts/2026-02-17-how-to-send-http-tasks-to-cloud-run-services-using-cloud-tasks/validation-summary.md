# Validation Summary: How to Send HTTP Tasks to Cloud Run Services Using Cloud Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Tasks
- Google Cloud Run
- Google Cloud IAM and service accounts
- Google Cloud CLI
- Node.js
- Express
- Python
- Docker
- npm

## Sources Consulted
- Google Cloud Tasks documentation: Create HTTP target tasks: https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks
- Google Cloud Tasks REST reference: Task and HttpRequest resources: https://docs.cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks
- Google Cloud Tasks REST reference: OidcToken: https://docs.cloud.google.com/tasks/docs/reference/rest/v2/OidcToken
- Google Cloud Run documentation: Execute asynchronous tasks: https://docs.cloud.google.com/run/docs/triggering/using-tasks
- Google Cloud SDK reference: gcloud tasks queues create: https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- Google Cloud SDK reference: gcloud tasks list: https://cloud.google.com/sdk/gcloud/reference/tasks/list
- Google Cloud SDK reference: gcloud run deploy: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference: gcloud run services add-iam-policy-binding: https://cloud.google.com/sdk/gcloud/reference/run/services/add-iam-policy-binding
- npm documentation: npm ci: https://docs.npmjs.com/cli/v11/commands/npm-ci

## Issues Found
- The handler comments and examples said Cloud Tasks would not retry 4xx responses by default. Google Cloud Tasks treats any non-2xx HTTP response as a failed attempt and retries it according to the queue retry configuration. Updated the permanent validation-failure paths to return 2xx responses and updated the final guidance to reserve non-2xx responses for retriable failures.
- The authentication setup granted the invoker service account access to Cloud Run but omitted the IAM binding that lets the Cloud Tasks service agent create OIDC tokens with that service account. Added the `gcloud iam service-accounts add-iam-policy-binding` command using `roles/iam.serviceAccountUser`.
- The Dockerfile used `npm ci --only=production`. Updated it to the current documented form, `npm ci --omit=dev`.

## Review Notes
- The task-name deduplication example is technically valid for the shown `orderId` and `action` values. In a production system, values interpolated into task IDs should be normalized to Cloud Tasks' allowed task ID characters before use.
- The code examples are illustrative and assume the application identity creating tasks also has permission to enqueue Cloud Tasks tasks and to act as the OIDC service account where required.
