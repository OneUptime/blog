# Validation Summary: How to Configure CloudFront Behaviors and Cache Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudFront
- CloudFront cache behaviors
- CloudFront cache policies
- CloudFront origin request policies
- AWS CLI
- HTTP caching headers

## Sources Consulted
- Amazon CloudFront Developer Guide: Cache behavior settings - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html
- Amazon CloudFront Developer Guide: Quotas - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
- Amazon CloudFront Developer Guide: Understand cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html
- Amazon CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Amazon CloudFront Developer Guide: Understand origin request policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-request-understand-origin-request-policy.html
- Amazon CloudFront API Reference: CacheBehavior - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CacheBehavior.html
- Amazon CloudFront API Reference: CacheBehaviors - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CacheBehaviors.html
- Amazon CloudFront API Reference: CachedMethods - https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CachedMethods.html
- AWS CLI Command Reference: create-cache-policy - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-cache-policy.html
- AWS CLI Command Reference: create-origin-request-policy - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-origin-request-policy.html

## Issues Found
- The post said a distribution can have up to 25 additional cache behaviors. AWS's current quota lists 75 cache behaviors per distribution, so the statement was updated.
- The `CacheBehaviors` JSON example used simple arrays for `AllowedMethods` and a separate top-level `CachedMethods` field. In the CloudFront API shape, `AllowedMethods` is an object and `CachedMethods` is nested under it with `Quantity` and `Items`. The example was corrected.
- The `CachingOptimized` description said query strings are included in the cache key. AWS's managed policy documentation says this policy includes no query strings or cookies and only includes the normalized `Accept-Encoding` header because compressed object caching is enabled. The description was corrected.
- The `CachingDisabled` description said everything passes through to the origin. AWS documents this policy as setting all TTLs to zero and not including headers, cookies, or query strings in the cache key. The text now clarifies that forwarding still requires an origin request policy.
- The custom cache policy explanation said unlisted values are ignored only for caching. Because cache policy values are also forwarded to the origin, the text now clarifies that unlisted values are not forwarded unless an origin request policy includes them.

## Review Notes
The CLI examples for creating cache policies and origin request policies match the current AWS CLI JSON shapes. The initial `get-distribution-config` example is syntactically valid, but a future revision could add the follow-up `update-distribution --if-match <ETag>` workflow for completeness.
