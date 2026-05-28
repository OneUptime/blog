# Validation Summary: How to Build a Global Anycast Architecture for Low-Latency Applications on GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud global external Application Load Balancer
- Anycast IP addressing
- Compute Engine managed instance groups
- Google Cloud health checks and firewall rules
- Cloud CDN
- Google Cloud Armor
- Cloud Monitoring uptime checks and dashboards
- Google Cloud CLI

## Sources Consulted
- Google Cloud Load Balancing overview: https://cloud.google.com/load-balancing/docs/load-balancing-overview
- External Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/https
- Set up a global external Application Load Balancer with VM instance group backends: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- gcloud compute backend-services create reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- gcloud compute forwarding-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- gcloud compute instance-groups managed set-named-ports reference: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-named-ports
- Google Cloud Load Balancing health checks documentation: https://cloud.google.com/load-balancing/docs/health-checks
- Google Cloud Armor rate limiting documentation: https://cloud.google.com/armor/docs/configure-rate-limiting
- Cloud Monitoring uptime checks documentation: https://cloud.google.com/monitoring/uptime-checks
- gcloud monitoring uptime create reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create

## Issues Found
- The startup script configured a health check at `/health` but only created `/var/www/html/index.html`. I added `/var/www/html/health` so the health check can pass.
- The managed instance groups did not set the `http:80` named port required by the backend service's `--port-name=http`. I added named-port commands for each regional MIG.
- The load-balanced instances had the `http-server` network tag, but no firewall rule allowed Google Cloud health checker source ranges to reach port 80. I added the health-check firewall rule.
- The forwarding rule omitted `--load-balancing-scheme=EXTERNAL_MANAGED` and `--network-tier=PREMIUM`, which are required for the intended global external Application Load Balancer configuration. I added both flags.
- The Cloud Armor rate-limit rule omitted a match condition and rate-limit key. I added `--src-ip-ranges="*"` and `--enforce-on-key=IP`, matching the documented throttling pattern.
- The Cloud Monitoring uptime-check command used unsupported `--display-name` and `--uri` flags. I replaced it with the documented positional display name, `uptime-url` resource labels, protocol, path, period in minutes, and timeout in seconds.
- The post stated that Google Cloud's edge spans over 140 locations and that traffic takes the shortest path to backends. I changed this to the documented Google Front End wording and clarified that anycast routes to the frontend, while backend selection depends on health, capacity, load balancing, and proximity.
- The cost section implied that global external Application Load Balancers can choose Standard Tier by region. I corrected this because global external Application Load Balancers require Premium Tier.

## Review Notes
The example still uses a single reusable instance template that prints `Region: us-central1` in all regions. That does not break the load balancer setup, but a production tutorial could use per-region templates or startup metadata if region-specific responses matter.
