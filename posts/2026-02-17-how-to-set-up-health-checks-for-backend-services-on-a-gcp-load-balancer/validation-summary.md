# Validation Summary: How to Set Up Health Checks for Backend Services on a GCP Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud health checks
- Google Cloud CLI (`gcloud`)
- Backend services
- Instance groups and named ports
- HTTP, HTTPS, HTTP/2, TCP, SSL, and gRPC health checks
- Node.js / Express health check endpoint

## Sources Consulted
- Google Cloud Load Balancing health checks overview: https://docs.cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud Load Balancing use health checks guide: https://docs.cloud.google.com/load-balancing/docs/health-checks
- Google Cloud CLI reference for `gcloud compute health-checks create http`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- Google Cloud CLI reference for `gcloud compute health-checks create https`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/https
- Google Cloud CLI reference for `gcloud compute health-checks create tcp`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/tcp
- Google Cloud CLI reference for `gcloud compute health-checks create grpc`: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/grpc
- Google Cloud CLI reference for `gcloud compute backend-services create`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud CLI reference for `gcloud compute backend-services update`: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud CLI reference for `gcloud compute instance-groups set-named-ports`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-groups/set-named-ports

## Issues Found
- The protocol table described HTTP/2 health checks as a gRPC health check option. Google Cloud documentation says backend services that use the gRPC protocol should use only gRPC or TCP health checks, so the HTTP/2 row was corrected to HTTP/2 backends.
- The protocol table omitted gRPC with TLS even though Google Cloud lists `GRPC_WITH_TLS` as a supported health check protocol. Added a gRPC with TLS row.
- The HTTP health check success criteria said any 200-range status code is successful. Google Cloud requires HTTP `200 OK`; other status codes are unhealthy. Updated the wording.
- The named ports section implied named ports are useful when different instances in the same instance group serve on different ports. Google Cloud named ports are instance group metadata used by load balancers. Updated the explanation to say health checks can follow the backend service's named port.
- The opening health check details treated `130.211.0.0/22` and `35.191.0.0/16` as the complete universal probe range set and oversimplified probe source regions. Updated the wording to refer to documented prober ranges and load-balancer-specific scope/source-region behavior.
- The firewall troubleshooting step listed only `130.211.0.0/22` and `35.191.0.0/16`. Those are common IPv4 probe ranges, but some load balancer types use additional ranges. Updated the guidance to check the ranges for the specific load balancer type.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command verification was performed against current official Google Cloud CLI reference pages and Cloud Load Balancing documentation. The example commands use current non-legacy health check commands and valid flags.
