# Validation Summary: How to Create CDN Caching Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP caching and Cache-Control
- CDN caching strategies
- Cloudflare Cache/CDN, purge API, Tiered Cache, and GraphQL Analytics API
- AWS CloudFront cache policies and Origin Shield
- Fastly purge API, surrogate keys, and shielding VCL variables
- Express static middleware
- Nginx cache headers and cache status logging
- Webpack content hashing
- GitHub Actions
- Mermaid diagrams

## Sources Consulted
- RFC 9111: HTTP Caching: https://httpwg.org/specs/rfc9111.html
- RFC 5861: HTTP Cache-Control Extensions for Stale Content: https://datatracker.ietf.org/doc/html/rfc5861
- Express serve-static middleware documentation: https://expressjs.com/en/resources/middleware/serve-static/
- Nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Cloudflare cache control documentation: https://developers.cloudflare.com/cache/concepts/cache-control/
- Cloudflare purge by prefix documentation: https://developers.cloudflare.com/cache/how-to/purge-cache/purge_by_prefix/
- Cloudflare purge API documentation: https://developers.cloudflare.com/api/resources/cache/methods/purge/
- Cloudflare Query String Sort documentation: https://developers.cloudflare.com/cache/advanced-configuration/query-string-sort/
- Cloudflare Tiered Cache documentation: https://developers.cloudflare.com/cache/how-to/tiered-cache/
- Cloudflare GraphQL Analytics API documentation: https://developers.cloudflare.com/analytics/graphql-api/
- Cloudflare GraphQL HTTP analytics tutorial: https://developers.cloudflare.com/analytics/graphql-api/tutorials/end-customer-analytics/
- AWS CloudFront CachePolicy QueryStringsConfig documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-cachepolicy-querystringsconfig.html
- AWS CloudFront OriginShield documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-originshield.html
- AWS CloudFront stale cache directives documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html
- Fastly purging API documentation: https://www.fastly.com/documentation/reference/api/purging/
- Fastly surrogate key documentation: https://www.fastly.com/documentation/reference/http/http-headers/Surrogate-Key/
- Fastly req.backend.is_shield documentation: https://www.fastly.com/documentation/reference/vcl/variables/backend-connection/req-backend-is-shield/
- Webpack output documentation: https://webpack.js.org/configuration/output/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- Mermaid flowchart and sequence diagram documentation: https://mermaid.ai/open-source/syntax/flowchart.html and https://mermaid.ai/open-source/syntax/sequenceDiagram.html

## Issues Found
- Nginx examples mixed `expires` with explicit `Cache-Control` headers. Because `expires` itself adds or modifies `Cache-Control`, this can result in duplicate or confusing cache directives. I changed the examples to set the intended `Cache-Control` values explicitly.
- The Cloudflare query string example was labeled as a Page Rules example even though Query String Sort is documented as a cache setting/cache rule capability. I changed the label to "Cloudflare Cache Rules/settings example."
- The Cloudflare prefix purge example used a full URL with scheme. Cloudflare's prefix purge documentation expects host/path prefixes such as `example.com/products`, so I updated the example.
- The Cloudflare Tiered Cache dashboard path used the older Argo wording. I updated it to the current Tiered Cache terminology and dashboard area.
- The Fastly shielding VCL example had comments that inverted the meaning of `req.backend.is_shield` and implied manual shield routing in `vcl_recv`. I changed the example to show `req.backend.is_shield` in `vcl_miss` with accurate comments.
- The Cloudflare analytics command used the old zone analytics dashboard endpoint. I replaced it with the current GraphQL Analytics API endpoint and an `httpRequestsAdaptiveGroups` query pattern from Cloudflare's documentation.
- The Nginx cache status list omitted `UPDATING` and `REVALIDATED`, and the `BYPASS` explanation was too specific. I updated the list to match Nginx's documented `$upstream_cache_status` values.

## Review Notes
The remaining TTL values, cache key guidance, `Cache-Control` directive explanations, Express static options, Webpack content hash example, CloudFront snippets, Fastly purge examples, and GitHub Actions shell usage are technically sound as practical examples. Some vendor capabilities vary by CDN plan and configuration, so production users should still verify availability in their CDN account before applying every option.
