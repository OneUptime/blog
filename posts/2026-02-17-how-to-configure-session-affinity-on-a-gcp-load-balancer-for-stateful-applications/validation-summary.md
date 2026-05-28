# Validation Summary: How to Configure Session Affinity on a GCP Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud Application Load Balancers
- Google Cloud passthrough Network Load Balancers
- Google Cloud CLI
- Compute Engine backend services API
- Terraform Google provider

## Sources Consulted
- Google Cloud Load Balancing: Request distribution for external Application Load Balancers: https://docs.cloud.google.com/load-balancing/docs/https/request-distribution
- Google Cloud SDK: `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Compute Engine REST API: backendServices resource: https://docs.cloud.google.com/compute/docs/reference/rest/v1/backendServices
- Google Cloud Load Balancing: Set up a regional external Application Load Balancer with VM instance group backends: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-reg-ext-https-lb
- Google Cloud Load Balancing: Traffic distribution for external passthrough Network Load Balancers: https://docs.cloud.google.com/load-balancing/docs/network/ext-netlb-traffic-distribution
- Google Cloud Load Balancing: Traffic distribution for internal passthrough Network Load Balancers: https://docs.cloud.google.com/load-balancing/docs/internal/int-netlb-traffic-distribution
- Terraform Registry: `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service

## Issues Found
- Corrected the `NONE` session affinity description. Google Cloud uses packet/request hashing for backend selection; it is not simply round-robin distribution.
- Clarified tuple hashing descriptions for `CLIENT_IP`, `CLIENT_IP_PROTO`, and `CLIENT_IP_PORT_PROTO` so they include destination address/port fields where applicable.
- Replaced the invalid header-based affinity `gcloud` example. The previous command used `--custom-request-headers=""`, but the current CLI flag is singular and header affinity also requires `consistentHash.httpHeaderName`. The post now shows an API patch body and Terraform configuration.
- Added `locality_lb_policy = "RING_HASH"` to Terraform examples for `HEADER_FIELD` and `HTTP_COOKIE`, because those affinity modes require `RING_HASH` or `MAGLEV`.
- Corrected HTTP cookie affinity wording. Google Cloud can generate the named cookie when the client does not provide it; it is not strictly an existing application-set cookie.
- Corrected generated cookie details to mention `GCLB` versus `GCILB` cookie names based on load balancer family and removed the unverified `HttpOnly` attribute from the expected curl output.
- Clarified that internal passthrough Network Load Balancers support IP-based affinity options, while internal HTTP(S) Application Load Balancers support generated cookie affinity.

## Review Notes
The post remains a general guide. Exact supported affinity values vary by load balancer family, scope, protocol, and backend service type, so future improvements could add a compatibility matrix for classic, global external, regional external, internal Application, external passthrough, and internal passthrough load balancers.
