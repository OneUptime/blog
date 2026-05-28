# Validation Summary: How to Configure Path-Based Routing with Regex Matching

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Application Load Balancers
- Google Cloud URL maps
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- RE2 regular expressions
- YAML URL map configuration

## Sources Consulted
- Google Cloud Load Balancing URL maps overview: https://docs.cloud.google.com/load-balancing/docs/url-map-concepts
- Google Cloud URL maps REST resource reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud URL maps usage and validation guide: https://docs.cloud.google.com/load-balancing/docs/url-map
- Google Cloud CLI `gcloud compute url-maps import` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud CLI `gcloud compute backend-services create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud CLI `gcloud compute backend-services add-backend` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud CLI `gcloud compute health-checks create http` reference: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- Terraform `google_compute_region_url_map` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_url_map
- Google RE2 syntax reference: https://github.com/google/re2/wiki/syntax

## Issues Found
- The post implied regex path matching was generally supported by Google Cloud HTTP(S) Load Balancers. Updated the wording to Application Load Balancers and added the supported-product caveat, because Google Cloud documents regex route matching as unsupported for global external and classic Application Load Balancers.
- The examples mixed global URL map/backend-service scope with a regex feature set better represented by regional Application Load Balancers. Updated the gcloud commands, URL map backend-service references, forwarding-rule lookup, and Terraform resource to use regional resources in `us-central1`.
- The backend service examples did not set a load balancing scheme. Added `--load-balancing-scheme=EXTERNAL_MANAGED` to align the examples with a regional external Application Load Balancer.
- The URL redirect example used unsupported `pathRedirectRegex` and implied regex capture substitution in redirects. Replaced it with supported `pathRedirect` behavior and adjusted the comment to match the resulting redirect.
- The URL rewrite example used `regexMatch` while claiming `pathPrefixRewrite` would strip only `/public`. Changed that match rule to `prefixMatch: "/public/"`, which matches the documented prefix rewrite behavior.
- The request header example placed `requestHeadersToAdd` directly under `routeAction`. Moved it under `headerAction`, which is the URL map field that owns request and response header changes.
- The YAML route timeout values used duration strings (`60s`, `30s`) where the URL map REST shape uses duration objects. Changed them to `seconds` objects.
- The RE2 notes incorrectly said `.*` is non-greedy by default and that `\d` is unsupported. Updated the text to say `.*` is greedy by default, `.*?` is the non-greedy form, and `\d` is supported by RE2.
- The post described only three URL map route-rule path matching types. Added path template matching to avoid omitting a current supported match type.

## Review Notes
The `gcloud` CLI was not installed in the local workspace, so command verification was performed against official Google Cloud CLI documentation instead of local `--help` output.
