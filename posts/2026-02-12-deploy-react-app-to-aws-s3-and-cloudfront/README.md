# How to Deploy a React App to AWS S3 and CloudFront

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, React, S3, CloudFront, Deployment

Description: Complete walkthrough for deploying React single-page applications to AWS S3 with CloudFront CDN, custom domains, and automated CI/CD deployments.

---

Deploying a React app to S3 and CloudFront is one of the cheapest and most performant ways to host a frontend application. S3 stores your static files, CloudFront serves them from edge locations around the world, and you end up with sub-100ms load times for users everywhere. The whole setup costs pennies for most projects.

Let's go through it step by step.

## Building Your React App

Before you deploy anything, you need a production build. This creates optimized, minified files in the `build` directory:

```bash
# Create a production build
npm run build
```

If you're using Create React App, the output goes to `./build`. If you're using Vite, it goes to `./dist`. Adjust the paths in the following steps accordingly.

## Creating an S3 Bucket

Create a bucket to hold your static files. The bucket name needs to be globally unique:

```bash
# Create the S3 bucket
aws s3 mb s3://my-react-app-production --region us-east-1
```

Since CloudFront will handle public access, you don't need to enable S3 static website hosting. In fact, it's more secure to keep the bucket private and use an Origin Access Control (OAC) to let CloudFront access it.

Configure the bucket to block all public access:

```bash
# Block all public access to the bucket
aws s3api put-public-access-block \
  --bucket my-react-app-production \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## Uploading Your Build

Upload the production build to S3 with proper content types and cache headers:

```bash
# Upload all files with cache headers
aws s3 sync build/ s3://my-react-app-production \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "service-worker.js" \
  --exclude "manifest.json"

# Upload HTML and dynamic files with no-cache headers
aws s3 cp build/index.html s3://my-react-app-production/index.html \
  --cache-control "public, max-age=0, must-revalidate"

# Upload manifest with short cache
aws s3 cp build/manifest.json s3://my-react-app-production/manifest.json \
  --cache-control "public, max-age=0, must-revalidate"
```

Why the different cache headers? Static assets like JS and CSS bundles have content hashes in their filenames (e.g., `main.a1b2c3d4.js`), so they can be cached forever - the filename changes when the content changes. But `index.html` should never be cached aggressively because it contains the references to those hashed files.

## Setting Up CloudFront

Now create a CloudFront distribution. This is where the real performance benefits kick in.

### Create an Origin Access Control

First, set up OAC so CloudFront can access your private S3 bucket:

```bash
# Create an Origin Access Control
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "react-app-oac",
    "Description": "OAC for React app S3 bucket",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }'
```

### Create the Distribution

Create a CloudFront distribution configuration file. This is where you define caching behavior, error handling, and the connection to S3:

```json
{
  "CallerReference": "react-app-dist-001",
  "Comment": "React App Distribution",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-react-app",
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
        "Id": "S3-react-app",
        "DomainName": "my-react-app-production.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "YOUR_OAC_ID"
      }
    ]
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 403,
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

The custom error response is critical for React Router (or any client-side routing). When someone navigates to `/about` directly, S3 returns a 403 because there's no `about` file. The error response redirects this to `index.html`, letting React Router handle the path.

Create the distribution:

```bash
# Create the CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### Update the S3 Bucket Policy

Allow CloudFront to read from your bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-react-app-production/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

Apply the policy:

```bash
# Apply the bucket policy
aws s3api put-bucket-policy \
  --bucket my-react-app-production \
  --policy file://bucket-policy.json
```

## Custom Domain with SSL

To use your own domain, you'll need an SSL certificate from ACM and a DNS record.

Request a certificate (must be in us-east-1 for CloudFront):

```bash
# Request an SSL certificate
aws acm request-certificate \
  --domain-name app.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

After validating the certificate, update your CloudFront distribution to use it:

```bash
# Update the distribution with your custom domain and certificate
aws cloudfront update-distribution \
  --id DISTRIBUTION_ID \
  --distribution-config file://updated-config.json
```

Then add a CNAME record in your DNS pointing `app.yourdomain.com` to your CloudFront distribution domain name.

## Automated Deployment Script

Here's a deployment script that handles the build, upload, and cache invalidation in one go:

```bash
#!/bin/bash
# deploy.sh - Deploy React app to S3 + CloudFront

set -e

BUCKET="my-react-app-production"
DISTRIBUTION_ID="EXXXXXXXXXX"

echo "Building production bundle..."
npm run build

echo "Syncing static assets to S3..."
aws s3 sync build/ s3://$BUCKET \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "asset-manifest.json" \
  --exclude "manifest.json"

echo "Uploading index.html with no-cache..."
aws s3 cp build/index.html s3://$BUCKET/index.html \
  --cache-control "public, max-age=0, must-revalidate"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/index.html" "/manifest.json"

echo "Deployment complete!"
```

Notice we only invalidate `index.html` and `manifest.json`. Since all other assets have content hashes in their filenames, they don't need cache invalidation. This keeps your invalidation costs down (CloudFront gives you 1,000 free invalidation paths per month).

## CI/CD with GitHub Actions

Automate deployments on every push to main:

```yaml
# .github/workflows/deploy.yml
name: Deploy to S3

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --passWithNoTests

      - name: Build
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync build/ s3://${{ secrets.S3_BUCKET }} --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html"
          aws s3 cp build/index.html s3://${{ secrets.S3_BUCKET }}/index.html \
            --cache-control "public, max-age=0, must-revalidate"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/index.html"
```

## Performance Optimization

A few tips to squeeze out even more performance:

**Enable Brotli compression** in your CloudFront distribution. It's smaller than gzip and supported by all modern browsers.

**Use CloudFront Functions** for things like URL rewrites, security headers, or A/B testing at the edge:

```javascript
// CloudFront Function for security headers
function handler(event) {
    var response = event.response;
    var headers = response.headers;

    headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
    headers['x-content-type-options'] = { value: 'nosniff' };
    headers['x-frame-options'] = { value: 'DENY' };
    headers['x-xss-protection'] = { value: '1; mode=block' };

    return response;
}
```

## Monitoring

Track your CloudFront distribution metrics in CloudWatch and set up alerts for error rates. If you're looking for a more complete monitoring solution that covers uptime, performance, and alerting, check out how to [monitor AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view) effectively.

## Final Thoughts

S3 plus CloudFront is hard to beat for React hosting. It's cheap, fast, and scales infinitely without any intervention. The initial setup takes about 30 minutes, and after that, deployments are just a `sync` command away. For most React apps, this is all you need.
