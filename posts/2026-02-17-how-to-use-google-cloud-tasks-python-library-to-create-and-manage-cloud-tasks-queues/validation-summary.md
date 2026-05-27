# Validation Summary: How to Use the google-cloud-tasks Python Library to Create

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Tasks
- google-cloud-tasks Python client library
- Python
- Cloud Run
- OIDC authentication
- FastAPI
- Pub/Sub comparison

## Sources Consulted
- Google Cloud Tasks documentation: https://docs.cloud.google.com/tasks/docs
- Understand Cloud Tasks: https://docs.cloud.google.com/tasks/docs/dual-overview
- Cloud Tasks issues and limitations: https://docs.cloud.google.com/tasks/docs/common-pitfalls
- Create Cloud Tasks queues: https://docs.cloud.google.com/tasks/docs/creating-queues
- Create HTTP target tasks: https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks
- Create HTTP tasks Python sample: https://docs.cloud.google.com/tasks/docs/samples/cloud-tasks-create-http-task
- Create HTTP tasks with authentication Python sample: https://docs.cloud.google.com/tasks/docs/samples/cloud-tasks-create-http-task-with-token
- Cloud Tasks Python client reference: https://docs.cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.services.cloud_tasks.CloudTasksClient
- Queue type reference: https://docs.cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.Queue
- RateLimits type reference: https://docs.cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.RateLimits
- RetryConfig type reference: https://docs.cloud.google.com/python/docs/reference/cloudtasks/latest/google.cloud.tasks_v2.types.RetryConfig
- OidcToken REST reference: https://docs.cloud.google.com/tasks/docs/reference/rest/v2/OidcToken
- Cloud Run service-to-service authentication: https://cloud.google.com/run/docs/authenticating/service-to-service

## Issues Found
- The Pub/Sub comparison said to use Cloud Tasks for "exactly-once delivery." Google documents Cloud Tasks as at-least-once delivery and warns that duplicate execution can occur, so this was changed to "at-least-once delivery."
- The queue retry comment said `max_attempts=5` means "Retry up to 5 times." In Cloud Tasks, `max_attempts` is the total number of attempts, including the first attempt, so the comment now says "Try the task up to 5 times total."
- The queue listing output labeled `retry_config.max_attempts` as "Max retries." This was changed to "Max attempts" to match the API semantics.
- The Cloud Run OIDC task example used the full handler URL, including the path, as the audience. Cloud Run expects the service URL or a configured custom audience, so the sample now accepts a separate `audience` argument and passes the service root URL in the example.
- The handler sample comment implied that reading `X-CloudTasks-*` headers verifies identity. Google documents those headers as informational and says they should not be used as identity sources, so the comment was corrected.

## Review Notes
The Python snippets were parsed with Python 3 syntax checks. The local environment did not have the `google-cloud-tasks` package installed, so API behavior was verified against official Google Cloud documentation rather than by executing live Cloud Tasks calls.
