# Validation Summary: How to Migrate from Classic VPN to HA VPN in GCP

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud VPN
- Classic VPN
- HA VPN
- Cloud Router
- BGP
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud: Move from Classic VPN to HA VPN: https://cloud.google.com/network-connectivity/docs/vpn/how-to/moving-to-ha-vpn
- Google Cloud: HA VPN topologies: https://cloud.google.com/network-connectivity/docs/vpn/concepts/topologies
- Google Cloud: Cloud VPN SLA: https://cloud.google.com/network-connectivity/docs/vpn/sla
- Google Cloud CLI reference: `gcloud compute vpn-gateways create`: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-gateways/create
- Google Cloud CLI reference: `gcloud compute external-vpn-gateways create`: https://cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud CLI reference: `gcloud compute vpn-tunnels create`: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud CLI reference: `gcloud compute routers add-interface`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud CLI reference: `gcloud compute routers add-bgp-peer`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud VPC routes overview: https://cloud.google.com/vpc/docs/routes
- Google Cloud: Cloud VPN order of routes: https://cloud.google.com/network-connectivity/docs/vpn/concepts/order-of-routes
- Google Cloud: View Cloud VPN logs and metrics: https://cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics

## Issues Found
- The post incorrectly said Classic VPN has no SLA. Google Cloud's current Cloud VPN SLA lists Classic VPN at 99.9%, so the introduction and comparison table were corrected.
- The routing table implied HA VPN BGP was only recommended. HA VPN tunnels are managed by Cloud Router and use dynamic BGP routing, so the table was updated to say BGP is required.
- The Cloud Logging command was presented as a way to check tunnel byte counts. Cloud VPN tunnel traffic counters are Cloud Monitoring metrics, so the example was replaced with a PromQL metric query using `sent_bytes_count` and `received_bytes_count`.
- The post used `gcloud compute routes update` to change a static route priority. Static route management is done by creating and deleting routes, so the example now deletes and recreates the Classic VPN static route with a lower priority.
- The post said BGP routes from HA VPN typically have priority 100 and would automatically beat static routes with priority 1000+. Route priority depends on learned-route metrics and route-selection rules, so the explanation now tells readers to ensure the Classic VPN static route has a numerically higher priority value than the HA VPN learned route for the same prefix.
- The Classic VPN decommissioning example showed one forwarding rule. Classic VPN gateways use forwarding rules for ESP, UDP 500, and UDP 4500, so the cleanup example now deletes all three.

## Review Notes
The migration strategy is technically sound: Google Cloud documentation says existing Classic VPN tunnels cannot be converted in place and recommends creating new HA VPN gateways, Cloud Router resources, and tunnels before deleting the old Classic VPN resources. The examples use placeholder IP ranges, ASNs, regions, route names, and tunnel names that must be adapted to the reader's environment.
