# Validation Summary: How to Compare and Choose Between Premium and Standard Network Service Tiers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Network Service Tiers
- Premium Tier and Standard Tier networking
- Compute Engine external IP addresses and VM access configs
- Google Cloud external Application Load Balancers
- Cloud CDN
- Google Cloud Armor
- Google Cloud CLI

## Sources Consulted
- Google Cloud Network Service Tiers overview: https://cloud.google.com/network-tiers/docs/overview
- Google Cloud Network Service Tiers quickstart: https://cloud.google.com/network-tiers/docs/set-network-tier
- Google Cloud Network Service Tiers pricing: https://cloud.google.com/network-tiers/pricing
- Google Cloud VPC pricing, including Premium Tier internet data transfer: https://cloud.google.com/vpc/pricing
- Google Cloud external Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/https
- Google Cloud load balancer selection summary: https://cloud.google.com/load-balancing/docs/choosing-load-balancer
- Google Cloud regional external Application Load Balancer setup: https://cloud.google.com/load-balancing/docs/https/setup-regional-ext-https-external-backend
- Google Cloud global external Application Load Balancer setup: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-compute
- Google Cloud SDK reference for `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Google Cloud SDK reference for `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference for `gcloud compute instances add-access-config`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config
- Google Cloud SDK reference for `gcloud compute forwarding-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud Armor security policy overview: https://cloud.google.com/armor/docs/security-policy-overview
- Google Cloud Certificate Manager overview: https://cloud.google.com/certificate-manager/docs/overview

## Issues Found
- The pricing example used outdated or imprecise Standard Tier ranges and omitted the current free allowances. Updated the table to use current GiB-based Premium and Standard Tier North America pricing tiers and adjusted the 5 TiB monthly savings estimate to roughly $155.
- The Cloud Armor comparison implied Cloud Armor only works with global load balancers. Updated it to reflect that Cloud Armor is supported for regional external Application Load Balancers through regional policies, while global Cloud Armor protection uses global load balancing.
- The Premium Tier load balancer example reused a regional IP address for a global forwarding rule. Added a separate global Premium Tier IP reservation and updated the forwarding rule to reference it.
- The load balancer examples were missing current external Application Load Balancer flags. Added `--load-balancing-scheme=EXTERNAL_MANAGED`, `--network-tier=PREMIUM` for the global forwarding rule, and regional proxy/network flags for the Standard Tier regional forwarding rule.
- The regional backend service example did not specify the region for a regional health check. Added `--health-checks-region=us-central1`.

## Review Notes
The post is a high-level guide, so the load balancer snippets still assume prerequisite resources such as health checks, URL maps, target proxies, backends, certificates, firewall rules, and a proxy-only subnet for regional external Application Load Balancers already exist. The commands are now aligned with current Google Cloud CLI syntax for the resources shown.
