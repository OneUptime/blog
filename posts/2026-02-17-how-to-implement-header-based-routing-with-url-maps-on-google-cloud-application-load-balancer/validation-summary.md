# Validation Summary: Use Header-Based Routing with URL Maps on Google Cloud Application Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Application Load Balancer
- Google Cloud URL maps
- URL map route rules and header matches
- Google Cloud backend services and health checks
- Google Cloud CLI
- HTTP header routing and header transformations

## Sources Consulted
- Google Cloud URL maps REST API reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud URL maps overview: https://docs.cloud.google.com/load-balancing/docs/url-map-concepts
- Google Cloud traffic management for global external Application Load Balancers: https://docs.cloud.google.com/load-balancing/docs/https/traffic-management-global
- Google Cloud CLI `gcloud compute url-maps import` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import

## Issues Found
- The URL map import examples used `--source=-`. The official `gcloud compute url-maps import` documentation says to omit `--source` when reading the YAML configuration from standard input. I changed the heredoc examples to omit `--source`.
- The URL map import examples referenced global backend services but did not pass `--global`. The official CLI accepts `--global` or `--region`; omitting both can trigger regional selection behavior. I added `--global` to the global URL map examples.
- The regex header matching example used global backend services and implied regex header matching works on global external Application Load Balancers. The URL map API reference limits route/header regex matching to `INTERNAL_SELF_MANAGED`, regional `EXTERNAL_MANAGED`, and `INTERNAL_MANAGED` load balancing schemes. I changed the regex example to use a regional URL map and regional backend service references, and added a caveat for global external Application Load Balancers.
- The summary and header match list described regex matching as generally available. I narrowed the wording to make clear that regex matching is available only where supported.

## Review Notes
The examples that reference backend services such as `eu-enterprise-backend`, `unauthenticated-backend`, `bot-backend`, and `premium-backend` assume those backend services already exist. The main setup section creates only the default, API v2, mobile, and debug backend services.
