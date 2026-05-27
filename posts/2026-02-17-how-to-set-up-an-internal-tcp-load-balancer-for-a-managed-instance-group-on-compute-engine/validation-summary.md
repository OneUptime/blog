# Validation Summary: How to Set Up an Internal TCP Load Balancer for a Managed Instance Group

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Managed instance groups
- Internal passthrough Network Load Balancing
- Google Cloud CLI
- VPC firewall rules
- Cloud DNS
- Terraform Google provider
- Python HTTP server

## Sources Consulted
- Google Cloud Load Balancing: Set up an internal passthrough Network Load Balancer with VM instance group backends: https://cloud.google.com/load-balancing/docs/internal/setting-up-internal
- Google Cloud Load Balancing: Internal passthrough Network Load Balancer overview: https://cloud.google.com/load-balancing/docs/internal
- Google Cloud Load Balancing: Backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud Load Balancing: Traffic distribution for internal passthrough Network Load Balancers: https://cloud.google.com/load-balancing/docs/internal/int-netlb-traffic-distribution
- Google Cloud Load Balancing: Firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud SDK reference: gcloud compute backend-services create: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Terraform Registry: google_compute_region_backend_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_backend_service
- Terraform Registry: google_compute_forwarding_rule: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_forwarding_rule

## Issues Found
- The post said to configure a named port so the internal TCP load balancer knows where to send traffic. Internal passthrough Network Load Balancers do not use named ports because packets are delivered to backends with the forwarding rule destination port preserved. I replaced the named-port step with a note explaining that the forwarding rule protocol and port control traffic delivery, and removed the unused Terraform `named_port` block.
- The health check was created as a global health check while the tutorial used a regional backend service. I changed the gcloud command to create a regional health check and added `--health-checks-region=us-central1` to the backend service creation command. I also changed the Terraform resource to `google_compute_region_health_check`.
- The forwarding rule commands referenced the backend service without explicitly setting the backend service region. I added `--backend-service-region=us-central1` to match the official gcloud examples for regional internal passthrough Network Load Balancers.
- The testing section said the load balancer could be tested from any VM in the same VPC. By default, internal passthrough Network Load Balancers require clients to be in the same region unless global access is enabled, and firewall rules must allow client traffic. I corrected the wording.
- The testing section implied repeated curl requests from a single client should show different backends. Google Cloud documents that single-client testing can hit the same backend more often than expected because backend selection uses packet hashing. I changed the wording to avoid promising deterministic distribution.
- The session affinity section described `NONE` as no session affinity. For internal passthrough Network Load Balancers, `NONE` uses default 5-tuple or 3-tuple hashing. I corrected that description and added the current `CLIENT_IP_NO_DESTINATION` option.

## Review Notes
The tutorial is technically relevant and usable after the corrections. The startup script is suitable as a simple demo server, but production examples should avoid installing packages at boot without pinning or baking dependencies into an image.
