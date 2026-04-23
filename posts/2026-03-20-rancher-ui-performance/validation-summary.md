# Validation Summary: How to Reduce Rancher UI Load Time

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- NGINX
- Amazon CloudFront
- HTTP/2
- Browser caching
- Lighthouse
- `curl`
- `jq`

## Sources Consulted
- Rancher: Docker Install with TLS Termination at Layer-7 NGINX Load Balancer
  https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/advanced-user-guides/configure-layer-7-nginx-load-balancer
- Rancher: Feature Flags
  https://documentation.suse.com/cloudnative/rancher-manager/v2.12/en/installation-and-upgrade/references/feature-flags.html
- Rancher: Enabling Experimental Features
  https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/rancher-admin/experimental-features/experimental-features.html
- Rancher: UI Server-Side Pagination
  https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/ui-server-side-pagination
- Rancher: Previous v3 API Guide
  https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher: RK-API Quick Start Guide
  https://ranchermanager.docs.rancher.com/v2.14/api/quickstart
- Rancher generated client types for `Feature` and `Setting`
  https://raw.githubusercontent.com/rancher/rancher/release/v2.12/pkg/client/generated/management/v3/zz_generated_feature.go
  https://raw.githubusercontent.com/rancher/rancher/release/v2.12/pkg/client/generated/management/v3/zz_generated_setting.go
- NGINX: `ngx_http_v2_module`
  https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX: `ngx_http_core_module` (`early_hints`)
  https://nginx.org/en/docs/http/ngx_http_core_module.html#early_hints
- NGINX: WebSocket proxying
  https://nginx.org/en/docs/http/websocket.html
- NGINX: `ngx_http_upstream_module` (`keepalive`)
  https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- AWS CloudFront API Reference: `DistributionConfig`
  https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DistributionConfig.html
- AWS CloudFront API Reference: `CustomOriginConfig`
  https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CustomOriginConfig.html
- AWS CLI: `cloudfront create-distribution`
  https://docs.aws.amazon.com/cli/v1/reference/cloudfront/create-distribution.html
- AWS CloudFront Developer Guide: managed cache policies
  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront Developer Guide: managed origin request policies
  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html

## Issues Found
- The CloudFront CLI example was not a valid `create-distribution` payload. It omitted required `DistributionConfig` fields such as `CallerReference`, `Comment`, `Enabled`, `Origins.Quantity`, and `DefaultCacheBehavior`. I replaced it with a valid file-based example that leaves dynamic requests uncached and caches only `dashboard/assets/*`.
- The post recommended `http2_push`, but NGINX marks `http2_push` obsolete since 1.25.1. I replaced that section with preload-hint guidance using `Link` headers.
- The Rancher feature-flag commands used the wrong API surface: `/v3/settings/feature-gates` and `ui-legacy` were not the documented feature-flag endpoints. I replaced them with documented `/v3/features/...` calls and corrected the payload type to booleans.
- The post used `istio=false,legacy=false` as a generic feature-gate value, but Rancher documents `legacy` and `ui-sql-cache` as individual feature flags, and `ui-sql-cache` is the performance-related flag relevant to UI scalability. I changed the examples accordingly.
- The API pagination example used `marker=0`, which is not how Rancher documents pagination. I replaced it with a `limit` example and inspection of the returned `.pagination` object.
- The Lighthouse extraction command referenced `.audits["time-to-interactive"]`, but current Lighthouse output uses the `interactive` audit ID. I corrected the `jq` query.
- The NGINX reverse-proxy example was missing Rancher’s documented forwarded headers and used an unconditional `Connection "upgrade"` header. I corrected it to use the documented upgrade map and forwarded headers.
- The NGINX example combined upstream keepalive with a configuration that would not reliably use it on older NGINX versions. I added the required HTTP/1.1 upstream settings on the cacheable asset location.
- The browser-cache section assumed long-lived immutable caching and a specific `ETag` for generic asset URLs. I reduced the example to a 7-day cache policy and removed the hard `ETag` expectation.
- The conclusion claimed a specific 40-60% performance improvement without an authoritative source. I softened that to a qualitative statement.

## Review Notes
- Rancher introduced the Rancher Kubernetes API (RK-API) in v2.8.0. The post still uses the previous v3 API where Rancher’s own feature-flag docs do, but readers should treat v3 API automation as version-sensitive.
- `ui-sql-cache` is optional and enabled by default in current Rancher documentation; the command in the post is useful mainly to verify or restore the setting.
- The preload example assumes the Rancher shell is served from `/dashboard/` and that the referenced asset paths match the deployed build. Operators should confirm the exact asset paths in their own deployment before hard-coding preload headers.
