# Validation Summary: How to Integrate CDN for Better Performance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Content Delivery Networks (CDNs)
- Cloudflare Cache Rules and cache purge API
- AWS CloudFront distributions, cache policies, and invalidations
- Terraform AWS provider resources
- Python, Flask, requests, and boto3
- Express.js static file and cache-control middleware
- webpack and mini-css-extract-plugin
- HTTP Cache-Control, ETag, Vary, and Cache-Tag headers

## Sources Consulted
- Cloudflare Cache Rules documentation: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Cloudflare Cache Rules available settings: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
- Cloudflare purge cache documentation: https://developers.cloudflare.com/cache/how-to/purge-cache/
- Cloudflare purge by cache-tags documentation: https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/
- AWS CloudFront cache expiration documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html
- AWS CloudFront cache and origin request policy behavior: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-how-origin-request-policies-and-cache-policies-work-together.html
- AWS CloudFront cache key documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html
- AWS CloudFront custom headers / Authorization forwarding documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html
- boto3 CloudFront create_invalidation documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudfront/client/create_invalidation.html
- boto3 CloudFront invalidation_completed waiter documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudfront/waiter/InvalidationCompleted.html
- Terraform AWS provider CloudFront distribution documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider CloudFront cache policy documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Express serve-static middleware documentation: https://expressjs.com/en/resources/middleware/serve-static/
- webpack mini-css-extract-plugin documentation: https://webpack.js.org/plugins/mini-css-extract-plugin/
- MDN Cache-Control header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control

## Issues Found
- The Cloudflare caching example used legacy Page Rules terminology and settings. Updated it to current Cache Rules terminology with `set_cache_settings`, `cache`, `edge_ttl`, and `browser_ttl` fields.
- The Cloudflare purge helper described prefix and cache-tag purging as Enterprise-only. Cloudflare's current purge documentation lists URL, hostname, tag, prefix, and purge-everything options across plans with plan-specific limits, so the comments were corrected.
- The CloudFront Terraform snippet referenced `aws_cloudfront_cache_policy.default`, `aws_cloudfront_origin_request_policy.default`, and `aws_cloudfront_origin_request_policy.api` without defining them. Added a default cache policy and removed unnecessary undefined origin request policy references; CloudFront automatically forwards values included in the cache key to origin requests.
- The CloudFront section said it used origin cache headers without noting cache policy TTL bounds. Clarified that CloudFront uses origin cache headers within the configured policy's TTL limits.
- The origin cache-header section said the CDN respects origin cache headers as an absolute statement. Adjusted the wording because CDN policies can override or bound origin cache directives.
- The Flask snippet used `jsonify` without importing it. Added the missing import.
- The webpack snippet used `MiniCssExtractPlugin` without importing the plugin. Added the required `require('mini-css-extract-plugin')` line.
- The dynamic API caching decorator set a `Surrogate-Key` header and checked cache tags on the undecorated function, so the later `get_product.cache_tags = 'products'` assignment would not be used. Updated the snippet to emit Cloudflare's `Cache-Tag` header and read the attribute from the decorated wrapper.

## Review Notes
Terraform was not installed in the review environment, so the Terraform example was reviewed against provider documentation but not validated with `terraform validate`. Several snippets intentionally use placeholder application functions such as `get_products()`, `generate_etag()`, and `authenticateUser`; those are acceptable for illustrative blog code but would need real implementations in a runnable sample application.
