# Validation Summary: How to Set Up a TCP Proxy Load Balancer for Non-HTTP Workloads in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud external proxy Network Load Balancer / TCP proxy
- Google Cloud target TCP proxy and target SSL proxy
- Google Cloud backend services
- Google Cloud health checks
- Google Cloud forwarding rules and firewall rules
- PROXY protocol v1
- Python socket programming

## Sources Consulted
- Google Cloud: External proxy Network Load Balancer overview: https://cloud.google.com/load-balancing/docs/tcp
- Google Cloud: Set up a classic proxy Network Load Balancer (TCP proxy) with VM instance group backends: https://cloud.google.com/load-balancing/docs/tcp/setting-up-tcp
- Google Cloud: Set up a global external proxy Network Load Balancer (TCP proxy) with VM instance group backends: https://cloud.google.com/load-balancing/docs/tcp/set-up-global-ext-proxy-tcp
- Google Cloud: Forwarding rules overview and port specifications: https://cloud.google.com/load-balancing/docs/forwarding-rule-concepts
- Google Cloud SDK: gcloud compute forwarding-rules create: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK: gcloud compute backend-services create: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK: gcloud compute backend-services add-backend: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK: gcloud compute health-checks create tcp: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/tcp
- Google Cloud: Backend services overview, named ports, protocols, timeouts, and session affinity: https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud: Proxy Network Load Balancer logging and monitoring: https://cloud.google.com/load-balancing/docs/tcp/tcp-ssl-proxy-logging-monitoring

## Issues Found
- The backend service examples omitted `--port-name`, but proxy Network Load Balancers using instance group backends require the backend service to reference a named port. Added `--port-name` values matching the intended backend service ports.
- The backend service examples did not explicitly set `--load-balancing-scheme=EXTERNAL` or `--global-health-checks`, while the documented classic global TCP proxy setup includes those flags for the shown resource model. Added them to the backend service commands.
- The backend add commands omitted balancing settings shown in the official setup flow. Added `--balancing-mode=UTILIZATION` and `--max-utilization=0.8`.
- The forwarding rule examples omitted `--load-balancing-scheme=EXTERNAL`. Added it to match the classic global TCP proxy load balancer setup.
- The post incorrectly stated that a target TCP proxy forwarding rule can specify multiple ports or port ranges. Google Cloud forwarding rules for target TCP and SSL proxies can reference exactly one port. Replaced the port range example with a separate forwarding rule for an additional non-overlapping port.
- The firewall rules used `--target-tags=tcp-backend` but the post did not say that backend instances need that network tag. Added a note to align the firewall target with the actual backend instance tags.
- The PROXY protocol section did not mention health checks. Added the documented caveat that if health checks use the same port and the backend expects PROXY protocol, the health check should use `--proxy-header=PROXY_V1` too.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference pages and Google Cloud load balancing documentation rather than local `--help` output.
