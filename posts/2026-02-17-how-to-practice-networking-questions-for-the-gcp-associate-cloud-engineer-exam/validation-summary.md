# Validation Summary: How to Practice Networking Questions for the GCP Associate Cloud Engineer Exam

## Status
validated

## Post Type
Technical certification study guide

## Technologies Covered
- Google Cloud VPC networks and subnets
- Google Cloud firewall rules
- Google Cloud Load Balancing
- VPC Network Peering
- Shared VPC
- Cloud VPN
- Cloud Interconnect
- Cloud DNS
- Google Cloud CLI

## Sources Consulted
- Google Cloud VPC networks documentation: https://cloud.google.com/vpc/docs/vpc
- Google Cloud subnets documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud VPC firewall rules documentation: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud Load Balancing overview: https://cloud.google.com/load-balancing/docs/load-balancing-overview
- Google Cloud global external Application Load Balancer setup guide: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Google Cloud VPC Network Peering documentation: https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud Shared VPC documentation: https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud VPN SLA documentation: https://cloud.google.com/network-connectivity/docs/vpn/sla
- Google Cloud Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/overview
- Google Cloud HA VPN over Cloud Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/ha-vpn-interconnect
- Google Cloud DNS zones documentation: https://cloud.google.com/dns/docs/zones
- Google Cloud DNS record sets CLI reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud CLI references for compute networks, subnets, firewall rules, managed instance groups, backend services, target HTTP proxies, and forwarding rules.

## Issues Found
- The VPC cross-region communication scenario said no configuration was needed. I changed the answer to clarify that VPN or peering is not needed, but ingress firewall rules must still allow the traffic.
- The firewall section described default rules as existing in every VPC and listed the wrong implied-rule priority. I corrected this to distinguish implied rules in every VPC from pre-populated default-network ingress rules.
- The load balancer type table used older names and oversimplified scopes. I updated it to current Google Cloud Application Load Balancer, proxy Network Load Balancer, and passthrough Network Load Balancer terminology.
- The HTTP load balancer command sequence omitted the managed instance group's named port and the backend service port name. I added `gcloud compute instance-groups managed set-named-ports` and `--port-name=http`.
- The Cloud VPN section described Classic VPN as a single tunnel and HA VPN as simply two tunnels. I changed the wording to match the gateway model and SLA conditions more accurately.
- The Cloud Interconnect scenario did not mention that Interconnect traffic is not encrypted by default. I added a note to use HA VPN over Cloud Interconnect or another supported encryption option when encryption is required.

## Review Notes
The remaining commands and explanations are technically plausible for an Associate Cloud Engineer networking study guide. The load balancer example uses an HTTP frontend and broad firewall examples for practice; a production guide should use narrower backend firewall source ranges and HTTPS where appropriate.
