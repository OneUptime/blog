# Validation Summary: How to Configure Cloud Run Request Timeout

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Knative Service YAML
- Terraform Google provider
- Cloud Tasks
- Pub/Sub push subscriptions
- Python
- Flask
- Google Cloud Load Balancing

## Sources Consulted
- Cloud Run request timeout documentation: https://docs.cloud.google.com/run/docs/configuring/request-timeout
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run container health checks documentation: https://docs.cloud.google.com/run/docs/configuring/healthchecks
- Cloud Run gcloud deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Tasks queue create gcloud reference: https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- Cloud Tasks RPC reference for dispatch_deadline and retry behavior: https://docs.cloud.google.com/tasks/docs/reference/rpc/google.cloud.tasks.v2
- Cloud Tasks HTTP target task documentation: https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks
- Pub/Sub push subscription documentation: https://docs.cloud.google.com/pubsub/docs/push
- Pub/Sub subscription properties: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Pub/Sub subscription retry policy: https://docs.cloud.google.com/pubsub/docs/subscription-retry-policy
- Cloud Load Balancing backend service documentation: https://docs.cloud.google.com/load-balancing/docs/backend-service
- Serverless NEG limitations documentation: https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts

## Issues Found
- The introduction said Cloud Run kills the request and loses completed work on timeout. Updated it to explain that Cloud Run closes the connection and returns 504, but the container instance is not necessarily stopped and code can continue running.
- The container startup timeout section said the default was 300 seconds and configurable to 3600 seconds. Updated it to Cloud Run's 4-minute startup requirement and 240-second startup probe limit.
- The CPU allocation section used the non-current `--cpu-always-allocated` flag and implied active long-running requests are CPU-throttled by default. Updated the command to use `--no-cpu-throttling` and clarified that CPU is already allocated while a request is active.
- The Cloud Tasks retry explanation said retry intervals stay at max after the configured doublings. Updated it to the documented behavior: intervals double, then increase linearly until the maximum backoff is reached.
- The Cloud Tasks Python snippet used a string for `dispatch_deadline`. Updated it to use `google.protobuf.duration_pb2.Duration`, matching official Python client patterns.
- The Cloud Tasks timeout guidance said `dispatch_deadline` should match or exceed the Cloud Run request timeout. Updated it to note the 30-minute maximum for HTTP tasks and recommend setting the deadline only a few seconds beyond the handler timeout.
- The Pub/Sub push subscription section said `ack-deadline` should be at least as long as the expected processing time. Updated it to note the 600-second maximum and that push subscriptions are not a good fit for single HTTP deliveries longer than 10 minutes.
- The graceful timeout example implied SIGTERM handles request timeouts. Updated the example to track elapsed request time and return before the Cloud Run timeout while keeping SIGTERM handling for instance shutdown.
- The streaming section said each streamed chunk resets the client's timeout counter. Updated it to clarify that streaming does not extend Cloud Run's maximum request timeout and that clients/proxies can still have their own timeout behavior.
- The load balancer section implied a configurable 30-second backend service timeout applies in front of Cloud Run. Updated it to distinguish configurable backend service timeouts from Cloud Run serverless NEG behavior, where the backend service timeout setting is not configurable and the serverless NEG backend timeout is 60 minutes.

## Review Notes
The post is technically relevant and salvageable. Future improvements could add a short note that Cloud Run Jobs are often a better fit than services for work that is not naturally request/response shaped.
