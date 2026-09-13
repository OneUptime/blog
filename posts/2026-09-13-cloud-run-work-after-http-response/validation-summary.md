# Validation Summary: Why Cloud Run Work Stops After the HTTP Response

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Google Cloud Run
- Google Cloud Tasks
- Google Cloud CLI (`gcloud`)
- Python background execution with an executor
- Durable asynchronous processing, idempotency, leases, and the transactional outbox pattern

## Sources Consulted

- [Cloud Run billing settings for services](https://docs.cloud.google.com/run/docs/configuring/billing-settings)
- [Cloud Run container runtime contract](https://docs.cloud.google.com/run/docs/container-contract)
- [Executing asynchronous tasks with Cloud Run and Cloud Tasks](https://docs.cloud.google.com/run/docs/triggering/using-tasks)
- [Cloud Tasks issues and limitations](https://docs.cloud.google.com/tasks/docs/common-pitfalls)
- [Cloud Tasks REST task resource and dispatch deadline](https://docs.cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks)
- [`gcloud run services update` reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update)
- [`gcloud tasks queues update` reference](https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/update)
- [Configure Cloud Tasks queue routing, limits, and retries](https://docs.cloud.google.com/tasks/docs/configuring-queues)

## Issues Found
No technical issues found.

## Review Notes
The Python handler is explicitly illustrative and assumes an application, route framework, executor, and `build_report` function already exist. The example queue limits are correctly identified as workload-specific values rather than defaults. The post also correctly distinguishes CPU availability from durable ownership, warns that Cloud Run instances (including minimum instances) can be replaced, accounts for duplicate Cloud Tasks delivery, and states the 30-minute maximum dispatch deadline for HTTP tasks.
