# Validation Summary: How to Create GCP Internal Load Balancers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud VPC networking
- Compute Engine regional internal Application Load Balancers
- Compute Engine internal passthrough Network Load Balancers
- OpenTofu
- Terraform-compatible HCL

## Sources Consulted
- Google Cloud: Internal Application Load Balancer overview - https://cloud.google.com/load-balancing/docs/l7-internal
- Google Cloud: Set up a regional internal Application Load Balancer with VM instance group backends - https://cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-internal
- Google Cloud: Proxy-only subnets for Envoy-based load balancers - https://cloud.google.com/load-balancing/docs/proxy-only-subnets
- Google Cloud: Internal passthrough Network Load Balancer overview - https://cloud.google.com/load-balancing/docs/internal
- Google Cloud: Forwarding rules overview - https://cloud.google.com/load-balancing/docs/forwarding-rule-concepts
- Google Cloud: Backend services overview - https://cloud.google.com/load-balancing/docs/backend-service
- Terraform Registry: `google_compute_forwarding_rule` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_forwarding_rule
- Terraform Registry: `google_compute_region_url_map` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_url_map

## Issues Found
- The post used `google_compute_health_check` for a regional internal Application Load Balancer. I changed this to `google_compute_region_health_check` and updated the backend service reference because regional internal Application Load Balancers use regional health checks.
- The internal Application Load Balancer backend service omitted the named port required for proxy-based load balancers that use instance group backends. I added `port_name = "app-port"` and clarified that the managed instance group must expose the matching named port on port `8080`.
- The regional internal Application Load Balancer example omitted the required proxy-only subnet. I added a `google_compute_subnetwork` resource with `purpose = "REGIONAL_MANAGED_PROXY"` and made the forwarding rule depend on it.
- The same reserved internal IP was reused across `INTERNAL_MANAGED` and `INTERNAL` forwarding rules without marking the address as shareable. I added `purpose = "SHARED_LOADBALANCER_VIP"` to the reserved address.
- The comment on `allow_global_access = false` incorrectly implied that the setting allows access from all VMs in the network. I corrected the comment to reflect that disabling global access keeps client access regional by default.
- The pass-through TCP example referenced `google_compute_region_backend_service.db_backend` without defining it. I added a minimal regional backend service and matching regional TCP health check so the example reflects a valid internal passthrough Network Load Balancer configuration.

## Review Notes
- The post now correctly states that regional internal Application Load Balancers require a proxy-only subnet and that firewall rules must allow health checks and backend traffic.
- The article still keeps firewall rules outside the main snippets for brevity. That is acceptable now that the requirement is stated explicitly, but adding concrete firewall examples later would make the tutorial more directly runnable.
