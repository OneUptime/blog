# How to Set Up CloudFront KeyValueStore for Edge Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, Edge Computing, Key-Value Store

Description: Learn how to use CloudFront KeyValueStore to manage dynamic configuration data at the edge for CloudFront Functions without redeploying your distribution.

---

CloudFront Functions are great for lightweight request and response manipulation at the edge. But they've had a limitation: any configuration data had to be hardcoded into the function code. Want to update a redirect map? Redeploy the function. Need to change a feature flag? Redeploy again. Every configuration change meant a full function deployment and distribution update.

CloudFront KeyValueStore changes this. It's a globally distributed, low-latency data store that your CloudFront Functions can read from at runtime. Update a key-value pair, and your function picks up the change within seconds - no redeployment needed.

## How KeyValueStore Works

KeyValueStore is a simple key-value database optimized for reads at the edge. It replicates data across all CloudFront edge locations globally, so lookups are fast regardless of where the request originates.

Key characteristics:
- Maximum store size: 5 MB
- Maximum key size: 512 bytes
- Maximum value size: 1 KB
- Read latency: sub-millisecond at the edge
- Propagation time for updates: seconds to low tens of seconds globally

It's designed for configuration data, not application data. Think feature flags, redirect maps, A/B test configurations, maintenance mode toggles, and allowlists/blocklists.

## Creating a KeyValueStore

Start by creating a store and populating it with data.

Create and populate a KeyValueStore:

```bash
# Create the key-value store
aws cloudfront-keyvaluestore create-key-value-store \
  --name "app-config" \
  --comment "Application configuration for edge functions"

# The response includes the ARN and ETag - save both
# ARN: arn:aws:cloudfront::123456789012:key-value-store/abc-123-def
# ETag: AAAAAAAAAAAA

# Put individual keys
aws cloudfront-keyvaluestore put-key \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --if-match AAAAAAAAAAAA \
  --key "maintenance-mode" \
  --value "false"

# Put multiple keys (get the updated ETag after each operation)
aws cloudfront-keyvaluestore put-key \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --if-match BBBBBBBBBBBB \
  --key "feature-dark-mode" \
  --value "true"

aws cloudfront-keyvaluestore put-key \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --if-match CCCCCCCCCCCC \
  --key "redirect:/old-page" \
  --value "/new-page"
```

You can also import data in bulk from an S3 object.

Bulk import from S3:

```bash
# Create a JSON file with your key-value pairs
# Upload to S3 first, then import
aws cloudfront-keyvaluestore update-keys \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --if-match CURRENT_ETAG \
  --puts '[
    {"Key": "maintenance-mode", "Value": "false"},
    {"Key": "feature-dark-mode", "Value": "true"},
    {"Key": "feature-new-checkout", "Value": "false"},
    {"Key": "ab-test-hero-variant", "Value": "B"},
    {"Key": "redirect:/old-pricing", "Value": "/pricing"},
    {"Key": "redirect:/old-docs", "Value": "/documentation"}
  ]'
```

## Writing CloudFront Functions with KeyValueStore

CloudFront Functions access the KeyValueStore through a JavaScript module. You import it and query keys during request or response processing.

CloudFront Function for maintenance mode:

```javascript
import cf from 'cloudfront';

// Get a reference to the key-value store
const kvsHandle = cf.kvs();

async function handler(event) {
  const request = event.request;

  try {
    // Check if maintenance mode is enabled
    const maintenanceMode = await kvsHandle.get('maintenance-mode');

    if (maintenanceMode === 'true') {
      // Return a maintenance page
      return {
        statusCode: 503,
        statusDescription: 'Service Unavailable',
        headers: {
          'content-type': { value: 'text/html' },
          'retry-after': { value: '300' }
        },
        body: {
          encoding: 'text',
          data: '<html><body><h1>We are performing maintenance</h1><p>Please check back in a few minutes.</p></body></html>'
        }
      };
    }
  } catch (e) {
    // If KVS lookup fails, continue normally
    // Don't block requests due to config lookup failures
  }

  return request;
}
```

CloudFront Function for dynamic redirects:

```javascript
import cf from 'cloudfront';

const kvsHandle = cf.kvs();

async function handler(event) {
  const request = event.request;
  const uri = request.uri;

  try {
    // Look up redirect target using the URI as key
    const redirectTarget = await kvsHandle.get(`redirect:${uri}`);

    if (redirectTarget) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: {
          'location': { value: redirectTarget },
          'cache-control': { value: 'max-age=3600' }
        }
      };
    }
  } catch (e) {
    // Key not found - no redirect needed
    // KVS throws on missing keys, so this is expected
  }

  return request;
}
```

CloudFront Function for feature flags:

