# Validation Summary: How to Use Pub/Sub with Cloud Run for Event-Driven Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Run
- Google Cloud CLI
- Terraform Google provider
- Python
- Flask
- Gunicorn
- Cloud Monitoring
- Firestore

## Sources Consulted
- Google Cloud Pub/Sub push subscriptions: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub authenticated push subscriptions: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Run Pub/Sub tutorial: https://docs.cloud.google.com/run/docs/tutorials/pubsub
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK `gcloud pubsub subscriptions create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Run minimum instances documentation: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Google Cloud Run YAML reference: https://docs.cloud.google.com/run/docs/reference/yaml/v1
- Google Cloud Monitoring time-series documentation: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics
- Google Cloud Monitoring filters documentation: https://docs.cloud.google.com/monitoring/api/v3/filters
- Terraform Google provider `google_pubsub_subscription` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Terraform Google provider Cloud Run v2 IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam

## Issues Found
- The post said Cloud Run users only pay when messages are being processed. I qualified this to request-based billing with no minimum instances, because minimum instances and instance-based billing can incur idle charges.
- The post described Pub/Sub push acknowledgement as any successful or non-2xx response. I updated this to the documented Pub/Sub success status codes: `102`, `200`, `201`, `202`, and `204`.
- The authenticated push setup omitted the Pub/Sub service agent token-creator grant needed for projects created on or before April 8, 2021. I added the corresponding `gcloud` and Terraform examples.
- The Terraform subscription referenced `google_pubsub_topic.order_events_dlq` without defining it. I added the dead-letter topic resource.
- The Terraform dead-letter setup did not grant the Pub/Sub service agent permission to publish to the dead-letter topic. I added a `google_pubsub_topic_iam_member` grant for `roles/pubsub.publisher`.
- The Cloud Run YAML example used revision-level autoscaling annotations while the surrounding text described keeping a service warm. I changed the example to service-level `run.googleapis.com/minScale` and `run.googleapis.com/maxScale` annotations.
- The monitoring commands used `gcloud monitoring read`, which is not a current stable Google Cloud CLI command for reading time series. I replaced the examples with Cloud Monitoring `projects.timeSeries.list` API calls using `curl` and `gcloud auth print-access-token`.

## Review Notes
The Python and Dockerfile examples are syntactically valid for the tutorial context. The Firestore deduplication example is a simplified snippet and assumes the surrounding Flask app, imports, credentials, and `process_event` function are present.
