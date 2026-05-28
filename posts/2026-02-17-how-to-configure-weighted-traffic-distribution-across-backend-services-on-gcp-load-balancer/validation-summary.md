# Validation Summary: How to Configure Weighted Traffic Distribution Across Backend Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Application Load Balancer
- Google Cloud URL maps
- Weighted backend services
- Google Cloud CLI (`gcloud`)
- Compute Engine managed instance groups
- Cloud Logging
- Cloud Monitoring
- Python Google Cloud Monitoring client

## Sources Consulted
- Google Cloud: Traffic management overview for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/traffic-management-global
- Google Cloud: Set up traffic management for global external Application Load Balancers: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-global-traffic-mgmt
- Google Cloud: Set up a global external Application Load Balancer with VM instance group backends: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Google Cloud: URL maps overview: https://docs.cloud.google.com/load-balancing/docs/url-map-concepts
- Google Cloud Compute Engine REST: URL maps resource schema: https://docs.cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud SDK: `gcloud compute url-maps import`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud SDK: `gcloud compute backend-services create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK: `gcloud compute backend-services add-backend`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK: `gcloud compute ssl-certificates create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- Google Cloud SDK: `gcloud compute target-https-proxies create`: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- Google Cloud SDK: `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud: Global external Application Load Balancer logging and monitoring: https://docs.cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Google Cloud: Load balancing metrics: https://docs.cloud.google.com/load-balancing/docs/metrics
- Google Cloud Observability: Using Cloud Load Balancing metrics: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics

## Issues Found
- The backend services and forwarding rule did not explicitly use `EXTERNAL_MANAGED`, which is the load balancing scheme for a global external Application Load Balancer with advanced traffic management. Added `--load-balancing-scheme=EXTERNAL_MANAGED` where needed.
- The backend services were later queried through Cloud Logging, but logging was not enabled in the backend service creation commands. Added `--enable-logging` and `--logging-sample-rate=1.0`.
- The URL map import examples used `--source=-`. Current `gcloud compute url-maps import` documentation says to omit `--source` when reading from standard input. Updated imports to read from stdin and added `--global`.
- The frontend setup omitted flags used by current global external Application Load Balancer examples. Added `--global` to the target HTTPS proxy and `--network-tier=PREMIUM` / `--load-balancing-scheme=EXTERNAL_MANAGED` to the relevant IP and forwarding-rule commands.
- The instance group backend examples used explicit `RATE` balancing settings. The current global external Application Load Balancer VM backend setup examples add the instance group without those flags, so the example was simplified to match the documented pattern.
- The Monitoring API example claimed to compare error rates but queried request counts. Updated the wording and code to compare request counts.
- The Monitoring API example used `loadbalancing.googleapis.com/https/request_count` with `resource.labels.backend_service_name`, which does not filter per backend service correctly for global external Application Load Balancer backend counts. Updated it to `loadbalancing.googleapis.com/https/backend_request_count`, `resource.type="https_lb_rule"`, and `resource.labels.backend_target_name`.
- The Monitoring API example passed timestamp dictionaries. Updated it to use `google.protobuf.timestamp_pb2.Timestamp`, which matches the Python client message types directly.

## Review Notes
The post is technically relevant and salvageable. The URL map concepts, weighted backend service structure, route rule priorities, header matches, and weighted path-based examples are consistent with the official URL map documentation. The examples still assume placeholder project, DNS, certificate, firewall, and instance template setup that readers must replace for their environment.
