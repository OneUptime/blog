# Validation Summary: How to Troubleshoot BGP Session Flapping on GCP Cloud VPN

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud VPN
- Google Cloud Router
- Border Gateway Protocol (BGP)
- Google Cloud CLI (`gcloud`)
- Cloud Logging
- IPsec/IKE
- MTU and packet loss troubleshooting

## Sources Consulted
- Google Cloud Router: View router details, including `get-status`, `bgpPeerStatus`, and `uptimeSeconds`: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/viewing-router-details
- Google Cloud Router: View logs and metrics, including official Cloud Router BGP log filters: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/viewing-logs-metrics
- Google Cloud Router: Manage BGP timers, including default keepalive and hold timer behavior: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/managing-bgp-timers
- Google Cloud Router: List BGP routes with `gcloud compute routers list-bgp-routes`: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/list-routes
- Google Cloud networking quotas and limits, including the 5,000-prefix accepted-route limit per BGP peer: https://docs.cloud.google.com/network-connectivity/quotas
- Google Cloud VPN: View logs and metrics: https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics
- Google Cloud VPN: Troubleshooting and official VPN log query examples for IKE and Child SA events: https://cloud.google.com/network-connectivity/docs/vpn/support/troubleshooting
- Google Cloud VPN: MTU considerations, including the 1460-byte Cloud VPN gateway MTU: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/mtu-considerations
- Google Cloud SDK reference for `gcloud compute routers update-bgp-peer`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- Google Cloud SDK reference for `gcloud logging read`: https://cloud.google.com/sdk/gcloud/reference/logging/read
- RFC 4271, Border Gateway Protocol 4 (BGP-4): https://datatracker.ietf.org/doc/html/rfc4271

## Issues Found
- The BGP lifecycle diagram omitted the `Active` state and implied the session terminates after `Established`. I updated the diagram and explanation to include `Active` and show that resets move the session back to a non-established state.
- Cloud Router log queries used non-documented `jsonPayload.event:"BGP"` filters and expected "BGP session up/down" wording. I replaced them with Google-documented full-text filters for "BGP peering" events and updated the example output wording.
- Cloud VPN log queries used non-documented `jsonPayload.event` filters for tunnel and IKE events. I replaced them with Google-documented searches for `IKE_SA`, `CHILD_SA`, `DELETE`, `SA_DELETE`, and rekeying text.
- Packet loss and MTU examples pinged the 169.254.x.x BGP peer address from a VM. That link-local BGP address is not the right VM-level tunnel connectivity test target, so I changed the examples to use a reachable on-premises internal IP address across the tunnel.
- The MTU section described 1460 bytes as the effective tunnel MTU. I corrected the wording to distinguish Cloud VPN gateway MTU from payload MTU, which depends on tunnel parameters.
- The route-limit section said the default learned-route limit was 100 per BGP session and could be increased to 1000. Current Google Cloud limits say Cloud Router accepts up to 5,000 prefixes from a single BGP peer and resets the session if exceeded. I corrected the limit, removed the quota-increase advice, and changed the diagnostic command to `gcloud compute routers list-bgp-routes`.
- The log-based metric filter used the same non-documented `jsonPayload.event` fields. I updated it to the documented Cloud Router BGP peering text filter.

## Review Notes
`gcloud` was not installed in the local environment, so CLI validation was performed against the current official Google Cloud SDK reference and Google Cloud documentation.
