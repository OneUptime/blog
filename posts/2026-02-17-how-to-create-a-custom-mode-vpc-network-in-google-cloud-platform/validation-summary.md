# Validation Summary: How to Create a Custom Mode VPC Network in Google Cloud Platform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC networks
- Auto mode and custom mode VPCs
- Google Cloud subnets and secondary IP ranges
- Private Google Access
- VPC Flow Logs
- Google Kubernetes Engine secondary ranges
- Google Cloud firewall rules
- Cloud Router dynamic routing mode
- Google Cloud CLI

## Sources Consulted
- Google Cloud VPC networks documentation: https://cloud.google.com/vpc/docs/vpc
- Google Cloud subnets documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud SDK reference for `gcloud compute networks create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/create
- Google Cloud SDK reference for `gcloud compute networks subnets create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Google Cloud SDK reference for `gcloud compute networks subnets update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud SDK reference for `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud SDK reference for `gcloud compute networks update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/update
- Google Cloud Private Google Access documentation: https://cloud.google.com/vpc/docs/private-google-access
- Google Cloud VPC Flow Logs configuration documentation: https://cloud.google.com/vpc/docs/using-flow-logs
- Google Cloud firewall rules documentation: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud Load Balancing health checks documentation: https://cloud.google.com/load-balancing/docs/health-check-concepts

## Issues Found
- The post said a VPC Flow Logs sampling rate of 0.5 captures half the flows. Google Cloud documents this as a secondary flow sampling rate applied after primary flow sampling, so I changed the text to say it keeps about half of the generated flow log entries after primary sampling.
- The post said a new custom mode VPC has no firewall rules. All VPC networks still have implied firewall behavior, while the default network is pre-populated with additional rules, so I clarified that a custom mode VPC has no pre-populated firewall rules beyond implied firewall behavior.
- The post said a /24 subnet gives 251 usable IPs. Google Cloud reserves the first two and last two addresses in each primary IPv4 subnet range, so a /24 has 252 usable IPs. I corrected the number and added the reason.

## Review Notes
The commands and flags for creating the custom VPC, creating subnets, enabling Private Google Access and VPC Flow Logs, adding secondary ranges, creating firewall rules, converting auto mode to custom mode, and listing/describing resources match current Google Cloud CLI documentation. The health check source ranges shown are correct for many common Google Cloud load balancer types, but some products such as regional external passthrough Network Load Balancers require additional ranges; future revisions could make that product-specific caveat explicit.
