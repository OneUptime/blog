# Validation Summary: How to Migrate from App Engine Task Queues to Cloud Tasks

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Platform
- App Engine Task Queue API
- Cloud Tasks
- App Engine task handlers
- gcloud CLI
- Python
- Node.js
- queue.yaml

## Sources Consulted
- Google Cloud Tasks: Migrate from Task Queues to Cloud Tasks: https://docs.cloud.google.com/tasks/docs/migrating
- Google Cloud Tasks: Create App Engine tasks: https://docs.cloud.google.com/tasks/docs/creating-appengine-tasks
- Google Cloud Tasks: Create App Engine task handlers: https://docs.cloud.google.com/tasks/docs/creating-appengine-handlers
- Google Cloud Tasks: Create Cloud Tasks queues: https://docs.cloud.google.com/tasks/docs/creating-queues
- Google Cloud Tasks: Use Queue Management or queue.yaml: https://docs.cloud.google.com/tasks/docs/queue-yaml
- Google Cloud SDK: gcloud tasks queues create: https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- Google Cloud SDK: gcloud tasks list: https://docs.cloud.google.com/sdk/gcloud/reference/tasks/list
- App Engine standard environment queue.yaml reference: https://cloud.google.com/appengine/docs/standard/reference/queueref

## Issues Found
- The Python Cloud Tasks example used `time.time()` without importing `time`. Added the missing `import time`.
- The App Engine task handler section claimed Cloud Tasks changes App Engine task headers from `X-AppEngine-*` to `X-CloudTasks-*`. Official Cloud Tasks documentation for App Engine targets says requests contain `X-AppEngine-QueueName`, `X-AppEngine-TaskName`, and `X-AppEngine-TaskRetryCount`. Updated the handler code and header list accordingly.
- The security decorator checked `X-CloudTasks-TaskName` and said that header could not be spoofed from external requests. Updated the example to check `X-AppEngine-TaskName`, which is the documented internal header for App Engine task requests.
- The Node.js old-code example described an `appengine-api` import as the deprecated App Engine Task Queue API. Official Cloud Tasks migration documentation does not document an official bundled Node.js Task Queue API. Reworded the comment so the snippet is framed as wrapper-style legacy code rather than an official App Engine bundled API.

## Review Notes
- The `gcloud tasks queues create`, queue-management, and task-listing commands matched current Google Cloud SDK reference documentation.
- The Cloud Tasks Python and Node.js task creation examples match the documented App Engine task shape, including `app_engine_http_request` / `appEngineHttpRequest`, relative URI routing, payload bodies, and scheduled execution.
- Cloud Tasks and App Engine Task Queues share the underlying App Engine queue service for App Engine targets, but Google recommends avoiding mixed queue management through both `queue.yaml` and the Cloud Tasks API because later `queue.yaml` uploads can disable queues omitted from the file.
