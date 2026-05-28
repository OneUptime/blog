# Validation Summary: How to Configure Hybrid Connectivity NEGs to Load Balance On-Premises Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Hybrid connectivity network endpoint groups
- Cloud VPN
- Cloud Interconnect
- Cloud Router
- Google Cloud CLI
- Google Cloud health checks

## Sources Consulted
- Google Cloud: Hybrid connectivity network endpoint groups overview: https://cloud.google.com/load-balancing/docs/negs/hybrid-neg-concepts
- Google Cloud: Set up a classic Application Load Balancer with hybrid connectivity: https://cloud.google.com/load-balancing/docs/https/setting-up-ext-https-hybrid
- Google Cloud: Health checks overview: https://cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud CLI reference: `gcloud compute network-endpoint-groups create`: https://cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/create
- Google Cloud CLI reference: `gcloud compute backend-services add-backend`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud CLI reference: `gcloud compute backend-services update-backend`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update-backend
- Compute Engine API reference: Backend services: https://cloud.google.com/compute/docs/reference/rest/v1/backendServices

## Issues Found
- The post described hybrid NEG connectivity as any routable private connectivity. Google Cloud documents supported hybrid connectivity as Cloud VPN, Cloud Interconnect, or Router appliance VMs, with Cloud Router and global dynamic routing requirements. Updated the connectivity descriptions and prerequisites.
- The post said to create the hybrid NEG in the same zone as the VPN gateway. Cloud VPN gateways and Interconnect attachments are regional, and Google Cloud documents regional constraints for Interconnect and Envoy-based regional load balancers. Updated the guidance to avoid the invalid zonal VPN gateway claim.
- The health check explanation implied all hybrid NEG health checks originate from Google's centralized health check IP ranges. Google Cloud distinguishes centralized health checks for global/classic load balancers and distributed Envoy health checks from proxy-only subnets for Envoy-based regional load balancers. Updated the explanation.
- The on-premises firewall example allowed application traffic from the VPC subnet range. For the global external/classic Application Load Balancer example, traffic must be allowed from Google's health check/proxy ranges; for Envoy-based regional load balancers, the proxy-only subnet must also be allowed. Updated the firewall text and pseudo-config.
- The migration strategy used `max-rate-per-instance=0` to drain cloud backends. Backend draining should use `capacity-scaler=0`, subject to backend service constraints. Updated the phase description.
- The article said request-rate settings directly control the traffic split. These settings define backend capacity and influence distribution, but they are not an exact weighted traffic split. Updated the wording.

## Review Notes
The `gcloud` command structure for creating a `NON_GCP_PRIVATE_IP_PORT` zonal NEG, adding endpoints, creating global health checks and backend services, adding hybrid NEG backends with `RATE` and `max-rate-per-endpoint`, and creating a classic global HTTPS load balancer is consistent with current Google Cloud CLI documentation. The local environment did not have `gcloud` installed, so command validation was performed against official Google Cloud CLI documentation.
