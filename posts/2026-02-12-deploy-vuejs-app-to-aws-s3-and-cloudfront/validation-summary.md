# Validation Summary: How to Deploy a Vue.js App to AWS S3 and CloudFront

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Vue.js
- Vue Router
- Vite
- Vue CLI
- AWS S3
- Amazon CloudFront
- CloudFront Origin Access Control
- AWS CLI
- AWS Certificate Manager
- GitHub Actions

## Sources Consulted
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI `s3api put-public-access-block` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-public-access-block.html
- Amazon CloudFront Origin Access Control for S3 documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CLI `cloudfront create-distribution` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- Amazon CloudFront custom error pages and error caching documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesErrorPages.html
- AWS CLI `cloudfront create-invalidation` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- Amazon CloudFront SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Vite build options documentation: https://vite.dev/config/build-options.html
- Vite static deployment guide: https://vite.dev/guide/static-deploy.html
- Vite environment variables and modes documentation: https://vite.dev/guide/env-and-mode
- Vue CLI modes and environment variables documentation: https://cli.vuejs.org/guide/mode-and-env.html
- Vue Router history mode documentation: https://router.vuejs.org/guide/essentials/history-mode
- GitHub `actions/checkout` documentation and releases: https://github.com/actions/checkout
- GitHub `actions/setup-node` documentation: https://github.com/actions/setup-node
- AWS `configure-aws-credentials` GitHub Action releases: https://github.com/aws-actions/configure-aws-credentials/releases
- Node.js Release Working Group schedule: https://github.com/nodejs/release

## Issues Found
- The GitHub Actions example used `actions/checkout@v4`, `actions/setup-node@v4`, `aws-actions/configure-aws-credentials@v4`, and `node-version: '20'`. Node.js 20 reached end-of-life on April 30, 2026, and current official action examples/releases use newer major versions. Updated the workflow snippet to `actions/checkout@v6`, `actions/setup-node@v6`, `aws-actions/configure-aws-credentials@v6`, and `node-version: '24'`.

## Review Notes
- The AWS CLI examples, S3 public access block configuration, CloudFront OAC setup, OAC bucket policy, CloudFront custom error responses, cache-control usage, Vue Router history mode example, Vite environment variable usage, Vue CLI environment variable prefix, and ACM `us-east-1` note were consistent with official documentation.
- The deployment examples intentionally invalidate only `/index.html`, which is appropriate for hashed static assets as shown in the post.
