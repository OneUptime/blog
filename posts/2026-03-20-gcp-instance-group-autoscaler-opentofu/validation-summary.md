# Validation Summary: How to Configure GCP Instance Group Autoscaler with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine managed instance groups (MIGs) and autoscalers
- Google Cloud Monitoring metrics
- Google Cloud Pub/Sub backlog metrics
- HTTP load balancing utilization
- OpenTofu and HCL using the Google provider

## Sources Consulted
- Google Cloud Compute Engine autoscaling overview: https://docs.cloud.google.com/compute/docs/autoscaler
- Google Cloud scaling based on Monitoring metrics: https://docs.cloud.google.com/compute/docs/autoscaler/scaling-cloud-monitoring-metrics
- Google Cloud scaling based on load balancing serving capacity: https://docs.cloud.google.com/compute/docs/autoscaler/scaling-load-balancing
- Google Cloud managing autoscalers and scale-in controls: https://docs.cloud.google.com/compute/docs/autoscaler/managing-autoscalers
- Google Compute Engine autoscalers REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/autoscalers
- Google provider `google_compute_autoscaler` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_autoscaler
- Google provider `google_compute_region_autoscaler` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_autoscaler

## Issues Found
1. **`cooldown_period` was explained incorrectly.** The post said it waits between scaling decisions, but the provider documentation defines it as the period before the autoscaler starts collecting information from a new instance. I corrected the inline comment.

2. **The Pub/Sub backlog example used the wrong autoscaling field.** For a total-work metric such as `pubsub.googleapis.com/subscription/num_undelivered_messages`, the provider documentation recommends `single_instance_assignment`, not `target`. I changed the example to `single_instance_assignment = 100`.

3. **The Monitoring filter syntax was invalid.** Google Cloud's Monitoring filter syntax requires quoted string values and uses `resource.labels.subscription_id`, not `resource.label.subscription_id`. I corrected the filter string accordingly.

4. **The post metadata did not match the actual examples.** The article claimed scheduled scaling coverage even though no schedule example was present, and it described the Pub/Sub example as a custom metric even though it uses a built-in Cloud Monitoring metric. I updated the description, section heading, and summary text to reflect the real content.

## Review Notes
- The regional `load_balancing_utilization` example is valid, but it assumes the managed instance group is attached to an HTTP(S) load balancer backend service with serving-capacity settings already defined.
- The Google provider documentation shows `target = google_compute_instance_group_manager...id` and `target = google_compute_region_instance_group_manager...id` as valid usage, even though the underlying API field is a managed instance group URL.
- Google Cloud and the provider do support schedule-based autoscaling via scaling schedules, but this post no longer claims to cover that feature because no schedule example is included.
