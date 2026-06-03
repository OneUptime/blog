# Validation Summary: How to Deploy a React App to AWS S3 and CloudFront

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- React
- Create React App
- Vite
- AWS S3
- Amazon CloudFront
- CloudFront Origin Access Control
- AWS Certificate Manager
- AWS CLI
- GitHub Actions
- CloudFront Functions

## Sources Consulted
- AWS CloudFront Developer Guide: Get started with a standard distribution using the AWS CLI: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/get-started-cli-tutorial.html
- AWS CloudFront Developer Guide: Restrict access to an Amazon S3 origin with OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CLI Command Reference: `cloudfront create-distribution`: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- AWS CLI Command Reference: `cloudfront update-distribution`: https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/cloudfront/update-distribution.html
- AWS CloudFront Developer Guide: Managed cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CloudFront Developer Guide: Serving compressed files: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
- AWS CLI Command Reference: `s3 sync`: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI Command Reference: `s3api put-public-access-block`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-public-access-block.html
- AWS CloudFront Developer Guide: SSL/TLS certificate requirements for CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront Developer Guide: Invalidation pricing: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html
- AWS CloudFront Developer Guide: CloudFront Functions event structure: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- Create React App documentation: Creating a production build: https://create-react-app.dev/docs/production-build
- Vite documentation: Build options and static deployment: https://vite.dev/config/build-options.html and https://vite.dev/guide/static-deploy.html
- GitHub Actions `setup-node` documentation: https://github.com/actions/setup-node

## Issues Found
- The S3 upload examples excluded `asset-manifest.json` and `service-worker.js` from the long-cache sync inconsistently. I changed the initial upload, deploy script, and GitHub Actions workflow to upload manifests and service workers separately with no-cache headers when present.
- The deployment script invalidated `manifest.json` without uploading it, which could leave stale or missing manifest metadata. I added conditional uploads for `manifest.json`, `asset-manifest.json`, and `service-worker.js`, then updated the invalidation paths.
- The GitHub Actions workflow only excluded `index.html`, which would cache manifests and service workers for a year. I updated it to match the deployment script's cache-control strategy.
- The CloudFront distribution example used the `CachingOptimized` managed cache policy, whose minimum TTL is greater than zero. I changed it to `UseOriginCacheControlHeaders`, which has a zero-second minimum TTL and better matches the post's `Cache-Control`-driven deployment model.
- The CloudFront distribution example omitted `CachedMethods` inside `AllowedMethods`. I added it to align with AWS CLI examples for a GET/HEAD S3 distribution.
- The custom domain `update-distribution` command omitted the required `--if-match` ETag parameter. I added an ETag lookup and `--if-match`, and clarified that the updated distribution config must include aliases and the viewer certificate.
- The client-side routing explanation said CloudFront redirects the S3 403 to `index.html`. I corrected this to say CloudFront returns `index.html` with a 200 status code.
- The invalidation explanation still said only `index.html` and `manifest.json` were invalidated. I updated it to include manifests and the service worker.
- The opening and closing sections made absolute claims about sub-100ms load times everywhere and infinite scaling. I softened those to low-latency regional delivery and very high traffic without server management.
- The Brotli note said all modern browsers support Brotli without qualification. I clarified that CloudFront/Brotli browser support is for HTTPS requests.

## Review Notes
Create React App is deprecated, but the post also mentions Vite and the CRA build/output details remain technically accurate for existing CRA projects. For new React projects, a future refresh could lean more heavily on Vite and use OIDC-based AWS authentication in GitHub Actions instead of long-lived access key secrets.
