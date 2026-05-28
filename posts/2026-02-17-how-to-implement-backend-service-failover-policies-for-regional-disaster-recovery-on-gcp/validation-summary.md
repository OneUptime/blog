# Validation Summary: How to Use Backend Service Failover Policies for Regional Disaster Recovery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud global external Application Load Balancer
- Google Cloud backend services
- Google Cloud service load balancing policies
- Managed instance groups
- Google Cloud health checks
- Google Cloud Monitoring alert policies
- gcloud CLI
- Python Cloud Monitoring client library

## Sources Consulted
- Google Cloud Load Balancing: Advanced load balancing optimizations, including service load balancing policies, auto-capacity draining, failover threshold, and preferred backends: https://docs.cloud.google.com/load-balancing/docs/service-lb-policy
- Google Cloud Load Balancing: Backend services overview, including balancing modes and capacity concepts: https://docs.cloud.google.com/load-balancing/docs/backend-service
- Google Cloud SDK reference: `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK reference: `gcloud compute backend-services add-backend`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK reference: `gcloud compute backend-services update-backend`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update-backend
- Google Cloud Load Balancing metrics and Application Load Balancer monitoring: https://docs.cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Google Cloud Monitoring SLI examples for load balancer metrics: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics
- Google Cloud Load Balancing: regional external passthrough Network Load Balancer failover behavior, used to distinguish passthrough failover policies from Application Load Balancer service load balancing policies: https://docs.cloud.google.com/load-balancing/docs/network/ext-netlb-traffic-distribution

## Issues Found
- The original post mixed global external Application Load Balancer configuration with passthrough Network Load Balancer failover backend fields. I removed the unsupported `failover: true` backend configuration and replaced the REST export/import example with a supported service load balancing policy.
- The backend service creation command omitted `--load-balancing-scheme=EXTERNAL_MANAGED`, which is required for a global external Application Load Balancer backend service. I added the flag.
- The original post claimed that `capacity-scaler=0.0` on a DR backend makes it receive traffic only during failover. For Application Load Balancers, a zero capacity scaler makes the backend effectively ineligible; it is not the right standby mechanism. I changed the example to use backend preference and a nonzero DR capacity scaler.
- The original explanation described failover ratios, but Application Load Balancer service load balancing policies use a failover health threshold. I updated the terminology and configuration.
- The original health check timing said failover starts after about 15 seconds. I narrowed this to endpoint unhealthy detection and noted that actual traffic shifting depends on backend service policy and GFE behavior.
- The connection draining explanation implied new connections immediately go to healthy regions in all cases. I changed it to say new connections go to eligible healthy backends.
- The Monitoring filter used `metric.labels.backend_scope`; Google Cloud Monitoring filter syntax uses `metric.label."backend_scope"`. I corrected the label syntax and added a backend target resource label.

## Review Notes
The guide is now technically aligned with global external Application Load Balancer controls. A future improvement would be to add the missing frontend resources for a complete runnable load balancer setup, such as URL map, target proxy, forwarding rule, firewall rule, and named ports on the managed instance groups.
