# Validation Summary: How to Choose Between Pub/Sub and Cloud Tasks for Asynchronous Processing on GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Tasks
- Google Cloud CLI
- Python
- Google Cloud Python client libraries

## Sources Consulted
- Google Cloud documentation: Choose Cloud Tasks or Pub/Sub, https://docs.cloud.google.com/tasks/docs/comp-pub-sub
- Google Cloud documentation: Understand Cloud Tasks, https://docs.cloud.google.com/tasks/docs/dual-overview
- Google Cloud documentation: Cloud Tasks issues and limitations, https://docs.cloud.google.com/tasks/docs/common-pitfalls
- Google Cloud documentation: Cloud Tasks quotas and limits, https://docs.cloud.google.com/tasks/docs/quotas
- Google Cloud documentation: Create HTTP tasks, https://docs.cloud.google.com/tasks/docs/samples/cloud-tasks-create-http-task
- Google Cloud documentation: Create HTTP tasks with authentication, https://docs.cloud.google.com/tasks/docs/samples/cloud-tasks-create-http-task-with-token
- Google Cloud SDK documentation: gcloud tasks queues create, https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- Google Cloud documentation: Pub/Sub quotas and limits, https://docs.cloud.google.com/pubsub/quotas
- Google Cloud documentation: Pub/Sub subscription properties, https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud documentation: Pub/Sub subscription filters, https://docs.cloud.google.com/pubsub/docs/subscription-message-filter
- Google Cloud SDK documentation: gcloud pubsub subscriptions create, https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud documentation: Publish Pub/Sub messages with custom attributes, https://docs.cloud.google.com/pubsub/docs/samples/pubsub-publish-custom-attributes

## Issues Found
- The post said Cloud Tasks delivers requests exactly once. Changed this to at-least-once delivery because Cloud Tasks can execute a task more than once and handlers must be idempotent.
- The feature table described Cloud Tasks deduplication as delivery deduplication. Changed it to task creation deduplication, which is the documented behavior.
- The feature table said Cloud Tasks provides FIFO ordering within a queue. Changed it to no guaranteed execution order because Cloud Tasks does not guarantee task execution order.
- The feature table said Cloud Tasks has dead lettering. Changed it to no native dead-letter queue; failed tasks are retried according to queue retry settings and then stop being retried.
- The Pub/Sub rate limiting row and common mistake wording were too absolute. Updated them to distinguish Cloud Tasks explicit queue dispatch controls from Pub/Sub pull subscriber flow control and push delivery scaling.
- The scheduled task example used `datetime.utcnow()`. Replaced it with `datetime.now(timezone.utc)` to use a timezone-aware UTC datetime.

## Review Notes
The Python examples are illustrative snippets and assume surrounding setup such as installed Google Cloud client libraries, Application Default Credentials, defined clients, queue paths, Flask imports, and application objects. The reviewed APIs and CLI flags are current in the official documentation.
