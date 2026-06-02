# Validation Summary: How to Set Up Amplify Custom Headers and Cache Control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Amplify Hosting
- HTTP response headers
- Cache-Control
- Security headers
- CORS
- X-Robots-Tag
- curl
- npm/npx

## Sources Consulted
- AWS Amplify Hosting: Setting custom headers: https://docs.aws.amazon.com/amplify/latest/userguide/setting-custom-headers.html
- AWS Amplify Hosting: Custom header YAML reference: https://docs.aws.amazon.com/amplify/latest/userguide/custom-header-YAML-format.html
- AWS Amplify Hosting: Using the Cache-Control header to increase app performance: https://docs.aws.amazon.com/amplify/latest/userguide/Using-headers-to-control-cache-duration.html
- AWS Amplify Hosting: Monorepo custom header requirements: https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-custom-headers.html
- MDN: Cache-Control header: https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Cache-Control
- MDN: CORS multiple Access-Control-Allow-Origin values are not allowed: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSMultipleAllowOriginNotAllowed
- MDN: X-XSS-Protection header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN: Strict-Transport-Security header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- MDN: X-Frame-Options header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN: X-Content-Type-Options header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options
- MDN: X-Robots-Tag header: https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/X-Robots-Tag
- npm: is-website-vulnerable package usage: https://www.npmjs.com/package/is-website-vulnerable

## Issues Found
- The post described CORS as controlling which domains can make API calls. Updated this to say CORS controls which origins can read responses, matching browser CORS behavior.
- The SEO header bullet mentioned canonical URLs, but the post only covered crawler indexing directives through `X-Robots-Tag`. Removed the canonical URL claim.
- The `stale-while-revalidate` explanation stated the behavior as unconditional. Updated it to say supporting caches may serve stale responses while revalidating.
- The security header example recommended `X-XSS-Protection: 1; mode=block` as protection for older browsers. MDN marks this header deprecated and warns it can create vulnerabilities, so the example now disables the legacy filter with `X-XSS-Protection: 0` and points to CSP for XSS mitigation.
- The CSP example allowed both `unsafe-inline` and `unsafe-eval` for scripts. Tightened the example to a safer baseline and added `frame-ancestors 'none'`.
- The HSTS comment said it forces HTTPS. Clarified that HSTS requires HTTPS after the first secure response and noted that `preload` should only be used when the domain is intended for preload submission and all subdomains support HTTPS.
- The multiple-origin CORS guidance suggested Lambda@Edge. Replaced it with application/API-level origin validation and single-origin response behavior, which matches the `Access-Control-Allow-Origin` requirements.
- The complete example used brace-style extension patterns such as `*.{png,jpg,...}`. AWS's documented examples show individual wildcard path patterns, so the configuration was expanded into separate patterns per extension.
- The complete example used `*.html`, which only covers root-level HTML paths. Updated it to `**/*.html` and added `/` for the root document.
- The CloudFront gotcha implied users should check CloudFront distribution settings. Amplify Hosting is managed, and AWS documents more directly relevant behavior for custom `Cache-Control` headers, so this was replaced with the documented `200 OK` and `s-maxage` caveat.
- The branch-specific header guidance implied console branch overrides. Updated it to clarify that the deployed branch's `customHttp.yml` is used and file-based headers override console headers.

## Review Notes
The post is technically relevant and contains implementation details. The remaining examples are still general-purpose; real applications should test CSP and cache behavior against their actual asset paths, framework output, and third-party dependencies.
