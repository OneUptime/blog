# Validation Summary: How to Migrate AWS Elastic Beanstalk Applications to Google App Engine

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS Elastic Beanstalk
- Google App Engine standard environment
- Google App Engine flexible environment
- Cloud Tasks
- Secret Manager
- Cloud Build
- Cloud Monitoring
- Terraform
- Python
- Node.js
- Java

## Sources Consulted
- Google Cloud App Engine standard `app.yaml` reference: https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- Google Cloud App Engine flexible `app.yaml` reference: https://docs.cloud.google.com/appengine/docs/flexible/reference/app-yaml
- Google Cloud App Engine standard environment overview and instance classes: https://docs.cloud.google.com/appengine/docs/standard
- Google Cloud App Engine Node.js runtime documentation: https://cloud.google.com/appengine/docs/standard/nodejs/runtime
- Google Cloud App Engine Java runtime documentation: https://docs.cloud.google.com/appengine/docs/standard/java-gen2/runtime
- Google Cloud App Engine request routing documentation: https://docs.cloud.google.com/appengine/docs/standard/how-requests-are-routed
- Google Cloud App Engine Admin API Version resource: https://docs.cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services.versions
- Google Cloud Tasks App Engine task documentation: https://docs.cloud.google.com/tasks/docs/creating-appengine-tasks
- Google Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud SDK `gcloud app services set-traffic` reference: https://docs.cloud.google.com/sdk/gcloud/reference/app/services/set-traffic
- Google Cloud Monitoring App Engine metric list: https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud Monitoring filter documentation: https://docs.cloud.google.com/monitoring/api/v3/filters

## Issues Found
- The main App Engine `app.yaml` example mixed standard-environment settings with flexible-environment-only health check and port forwarding fields. Removed `liveness_check`, `readiness_check`, and `network.forwarded_ports` from the standard `nodejs20` example.
- The `F2` instance class comment compared it to `t3.small`, which is misleading because App Engine standard instance classes have their own memory/CPU limits. Replaced it with the documented 768 MB standard-environment limit.
- The Java example described `F4` as 1 GB RAM. Updated it to the documented 1536 MB memory limit.
- The worker service used `basic_scaling` without a B-class `instance_class`, which App Engine standard requires for basic/manual scaling. Added `instance_class: B2` and clarified that Cloud Tasks invokes the worker via HTTP requests.
- The Cloud Build smoke-test URL used the older non-regional `appspot.com` form and omitted the `default` service in the targeted version URL. Replaced the hardcoded URL with `gcloud app versions describe ... --format='value(versionUrl)'`, which uses App Engine's returned serving URL.
- The Cloud Monitoring alert labeled a raw `response_count` rate threshold as a 1% error rate, but the snippet did not compute a ratio. Changed the alert to a 5xx response count threshold and summed aligned 5xx series.

## Review Notes
The runtimes used in examples (`nodejs20`, `python311`, and `java17`) remain supported as of this review, though newer runtimes are available. The Monitoring example is intentionally simple; production teams may prefer SLO burn-rate or ratio-based alerting for error rate alerts.
