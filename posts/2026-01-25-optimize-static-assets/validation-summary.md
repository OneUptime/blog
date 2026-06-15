# Validation Summary: How to Optimize Static Assets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Webpack
- terser-webpack-plugin and Terser
- compression-webpack-plugin, gzip, and Brotli
- JavaScript ES modules, tree shaking, and dynamic imports
- React, React Router, and code splitting
- PostCSS, cssnano, Tailwind CSS, and PurgeCSS
- Sharp image processing
- Responsive images, lazy loading, and font preloading
- fontTools pyftsubset
- Nginx cache headers
- AWS CloudFront and CloudFormation
- Web Performance APIs and web-vitals

## Sources Consulted
- Webpack optimization documentation: https://webpack.js.org/configuration/optimization/
- Webpack SplitChunksPlugin documentation: https://webpack.js.org/plugins/split-chunks-plugin/
- CompressionWebpackPlugin documentation: https://webpack.js.org/plugins/compression-webpack-plugin/
- Terser options documentation: https://terser.org/docs/options/
- React lazy documentation: https://react.dev/reference/react/lazy
- React Router Link documentation: https://reactrouter.com/api/components/Link
- Tailwind CSS content configuration: https://v3.tailwindcss.com/docs/content-configuration
- Tailwind CSS class detection documentation: https://tailwindcss.com/docs/detecting-classes-in-source-files
- PurgeCSS PostCSS plugin documentation: https://purgecss.com/plugins/postcss
- Sharp output API documentation: https://sharp.pixelplumbing.com/api-output/
- MDN img element documentation: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
- MDN rel=preload documentation: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload
- MDN Cache-Control documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- Nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- AWS CloudFormation CloudFront Distribution documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-distribution.html
- AWS CloudFormation CloudFront CacheBehavior documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-cachebehavior.html
- AWS CloudFormation CloudFront CachePolicy documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-cachepolicy.html
- AWS CloudFront managed cache policies documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- web.dev Web Vitals documentation: https://web.dev/articles/vitals
- web-vitals package documentation: https://github.com/GoogleChrome/web-vitals
- fontTools subset documentation: https://fonttools.readthedocs.io/en/latest/subset/
- Google WebP FAQ: https://developers.google.com/speed/webp/faq
- Can I Use AVIF/WebP browser support data: https://caniuse.com/

## Issues Found
- The tree-shaking package.json example used comments and duplicate `sideEffects` keys inside one object. I split it into two valid alternatives and adjusted the lodash imports/usages so the JavaScript module is syntactically valid.
- The React code-splitting snippet used JSX in a `javascript` block and referenced `Suspense`, `Link`, `Route`, and `Routes` without imports. I changed the fence to `jsx` and added the relevant imports.
- The Sharp image pipeline wrote files to nested output directories without creating those directories first. I added `fs.mkdir(..., { recursive: true })`.
- The responsive HTML referenced AVIF and JPEG size variants that the Sharp pipeline did not generate. I updated the resize loop to create AVIF, WebP, and JPEG variants for each width.
- The native lazy-loading example was in a JavaScript block even though it was HTML. I split it into an HTML snippet and a separate JavaScript fallback snippet.
- The font-loading example mixed an HTML `<link>` tag inside a CSS block. I split the preload tag and `@font-face` declaration into separate HTML and CSS snippets.
- The Nginx cache-header snippet combined `expires` with a custom `Cache-Control` header, which can emit duplicate `Cache-Control` headers. I replaced it with explicit `Cache-Control` values including `max-age`.
- The CloudFront YAML omitted CloudFormation resource wrappers, origin IDs, the API origin, `ViewerProtocolPolicy` on ordered cache behaviors, and required cache-policy subconfiguration. I rewrote it as a coherent CloudFormation example and used AWS's managed CachingDisabled policy ID for the API behavior.
- The Web Vitals example used the older FID-era `getFID` API. I updated it to current Core Web Vitals metrics and web-vitals function names: `onLCP`, `onINP`, and `onCLS`.
- The AVIF browser-support row omitted Safari. I updated it to include modern Safari support.

## Review Notes
- The Tailwind snippet is accurate for Tailwind CSS v3 configuration. Tailwind CSS v4 uses automatic class detection and CSS-first configuration by default, so future revisions could add a version note if the post wants to target Tailwind v4 specifically.
- The CloudFront example still uses Origin Access Identity for S3. That remains a recognizable pattern, but new AWS examples often prefer Origin Access Control.
