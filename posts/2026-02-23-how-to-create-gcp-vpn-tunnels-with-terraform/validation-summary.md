# Validation Summary: How to Create GCP VPN Tunnels with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (hashicorp/google provider ~> 5.0)
- Google Cloud HA VPN (`google_compute_ha_vpn_gateway`, `google_compute_external_vpn_gateway`, `google_compute_vpn_tunnel`)
- Google Cloud Classic VPN (`google_compute_vpn_gateway`, `google_compute_forwarding_rule`)
- Google Cloud Router and BGP (`google_compute_router`, `google_compute_router_interface`, `google_compute_router_peer`)
- BFD (Bidirectional Forwarding Detection)
- IPsec / IKE (ESP, UDP 500, UDP 4500)
- VPC networking, static routes, firewall rules

## Sources Consulted
- Google Cloud VPN monitoring metrics docs: https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics
- Google Cloud Router BFD concepts: https://docs.cloud.google.com/network-connectivity/docs/router/concepts/bfd
- Terraform Google provider docs for `google_compute_router`, `google_compute_router_peer`, `google_compute_ha_vpn_gateway`, `google_compute_external_vpn_gateway`, `google_compute_vpn_tunnel`, `google_compute_vpn_gateway`, `google_compute_forwarding_rule`, `google_compute_route`
- Google Cloud VPN SLA documentation (HA VPN 99.99%, Classic VPN 99.9%)

## Issues Found
- **Invalid monitoring metric name.** The post recommended alerting on `vpn.googleapis.com/tunnel_being_created`, which is not a real Google Cloud Monitoring metric. The actual VPN metrics under the `vpn.googleapis.com` namespace are `tunnel_established` and the `network/*` byte/packet counters. Removed the bogus metric reference and reworded the bullet to describe `tunnel_established` (reports 1 when up, 0 when down), which is the metric typically used for tunnel-down alerts.

## Review Notes
- BFD parameters (`min_receive_interval = 1000`, `min_transmit_interval = 1000`, `multiplier = 5`) are within Cloud Router's valid ranges (1000–30000 ms for intervals, 5–16 for multiplier).
- `keepalive_interval = 20` is the minimum (and default) for Cloud Router BGP; valid range is 20–60 seconds. The "40–60 seconds" BGP hold-timer claim is reasonable given the 60s default hold time (3 × keepalive).
- `redundancy_type = "SINGLE_IP_INTERNALLY_REDUNDANT"` with both tunnels pointing at `peer_external_gateway_interface = 0` is the correct topology for a single on-prem device with one external IP.
- HA VPN topology uses two GCP-side interfaces and corresponding `vpn_gateway_interface` 0/1 — correct.
- For GCP-to-GCP HA VPN, `peer_gcp_gateway` is correctly used in place of `peer_external_gateway`, and the example correctly creates symmetric tunnels and routers on both sides.
- Classic VPN example correctly creates ESP / UDP 500 / UDP 4500 forwarding rules, uses `target_vpn_gateway` + `peer_ip`, and includes `local_traffic_selector` / `remote_traffic_selector` for policy-based routing, plus a static `google_compute_route` with `next_hop_vpn_tunnel`.
- The HA VPN output uses `vpn_interfaces[*].ip_address`, which is the correct computed attribute on `google_compute_ha_vpn_gateway`. `detailed_status` is also a valid computed attribute on `google_compute_vpn_tunnel`.
- Note for future updates: the hashicorp/google provider has a v6.x line available; `~> 5.0` is still supported but consumers may eventually need to bump.
- Classic VPN is on a deprecation path at Google Cloud; the post appropriately recommends HA VPN as the default.
