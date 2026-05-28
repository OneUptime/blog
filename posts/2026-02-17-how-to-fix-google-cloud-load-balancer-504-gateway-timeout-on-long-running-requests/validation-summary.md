# Validation Summary: Fix Google Cloud Load Balancer 504 Gateway Timeout on Long-Running Requests

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Application Load Balancers
- Google Cloud backend services and URL maps
- Google Cloud CLI
- WebSockets, Server-Sent Events, and gRPC streaming
- Nginx
- Gunicorn
- Node.js HTTP server
- Flask
- Cloud Tasks
- Pub/Sub-style job queue architecture

## Sources Consulted
- Google Cloud Load Balancing backend services overview: https://docs.cloud.google.com/load-balancing/docs/backend-service
- Google Cloud external Application Load Balancer request distribution, timeouts, retries, and WebSockets: https://docs.cloud.google.com/load-balancing/docs/https/request-distribution
- Google Cloud internal Application Load Balancer timeouts and retries: https://cloud.google.com/load-balancing/docs/l7-internal
- Google Cloud Compute Engine URL maps REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud SDK `gcloud compute backend-services update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK `gcloud compute url-maps export` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/export
- Google Cloud SDK `gcloud compute url-maps import` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud SDK `gcloud tasks queues create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/create
- Node.js HTTP server API reference: https://nodejs.org/api/http.html

## Issues Found
- The post stated that Application Load Balancer backend service timeouts max out at 86400 seconds for global, regional, and internal Application Load Balancers. Updated this to reflect the documented backend service timeout range of 1 to 2,147,483,647 seconds, while noting the effective 86400-second limit for global external and classic Application Load Balancers and the practical caveat that long-lived TCP connections are not guaranteed.
- The post implied all listed timeout checkpoints can trigger a 504. Updated the wording to say any checkpoint can fail the request, while backend service or route timeouts commonly surface as 504 responses.
- The post treated the 30-second backend service timeout as universal. Updated the wording to clarify that 30 seconds is the default for most backend types, because serverless NEG backends have different defaults.
- The WebSocket/SSE section said streaming timeout must be configured separately and that the backend service timeout is only idle timeout for Global External Application Load Balancers. Updated it to match Google Cloud behavior: active WebSocket connections do not use the configured backend service timeout, idle WebSocket connections close after the backend service timeout, and global external active WebSocket connections have a fixed 24-hour limit.
- The Node.js snippet said `server.timeout` defaults to 2 minutes. Updated the comment because current Node.js defaults `server.timeout` to 0, though older versions used 120 seconds.
- The Flask job queue example used `request.json` without importing `request`. Added the missing import.
- The Flask SSE example used `json.dumps` without importing `json`. Added the missing import.

## Review Notes
The core troubleshooting approach is sound: increase the backend service or route timeout when the backend legitimately needs more time, align backend server timeouts, and prefer asynchronous job patterns for operations that run for many minutes. `gcloud` was not installed in the local environment, so CLI validation was performed against the official Google Cloud SDK reference pages.
