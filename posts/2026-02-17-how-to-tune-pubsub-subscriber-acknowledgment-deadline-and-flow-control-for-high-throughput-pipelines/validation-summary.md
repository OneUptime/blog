# Validation Summary: How to Tune Pub/Sub Subscriber Acknowledgment Deadline

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub subscriber acknowledgment deadlines and ModifyAckDeadline
- Python google-cloud-pubsub client library
- gcloud CLI
- Cloud Run jobs
- Google Kubernetes Engine HorizontalPodAutoscaler
- Cloud Monitoring Pub/Sub metrics

## Sources Consulted
- Google Cloud Pub/Sub subscription properties: https://cloud.google.com/pubsub/docs/subscription-properties
- Python Pub/Sub FlowControl reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.FlowControl
- gcloud Pub/Sub subscriptions create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- gcloud Pub/Sub subscriptions update reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- gcloud Run jobs create reference: https://cloud.google.com/sdk/gcloud/reference/run/jobs/create
- Cloud Run jobs documentation: https://cloud.google.com/run/docs/create-jobs
- GKE Pub/Sub HPA sample: https://cloud.google.com/kubernetes-engine/docs/samples/container-pubsub-horizontal-pod-autoscaler
- GKE autoscaling with metrics tutorial: https://cloud.google.com/kubernetes-engine/docs/tutorials/autoscaling-metrics
- Pub/Sub monitoring guide: https://cloud.google.com/pubsub/docs/monitoring
- Cloud Monitoring Pub/Sub metrics list: https://cloud.google.com/monitoring/api/metrics_gcp_p_z#pubsub

## Issues Found
- The Python lease-extension example used non-existent `min_ack_deadline` and `max_ack_deadline` terminology and created a `FlowControl` object that was never passed to `subscribe`. Updated it to use the current `FlowControl` fields `min_duration_per_lease_extension`, `max_duration_per_lease_extension`, and `max_lease_duration`, and showed the object being passed to `subscriber.subscribe()`.
- The monitoring section said that `oldest_unacked_message_age` exceeding the subscription ack deadline means redelivery problems. That is not necessarily true when client libraries extend leases. Reworded it to describe the metric as an aging-backlog signal.

## Review Notes
The Cloud Run job example is syntactically valid, but for always-on subscribers a Cloud Run service, GKE Deployment, or other long-running worker model may be operationally clearer than a job. The GKE HPA metric syntax matches the official Google Cloud sample and requires the Cloud Monitoring custom metrics adapter setup described in the GKE documentation.
