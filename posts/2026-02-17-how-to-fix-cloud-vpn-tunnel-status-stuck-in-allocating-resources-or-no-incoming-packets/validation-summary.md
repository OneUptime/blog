# Validation Summary: Fix Cloud VPN Tunnel Status Stuck in Allocating Resources or No Incoming Packets

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud VPN
- HA VPN and Classic VPN
- IPsec and IKE
- Cloud Router and BGP
- Google Cloud CLI
- Cloud Monitoring
- VPC firewall rules

## Sources Consulted
- Google Cloud VPN troubleshooting: https://cloud.google.com/network-connectivity/docs/vpn/support/troubleshooting
- Google Cloud VPN status checks: https://cloud.google.com/network-connectivity/docs/vpn/how-to/checking-vpn-status
- Google Cloud VPN logs and metrics: https://cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics
- Google Cloud CLI `gcloud compute vpn-tunnels create`: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud Compute Engine VPN tunnels API: https://cloud.google.com/compute/docs/reference/rest/v1/vpnTunnels
- Google Cloud CLI `gcloud compute vpn-gateways describe`: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-gateways/describe
- Google Cloud CLI `gcloud compute routers get-status`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/get-status
- Google Cloud CLI `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create

## Issues Found
- The post described `PROVISIONING` as the allocating-resources state and omitted the separate `ALLOCATING_RESOURCES` state. Updated the tunnel state list and related wording to match Google Cloud's status descriptions.
- The description implied that `NO_INCOMING_PACKETS` is an established tunnel state. Updated it to distinguish no incoming packets from an established tunnel that does not pass traffic.
- The HA VPN tunnel recreation examples omitted `--router`, which Google Cloud's HA VPN examples include when using Cloud Router/BGP. Added `--router=my-cloud-router` to both tunnel creation examples.
- The `NO_INCOMING_PACKETS` explanation over-attributed the condition to shared-secret mismatches. Updated the wording to reflect Google Cloud's definition: the gateway is not receiving packets from the peer VPN gateway, while still recommending IKE configuration checks.
- The NAT guidance omitted Google Cloud's one-to-one NAT limitation and UDP forwarding requirement. Added those details.
- The Cloud Monitoring metric types used `compute.googleapis.com/vpn/...`, but current Cloud VPN metrics use the `vpn.googleapis.com/...` prefix. Updated the tunnel established and received bytes metric filters.
- The monitoring examples used BSD `date -v-1H`, which does not work in Cloud Shell's Linux environment. Replaced it with GNU `date -d '1 hour ago'`.

## Review Notes
The post is technically relevant and validated after the corrections above. The `gcloud` CLI was not installed in the local environment, so CLI verification was performed against official Google Cloud CLI reference pages instead of local `--help` output.
