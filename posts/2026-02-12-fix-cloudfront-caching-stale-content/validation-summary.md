# Validation Summary: How to Fix CloudFront Caching Stale Content

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon CloudFront
- AWS CLI
- Amazon S3
- HTTP Cache-Control
- Flask
- webpack
- Vite
- CI/CD shell scripting

## Sources Consulted
- AWS CLI Command Reference: create-invalidation - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- AWS CLI Command Reference: invalidation-completed waiter - https://docs.aws.amazon.com/en_us/cli/latest/reference/cloudfront/wait/invalidation-completed.html
- AWS CLI Command Reference: create-cache-policy - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-cache-policy.html
- AWS CLI Command Reference: s3 cp --cache-control - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Amazon CloudFront Developer Guide: Paying for file invalidation - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html
- Amazon CloudFront Developer Guide: Specifying objects to invalidate - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html
- Amazon CloudFront Developer Guide: Cache content based on headers - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html
- AWS CLI Command Reference: get-distribution-config - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/get-distribution-config.html
- MDN Web Docs: Cache-Control - https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Cache-Control
- webpack Documentation: Output configuration - https://webpack.js.org/configuration/output/
- Vite Documentation: Build options - https://vite.dev/config/build-options.html

## Issues Found
- The webpack example used `path: '/dist'`, which is technically an absolute path but points to the filesystem root and does not follow webpack's documented pattern for project-local output. Changed it to `path.resolve(__dirname, 'dist')` and added the required `path` import.
- The Vite example used `build.rollupOptions`, which the current Vite documentation marks as a deprecated alias. Changed it to `build.rolldownOptions` while preserving the same output filename settings.
- The CI/CD script created one invalidation for HTML files, then created and waited for a second `/*` invalidation. Changed it to create a single HTML-file invalidation, capture that invalidation ID, and wait for that same request.

## Review Notes
- AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI documentation instead of local `--help` output.
- The CloudFront invalidation pricing, wildcard path counting, cache-policy TTL behavior, cache-key behavior for headers/cookies/query strings, and `aws s3 cp --cache-control` usage matched official documentation.
- The Flask functions `get_data()` and `get_asset()` are illustrative placeholders; the shown response-header handling is syntactically valid for Flask.
