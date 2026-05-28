# Validation Summary: How to Configure Load Balancing for WebSocket Applications on Google Cloud

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Application Load Balancer
- Google Cloud Load Balancing backend services
- WebSocket protocol
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Node.js `ws` library
- Express

## Sources Consulted
- Google Cloud external Application Load Balancer WebSocket support: https://docs.cloud.google.com/load-balancing/docs/https#websocket_support
- Google Cloud external Application Load Balancer request distribution, timeouts, and session affinity: https://docs.cloud.google.com/load-balancing/docs/https/request-distribution
- Google Cloud backend services overview: https://docs.cloud.google.com/load-balancing/docs/backend-service
- Google Cloud CLI `gcloud compute backend-services create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud CLI `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud CLI `gcloud compute backend-services add-backend`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud CLI `gcloud compute forwarding-rules create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud connection draining documentation: https://cloud.google.com/load-balancing/docs/enabling-connection-draining
- Google Cloud autoscaling based on load balancing serving capacity: https://docs.cloud.google.com/compute/docs/autoscaler/scaling-load-balancing
- Terraform Google provider `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- `ws` library README and heartbeat example: https://github.com/websockets/ws
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455

## Issues Found
- The post said the Application Load Balancer becomes a transparent TCP proxy after WebSocket upgrade. Updated this to say it proxies bidirectional WebSocket traffic, because Google Cloud documents the Application Load Balancer as a proxy-based Layer 7 load balancer that recognizes WebSocket upgrade requests and then proxies bidirectional traffic.
- The backend timeout discussion implied the timeout should match the maximum connection lifetime for all WebSocket connections. Updated it to distinguish idle WebSocket timeout behavior for global and regional external Application Load Balancers, including the 24-hour active WebSocket limit for global external Application Load Balancers.
- The complete `gcloud` setup created a backend service without `--load-balancing-scheme=EXTERNAL_MANAGED`, while the forwarding rule used `EXTERNAL_MANAGED`. Added the backend service load balancing scheme so the setup consistently creates a global external Application Load Balancer.
- The complete setup added an instance group backend without configuring the named port used by the HTTP backend service. Added `gcloud compute instance-groups managed set-named-ports ws-instance-group --named-ports=http:8080`.
- The Terraform backend service snippet omitted `load_balancing_scheme = "EXTERNAL_MANAGED"`. Added it to match the documented load balancer mode used by the CLI example.
- The autoscaling section described `--target-load-balancing-utilization` as scaling by connection count. Updated it to Google Cloud's documented load balancing serving capacity terminology.

## Review Notes
The Node.js `ws` keepalive and Express health check examples are syntactically valid and align with the `ws` heartbeat pattern. `gcloud` could not be executed locally because the Cloud SDK is not installed in this workspace, so command validation was performed against official Google Cloud CLI reference documentation.
