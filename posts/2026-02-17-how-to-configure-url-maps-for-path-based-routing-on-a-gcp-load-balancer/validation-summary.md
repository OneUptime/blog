# Validation Summary: How to Configure URL Maps for Path-Based Routing on a GCP Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Cloud Load Balancing
- URL maps
- Backend services
- Google Cloud CLI
- YAML configuration

## Sources Consulted
- Google Cloud Load Balancing URL maps overview: https://cloud.google.com/load-balancing/docs/url-map-concepts
- Google Cloud CLI `gcloud compute url-maps add-path-matcher` reference: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/add-path-matcher
- Google Cloud CLI `gcloud compute url-maps import` reference: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud CLI `gcloud compute url-maps export` reference: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/export
- Google Cloud CLI `gcloud compute url-maps validate` reference: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/validate
- Google Cloud CLI `gcloud compute backend-services create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Compute Engine URL maps REST resource reference: https://cloud.google.com/compute/docs/reference/rest/v1/urlMaps

## Issues Found
- The basic `gcloud compute url-maps add-path-matcher` example added a path matcher but did not tie it to a host rule. Added `--new-hosts="*"` so the path matcher is associated with a catch-all host rule and is used for incoming requests.
- The viewing/debugging section described exporting YAML but used `gcloud compute url-maps describe`. Replaced it with `gcloud compute url-maps export my-url-map --destination=my-url-map.yaml --global`, which produces the YAML file expected by the following validation command.
- The path matching pitfall incorrectly said path matching is prefix-based by default and that `/api` would match `/api/users` and `/apiary`. Updated it to reflect Google Cloud URL map behavior: exact path rules match exact paths, and `/*` wildcard path rules match the longest matching path prefix.

## Review Notes
The examples use global URL maps and global backend services, which is appropriate for global external and classic Application Load Balancers. Some advanced URL map features vary by load balancer type, especially regular expression matching, so future updates could add load-balancer-specific caveats if the post expands its regex examples.
