# Validation Summary: How to Set Up Global Server Load Balancing for IPv4 with Cloudflare

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare Load Balancing
- Cloudflare Load Balancing API
- Cloudflare DNS
- Global server load balancing (GSLB)
- Health checks and failover
- Terraform

## Sources Consulted
- Cloudflare Load Balancers API: https://developers.cloudflare.com/api/resources/load_balancers/
- Cloudflare pool management docs: https://developers.cloudflare.com/load-balancing/pools/create-pool/
- Cloudflare monitor management docs: https://developers.cloudflare.com/load-balancing/monitors/create-monitor/
- Cloudflare load balancer management docs: https://developers.cloudflare.com/load-balancing/load-balancers/create-load-balancer/
- Cloudflare global traffic steering docs: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/
- Cloudflare geo steering docs: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/geo-steering/
- Cloudflare standard steering docs: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/standard-options/
- Cloudflare proxy status docs: https://developers.cloudflare.com/load-balancing/understand-basics/proxy-modes/
- Cloudflare load balancing analytics docs: https://developers.cloudflare.com/load-balancing/reference/load-balancing-analytics/
- Cloudflare pricing and add-ons overview: https://www.cloudflare.com/plans/
- Terraform Registry `cloudflare_load_balancer` resource docs: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/load_balancer

## Issues Found
- The post used `user/load_balancers/...` API paths for pools and monitors. Current official API documentation uses account-scoped endpoints, so the examples were updated to `accounts/$ACCOUNT_ID/load_balancers/...`.
- The pool creation example referenced `MONITOR_ID` before the monitor had been created. The pool example was corrected to create the pool first, and the monitor section now includes a follow-up `PATCH` request to attach the created monitor to the pool.
- The prerequisites claimed Load Balancing was available only on Pro and above. Current Cloudflare pricing/docs describe Load Balancing as a paid add-on and indicate steering features vary by entitlement, so the prerequisite text was updated to reflect Load Balancing enablement, Traffic steering for non-Enterprise `geo` steering, and required API token permissions.
- The introduction described the configuration as purely DNS-based even though the example load balancer is created with `proxied: true`. The wording was corrected to reflect Cloudflare's proxied layer 7 behavior.
- The steering-policy table overstated or simplified several policy behaviors and omitted current policies. The descriptions were corrected and `least_outstanding_requests` plus `least_connections` were added.
- The failover section implied proxied failover simply bypasses DNS TTL delays. It was updated to describe Cloudflare's layer 7 failover behavior more accurately for proxied load balancers.
- The monitoring section claimed analytics expose health-check pass/fail rates directly. It was revised to match the current docs, which describe request distribution and pool/origin health status over time.
- The conclusion claimed geo steering always sends users to the nearest healthy origin. That overstates what geo steering guarantees, so it was softened to reflect healthy regional routing instead.

## Review Notes
- The Terraform snippet matches the current `cloudflare_load_balancer` resource schema for `zone_id`, `fallback_pool_id`, `default_pool_ids`, `steering_policy`, `proxied`, and `region_pools`.
- Proximity steering is still correctly listed as a supported policy, but it requires latitude/longitude on pools if readers choose to use it.
