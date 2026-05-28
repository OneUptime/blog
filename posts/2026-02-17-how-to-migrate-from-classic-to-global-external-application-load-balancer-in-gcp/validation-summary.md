# Validation Summary: How to Migrate from Classic to Global External Application Load Balancer in GCP

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Google Cloud Load Balancing
- Classic Application Load Balancer
- Global external Application Load Balancer
- Google Cloud CLI (`gcloud`)
- Cloud DNS
- Google Cloud Armor
- Cloud CDN

## Sources Consulted
- Google Cloud Load Balancing migration overview: https://docs.cloud.google.com/load-balancing/docs/https/migrate-to-global
- Migrate resources from classic to global external Application Load Balancer: https://docs.cloud.google.com/load-balancing/docs/https/migrate-from-classic-global
- External Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/https
- Application Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/application-load-balancer
- URL maps overview: https://cloud.google.com/load-balancing/docs/url-map-concepts
- Traffic management for global external Application Load Balancers: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-global-traffic-mgmt
- `gcloud compute forwarding-rules create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- `gcloud compute backend-services update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- `gcloud compute target-https-proxies create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- `gcloud dns record-sets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/update

## Issues Found
- The side-by-side forwarding rule example omitted `--load-balancing-scheme=EXTERNAL_MANAGED`, which would create a classic `EXTERNAL` forwarding rule by default. Added the required flag.
- The HTTPS test command used an IP-address URL with a `Host` header and `--resolve`, which would not set SNI to the application hostname and could fail certificate validation. Changed it to use the hostname URL with `--resolve`.
- The in-place migration section described deleting and recreating the forwarding rule and target proxy. Replaced it with the documented migration-state flow for backend services and forwarding rules.
- Clarified the global external Application Load Balancer implementation as GFE plus Envoy-based capabilities, matching Google Cloud's current wording.
- Removed the mention of circuit breakers from backend service settings because the post does not configure a supported circuit breaker feature for this migration path.
- Added `--global` to the target HTTPS proxy creation example for explicit global resource scope.

## Review Notes
The side-by-side approach is a valid parallel deployment pattern, but Google Cloud's documented no-downtime resource migration path uses migration states on existing backend services, backend buckets, and forwarding rules. Backend buckets require separate attention during in-place migrations because they are migrated through forwarding rule migration state rather than a backend-bucket load balancing scheme.
