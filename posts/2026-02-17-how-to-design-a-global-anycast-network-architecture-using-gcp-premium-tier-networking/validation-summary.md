# Validation Summary: How to Design a Global Anycast Network Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Network Service Tiers Premium Tier
- Global external Application Load Balancer
- Compute Engine managed instance groups
- Compute Engine instance templates
- Cloud CDN
- Google Cloud Armor
- Cloud Monitoring dashboards
- Google Cloud CLI

## Sources Consulted
- Google Cloud Load Balancing locations: https://cloud.google.com/load-balancing/docs/locations
- Set up a global external Application Load Balancer with VM instance group backends: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Traffic management for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/setting-up-global-traffic-mgmt
- Network Service Tiers overview: https://cloud.google.com/network-tiers/docs/overview
- Network Service Tiers pricing: https://cloud.google.com/network-tiers/pricing
- Google Cloud Armor rate limiting: https://cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud SDK reference for instance templates: https://cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud SDK reference for SSL certificates: https://cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- Google Cloud SDK reference for target HTTPS proxies: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- Cloud Load Balancing metrics: https://cloud.google.com/load-balancing/docs/metrics
- Cloud Monitoring dashboards API: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards

## Issues Found
- The backend startup script did not create the `/healthz` path used by the HTTP health check. Added a simple `/var/www/html/healthz` response so the configured health check can pass.
- The backend instances were not tagged and no firewall rule was shown for Google health check and load balancer proxy source ranges. Added the `allow-health-check` tag to the instance template and a firewall rule allowing `130.211.0.0/22` and `35.191.0.0/16` to reach TCP port 80.
- The backend service and forwarding rule omitted `--load-balancing-scheme=EXTERNAL_MANAGED`, which is the documented scheme for global external Application Load Balancers. Added the flag to both commands.
- The global address and forwarding rule did not explicitly set Premium Tier. Premium Tier is the default, but the article is specifically about Premium Tier anycast behavior, so the commands now include `--network-tier=PREMIUM`.
- The monitoring dashboard used the frontend `https/request_count` metric while describing traffic by backend. Changed it to `https/backend_request_count` and added aggregation grouped by `resource.label.backend_target_name`.
- The post said Premium Tier costs "about $0.01 more per GB." Network Service Tiers pricing varies by region and usage volume, so the statement was replaced with a recommendation to check current pricing.
- Several explanations said traffic always routes to the nearest backend. Updated wording to include the documented capacity condition: closest healthy backend with available capacity.

## Review Notes
The examples assume that `my-vpc` and the regional subnets already exist, and that DNS for `app.example.com` is pointed at the reserved global IP before the Google-managed certificate can become active. The Cloud Armor rate-limit example is syntactically consistent with the documented rate-based ban command pattern, but production thresholds should be tuned from traffic data.
