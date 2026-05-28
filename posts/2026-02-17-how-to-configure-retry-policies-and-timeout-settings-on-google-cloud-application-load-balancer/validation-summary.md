# Validation Summary: How to Configure Retry Policies and Timeout Settings on Google Cloud App Load

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud Application Load Balancer
- Google Cloud URL maps
- Google Cloud backend services
- Google Cloud Monitoring
- Google Cloud CLI
- Terraform Google provider
- YAML and HCL configuration

## Sources Consulted
- Google Cloud Compute Engine REST API: URL maps, including `routeAction.retryPolicy`, retry conditions, `numRetries`, `perTryTimeout`, and route `timeout`: https://cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud Load Balancing traffic management overview for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/traffic-management-global
- Google Cloud Load Balancing traffic management setup for regional external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/setting-up-reg-traffic-mgmt
- Google Cloud backend services overview, including backend service timeout behavior: https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud connection draining documentation: https://cloud.google.com/load-balancing/docs/enabling-connection-draining
- Google Cloud Load Balancing metrics documentation: https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud SDK documentation for `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Registry documentation for `google_compute_url_map`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map
- Terraform Registry documentation for `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- The post used `reset` as a standalone `retryConditions` value in the YAML, Terraform, and recommended default snippets. Google Cloud URL map retry policies do not list `reset` as a valid standalone retry condition. I removed it from the snippets and added a short note that the documented `5xx` condition includes backend non-response cases such as disconnects, resets, read timeouts, connection failures, and refused streams.
- The post described `numRetries: 3` as three total attempts and calculated the timeout example as three tries. Google Cloud documents `numRetries` as the allowed number of retries after the initial attempt. I updated the comments and timeout explanation to treat this as the first attempt plus three retries.
- The post said the backend service timeout was the overall limit even when a route-level timeout is configured. Google Cloud documents that route timeout overrides the backend service timeout for the selected route and includes all retries. I clarified this interaction.
- The post implied retries always go to a different backend. Google Cloud retries to an eligible instance or endpoint, but a different backend is not guaranteed. I changed the wording and diagram label to "eligible backend."
- The Monitoring example used `--condition-threshold-value`, which is not a valid `gcloud monitoring policies create` flag. I replaced it with the documented `--if` and `--duration` flags and changed the example from an unsupported retry-rate alert to a final 5xx response threshold alert using the documented load balancing request count metric.

## Review Notes
The examples are technically valid for Application Load Balancer modes that support advanced traffic management route actions. Classic Application Load Balancer support should be checked before using these exact `routeAction` examples in a classic configuration.
