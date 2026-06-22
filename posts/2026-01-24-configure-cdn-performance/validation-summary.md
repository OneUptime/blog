# Validation Summary: How to Configure CDN for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CDN caching and invalidation
- HTTP Cache-Control headers
- nginx
- Express.js
- Cloudflare Workers, Cache API, Page Rules API, and purge API
- AWS CloudFront and CloudFormation
- webpack
- Python requests and boto3
- Browser Resource Timing API

## Sources Consulted
- Cloudflare Workers Cache API: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Cloudflare Cache Rules: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Cloudflare purge cache documentation: https://developers.cloudflare.com/cache/how-to/purge-cache/
- Cloudflare purge cache API: https://developers.cloudflare.com/api/resources/cache/methods/purge/
- Cloudflare HTTP headers, including CF-IPCountry: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- AWS CloudFormation AWS::CloudFront::Distribution DistributionConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-distributionconfig.html
- AWS CloudFormation AWS::CloudFront::CachePolicy: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-cachepolicy.html
- AWS CloudFormation CloudFront HeadersConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-cachepolicy-headersconfig.html
- AWS CloudFront managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront managed origin request policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html
- Boto3 CloudFront create_invalidation documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudfront.html
- nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Express serve-static middleware documentation: https://expressjs.com/en/resources/middleware/serve-static/
- webpack output documentation: https://webpack.js.org/configuration/output/
- webpack asset modules documentation: https://webpack.js.org/guides/asset-modules/
- MDN Cache-Control reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- MDN PerformanceResourceTiming transferSize documentation: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize

## Issues Found
- The Cloudflare Worker custom caching example used `event.waitUntil(...)` inside `handleRequest(request)`, where `event` was out of scope. Changed the handler to pass the event object and derive `request` inside the function.
- The Cloudflare Worker Cache API examples could attempt to cache non-GET requests and responses with `Set-Cookie`. Added GET guards and only write successful responses without `Set-Cookie` to the cache.
- The CloudFront CloudFormation example referenced undefined `S3Bucket` and `CloudFrontOAI` values. Added parameters and updated the references to use those parameters.
- The CloudFront API behavior was labeled "no caching" but used a custom cache policy with `MaxTTL: 1`, which is not truly disabled. Replaced it with AWS's managed `CachingDisabled` cache policy and added a managed origin request policy for API forwarding.
- The edge personalization example treated `EU` as a possible `CF-IPCountry` value. Cloudflare documents `CF-IPCountry` as a two-character country code, so the example now maps EU member country codes explicitly.
- The Resource Timing example treated `transferSize === 0` as a cache hit. MDN documents that cross-origin resources without `Timing-Allow-Origin` can also report zero, so the example now checks `decodedBodySize > 0` and explains the caveat.

## Review Notes
JavaScript, bash, and Python snippets were syntax checked successfully. `cfn-lint` was not installed in the review environment, so CloudFormation schema validation was performed against AWS documentation rather than with the linter. Cloudflare Page Rules remain documented, but Cloudflare recommends Cache Rules for newer configurations.