```javascript
import cf from 'cloudfront';

const kvsHandle = cf.kvs();

async function handler(event) {
  const request = event.request;

  try {
    // Check feature flags and pass them as headers to the origin
    const darkMode = await kvsHandle.get('feature-dark-mode');
    const newCheckout = await kvsHandle.get('feature-new-checkout');
    const abTestVariant = await kvsHandle.get('ab-test-hero-variant');

    // Set headers that your origin application can read
    request.headers['x-feature-dark-mode'] = { value: darkMode || 'false' };
    request.headers['x-feature-new-checkout'] = { value: newCheckout || 'false' };
    request.headers['x-ab-test-hero'] = { value: abTestVariant || 'A' };
  } catch (e) {
    // Set defaults if KVS lookup fails
    request.headers['x-feature-dark-mode'] = { value: 'false' };
    request.headers['x-feature-new-checkout'] = { value: 'false' };
    request.headers['x-ab-test-hero'] = { value: 'A' };
  }

  return request;
}
```

## Associating the KeyValueStore with a Function

You need to associate the KVS with your CloudFront Function when you create or update the function.

Create a function with KVS association:

```bash
# Create the CloudFront Function
aws cloudfront create-function \
  --name "maintenance-check" \
  --function-config '{
    "Comment": "Check maintenance mode from KVS",
    "Runtime": "cloudfront-js-2.0",
    "KeyValueStoreAssociations": {
      "Items": [
        {
          "KeyValueStoreARN": "arn:aws:cloudfront::123456789012:key-value-store/abc-123-def"
        }
      ],
      "Quantity": 1
    }
  }' \
  --function-code fileb://maintenance-check.js

# Test the function
aws cloudfront test-function \
  --name "maintenance-check" \
  --if-match ETAG \
  --event-object fileb://test-event.json \
  --stage DEVELOPMENT

# Publish the function
aws cloudfront publish-function \
  --name "maintenance-check" \
  --if-match ETAG
```

## CloudFormation Template

Here's a CloudFormation setup for the full stack.

CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: CloudFront Function with KeyValueStore

Resources:
  ConfigStore:
    Type: AWS::CloudFront::KeyValueStore
    Properties:
      Name: app-config
      Comment: Application edge configuration

  MaintenanceFunction:
    Type: AWS::CloudFront::Function
    Properties:
      Name: maintenance-check
      FunctionConfig:
        Comment: Maintenance mode and feature flags
        Runtime: cloudfront-js-2.0
        KeyValueStoreAssociations:
          - KeyValueStoreARN: !GetAtt ConfigStore.Arn
      FunctionCode: |
        import cf from 'cloudfront';
        const kvsHandle = cf.kvs();
        async function handler(event) {
          const request = event.request;
          try {
            const maintenance = await kvsHandle.get('maintenance-mode');
            if (maintenance === 'true') {
              return {
                statusCode: 503,
                statusDescription: 'Service Unavailable',
                headers: { 'content-type': { value: 'text/html' } },
                body: { encoding: 'text', data: '<h1>Maintenance in progress</h1>' }
              };
            }
          } catch (e) { }
          return request;
        }
      AutoPublish: true

  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultCacheBehavior:
          TargetOriginId: origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          FunctionAssociations:
            - EventType: viewer-request
              FunctionARN: !GetAtt MaintenanceFunction.FunctionARN
        Origins:
          - Id: origin
            DomainName: origin.example.com
            CustomOriginConfig:
              OriginProtocolPolicy: https-only
```

## Updating Configuration at Runtime

The real power is updating configuration without touching your CloudFront distribution or function.

Toggle maintenance mode on and off:

```bash
# Turn on maintenance mode
ETAG=$(aws cloudfront-keyvaluestore describe-key-value-store \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --query 'ETag' --output text)

aws cloudfront-keyvaluestore put-key \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --if-match $ETAG \
  --key "maintenance-mode" \
  --value "true"

# After maintenance, turn it off
ETAG=$(aws cloudfront-keyvaluestore describe-key-value-store \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --query 'ETag' --output text)

aws cloudfront-keyvaluestore put-key \
  --kvs-arn arn:aws:cloudfront::123456789012:key-value-store/abc-123-def \
  --if-match $ETAG \
  --key "maintenance-mode" \
  --value "false"
```

Changes propagate globally in seconds. Compare that to updating a CloudFront Function, which requires publishing a new version and waiting for distribution deployment.

## Use Cases

- **Maintenance mode**: Toggle a maintenance page without any deployment.
- **Redirect maps**: Add or update redirects by modifying key-value pairs.
- **Feature flags**: Enable or disable features at the edge instantly.
- **A/B testing**: Change test variant assignments without code changes.
- **Blocklists**: Block specific IPs or user agents by updating a list.
- **Rate limiting configs**: Adjust rate limit thresholds dynamically.

KeyValueStore is a small but impactful addition to the CloudFront toolbox. For teams that frequently update edge configurations, it eliminates a lot of deployment friction. For more on CloudFront deployment patterns, see our post on [continuous deployment](https://oneuptime.com/blog/post/2026-02-12-cloudfront-continuous-deployment-safe-rollouts/view).
