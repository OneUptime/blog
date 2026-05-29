# Validation Summary: How to Fix Cloud Router Learned Routes Exceeding Quota

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Platform
- Cloud Router
- Border Gateway Protocol (BGP)
- Cloud VPN
- Cloud Interconnect
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring
- Cisco route maps and prefix lists

## Sources Consulted
- Google Cloud Cloud Router quotas and limits: https://docs.cloud.google.com/network-connectivity/quotas
- Google Cloud Cloud Router learned routes: https://cloud.google.com/network-connectivity/docs/router/concepts/learned-routes
- Google Cloud list BGP routes guide: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/list-routes
- Google Cloud view Cloud Router details guide: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/viewing-router-details
- Google Cloud view Cloud Router logs and metrics: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/viewing-logs-metrics
- Google Cloud troubleshoot BGP routes and route selection: https://docs.cloud.google.com/network-connectivity/docs/router/support/troubleshoot-bgp-routes
- Google Cloud BGP route policies overview: https://cloud.google.com/network-connectivity/docs/router/concepts/bgp-route-policies-overview
- Google Cloud CLI reference for `gcloud compute routers list-bgp-routes`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/list-bgp-routes
- Google Cloud CLI reference for `gcloud compute routes list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routes/list
- Google Cloud CLI reference for `gcloud compute routers update-bgp-peer`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer

## Issues Found
- The route limit section described learned route limits as per-Cloud Router and gave outdated or inaccurate values. Updated it to describe unique dynamic route prefix quotas per region per VPC network, the 5,000-prefix limit accepted from a single BGP peer, and the current custom advertised route limit.
- The post used `gcloud compute routes list` to list BGP dynamic routes. That command lists non-dynamic routes, so it was replaced with `gcloud compute routers list-bgp-routes`.
- The log query only checked `gce_router`, but dynamic route prefix quota errors use `gce_network_region`. Updated the query and example messages.
- The quota usage command used Compute Engine project route quotas instead of the Cloud Router learned-route metrics. Replaced it with the official Cloud Monitoring metric names for used, allowed, and dropped unique destinations.
- The quota increase section implied a per-router learned-route limit and a typical maximum of 1,000. Updated it to refer to dynamic route prefix quotas and support or sales escalation when quota increases are not available.
- The CIDR summarization example was incorrect: `10.1.1.0/24` through `10.1.4.0/24` cannot summarize exactly to `10.1.0.0/22`. Changed the example prefixes to `10.1.0.0/24` through `10.1.3.0/24`.
- The post said Cloud Router does not support inbound route filtering directly. Updated it to note that Cloud Router supports BGP import route policies for learned routes.
- The multiple Cloud Routers section implied that adding routers always multiplies learned-route capacity. Updated it to clarify that unique dynamic route prefix quotas apply per region per VPC network across routers in that region.
- The BGP session state examples used uppercase state names. Updated them to match documented output such as `Established`, `Connect`, and `Active`.
- The route propagation check said it was checking learned routes but displayed `advertisedRoutes`, and it again used `gcloud compute routes list` for dynamic routes. Replaced those commands with `list-bgp-routes` and `get-status`.

## Review Notes
The post is now technically accurate for the current Google Cloud documentation reviewed on 2026-05-29. Future improvements could include a concrete Cloud Router BGP import policy example, but that would be an expansion rather than a correctness fix.
