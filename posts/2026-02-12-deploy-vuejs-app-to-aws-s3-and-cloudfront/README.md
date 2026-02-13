# How to Deploy a Vue.js App to AWS S3 and CloudFront

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Vue.js, S3, CloudFront, Deployment

Description: A practical guide to deploying Vue.js applications to AWS S3 with CloudFront CDN for global content delivery, HTTPS, and cache optimization.

---

Vue.js apps compile down to static HTML, CSS, and JavaScript files - which makes S3 and CloudFront a perfect hosting solution. You get global CDN distribution, automatic HTTPS, and costs that stay near zero for most projects. If you've deployed a React app to S3 before, the process is very similar, but there are a few Vue-specific nuances worth covering.

## Preparing Your Vue.js Build

Start by creating a production build of your Vue app. If you're using the Vue CLI:

```bash
# Build for production
npm run build
```

This outputs everything to the `dist/` directory by default.

If you're using Vite (which is now the recommended build tool for Vue 3), the output also goes to `dist/`. Double check your `vite.config.js` if you've changed the output directory:

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    // Default output directory is 'dist'
    outDir: 'dist',
    // Generate source maps for debugging in production
    sourcemap: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500,
  },
})
```

For Vue CLI projects, you can customize the build in `vue.config.js`:

```javascript
// vue.config.js
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  productionSourceMap: false,
  // Adjust the public path if you're not serving from root
  publicPath: '/',
})
```

## Creating the S3 Bucket

Set up a private S3 bucket. We'll use CloudFront's Origin Access Control instead of making the bucket public:

```bash
# Create the bucket
aws s3 mb s3://my-vue-app-production --region us-east-1

# Block public access since CloudFront will serve the files
aws s3api put-public-access-block \
  --bucket my-vue-app-production \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## Uploading with Smart Cache Headers

Vue's build process generates hashed filenames for JS and CSS bundles, just like React does. This means we can set aggressive cache headers on those files while keeping `index.html` fresh.

Upload everything with appropriate cache settings:

```bash
# Upload hashed assets with long-lived cache (JS, CSS, images)
aws s3 sync dist/ s3://my-vue-app-production \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.map"

# Upload index.html with no-cache so users always get the latest version
aws s3 cp dist/index.html s3://my-vue-app-production/index.html \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html"
```

## Setting Up CloudFront

CloudFront sits in front of your S3 bucket, caching files at edge locations worldwide.

### Origin Access Control

Create an OAC to securely connect CloudFront to your private S3 bucket:

```bash
# Create OAC
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "vue-app-oac",
    "Description": "OAC for Vue.js app",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }'
```

### Distribution Configuration

Create a configuration file for your CloudFront distribution:

```json
{
  "CallerReference": "vue-app-dist-001",
  "Comment": "Vue.js App CDN Distribution",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-vue-app",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-vue-app",
        "DomainName": "my-vue-app-production.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "YOUR_OAC_ID"
      }
    ]
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponseCode": 200,
        "ResponsePagePath": "/index.html",
        "ErrorCachingMinTTL": 0
      },
      {
        "ErrorCode": 404,
        "ResponseCode": 200,
        "ResponsePagePath": "/index.html",
        "ErrorCachingMinTTL": 0
      }
    ]
  },
  "DefaultRootObject": "index.html",
  "Enabled": true
}
```

The custom error responses handle Vue Router's history mode. When a user navigates to `/dashboard` directly, S3 doesn't have a file at that path and returns a 403 or 404. CloudFront catches these errors and serves `index.html` instead, letting Vue Router handle the routing on the client side.

Create the distribution:

```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### S3 Bucket Policy

Grant CloudFront access to your bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontRead",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-vue-app-production/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket my-vue-app-production \
  --policy file://bucket-policy.json
```

## Vue Router Configuration

If you're using Vue Router in history mode (which you probably should), make sure it's configured to handle 404s gracefully:

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: () => import('@/views/About.vue') },
  // Catch-all route for 404 pages
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

The catch-all route ensures that your app displays a proper 404 page for genuinely invalid URLs, even though CloudFront serves `index.html` for all paths.

## Environment Variables

Vue apps handle environment variables at build time. For Vite projects, prefix variables with `VITE_`:

```bash
# .env.production
VITE_API_BASE_URL=https://api.yourapp.com
VITE_APP_TITLE=My Vue App
```

Access them in your code:

```javascript
// src/config.js
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  appTitle: import.meta.env.VITE_APP_TITLE,
}
```

For Vue CLI projects, use the `VUE_APP_` prefix instead:

```bash
# .env.production (Vue CLI)
VUE_APP_API_BASE_URL=https://api.yourapp.com
```

## Deployment Script

Here's a reusable deployment script that builds, uploads, and invalidates the cache:

```bash
#!/bin/bash
# deploy.sh
set -e

BUCKET="my-vue-app-production"
DIST_ID="EXXXXXXXXXX"
BUILD_DIR="dist"

echo "Installing dependencies..."
npm ci

echo "Building for production..."
npm run build

echo "Uploading assets to S3..."
aws s3 sync $BUILD_DIR/ s3://$BUCKET \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

echo "Uploading index.html..."
aws s3 cp $BUILD_DIR/index.html s3://$BUCKET/index.html \
  --cache-control "public, max-age=0, must-revalidate"

echo "Invalidating CloudFront cache for index.html..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/index.html" \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation $INVALIDATION_ID created. Waiting for completion..."
aws cloudfront wait invalidation-completed \
  --distribution-id $DIST_ID \
  --id $INVALIDATION_ID

echo "Deployment complete!"
```

## CI/CD with GitHub Actions

Automate the deployment process:

```yaml
# .github/workflows/deploy.yml
name: Deploy Vue App

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3 and invalidate cache
        run: |
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }} --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html"
          aws s3 cp dist/index.html s3://${{ secrets.S3_BUCKET }}/index.html \
            --cache-control "public, max-age=0, must-revalidate"
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/index.html"
```

## Custom Domain and SSL

Add a custom domain by requesting an ACM certificate and updating your distribution:

```bash
# Request SSL certificate (must be in us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name app.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

After validation, update your CloudFront distribution's alternate domain names and SSL certificate settings.

## Monitoring

Track error rates, cache hit ratios, and latency in CloudFront's built-in metrics. For a more comprehensive monitoring setup that includes uptime checks and alerting, look into integrating with [OneUptime](https://oneuptime.com/blog/post/aws-monitoring-tools-comparison/view).

## Summary

S3 plus CloudFront is the gold standard for hosting Vue.js SPAs on AWS. The combination is cheap, globally distributed, and infinitely scalable. Once you've got the initial infrastructure in place, deployments are just a build and sync away. The process is essentially identical to [deploying a React app](https://oneuptime.com/blog/post/2026-02-12-deploy-react-app-to-aws-s3-and-cloudfront/view), so if you're running both frameworks, you can reuse most of this infrastructure.
