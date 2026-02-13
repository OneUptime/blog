# How to Use CloudFront Functions vs Lambda@Edge

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, Lambda, Edge Computing, CDN

Description: A practical comparison of CloudFront Functions and Lambda@Edge, including when to use each, performance differences, pricing, and migration strategies.

---

AWS gives you two options for running code at the CDN edge: CloudFront Functions and Lambda@Edge. They sound similar but serve different purposes. CloudFront Functions are lightweight, sub-millisecond functions designed for simple request/response manipulation. Lambda@Edge is a full Lambda execution environment that runs at edge locations with more capabilities but higher latency and cost.

Picking the wrong one means either overpaying for simple operations or fighting constraints on complex ones. Let's break down the differences so you can choose correctly.

## The Key Differences at a Glance

| Feature | CloudFront Functions | Lambda@Edge |
|---------|---------------------|-------------|
| Runtime | JavaScript (ECMAScript 5.1) | Node.js, Python |
| Execution time | < 1 ms | Up to 5s (viewer), 30s (origin) |
| Memory | 2 MB | 128 MB - 10,240 MB |
| Package size | 10 KB | 1 MB (viewer), 50 MB (origin) |
| Network access | No | Yes |
| File system | No | Yes (/tmp, 512 MB) |
| Trigger points | Viewer request, viewer response | All four |
| Pricing | ~$0.10 per million | ~$0.60 per million |
| Scale | Millions of requests/sec | Thousands of requests/sec |

The most important distinctions: CloudFront Functions can't make network calls, can't access origin triggers, and run in a restricted JavaScript environment. Lambda@Edge can do all of that but costs 6x more and runs 10-50x slower.

## When to Use CloudFront Functions

CloudFront Functions excel at simple, high-volume operations:

- URL rewrites and redirects
- Header manipulation (add, modify, remove)
- Cache key normalization
- Simple authorization (API key validation, basic auth)
- Request/response transformations that don't need external data

### URL Rewriting

This CloudFront Function rewrites clean URLs for a single-page application:

```javascript
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Add index.html for directory paths
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  }
  // Add .html extension for clean URLs
  else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
```

Note the syntax: CloudFront Functions use `function handler(event)` not `exports.handler`. They don't support `async/await` or ES6+ features.

### Cache Key Normalization

This function normalizes query parameters to improve cache hit rates:

```javascript
function handler(event) {
  var request = event.request;
  var params = request.querystring;

  // Only keep relevant query parameters for cache key
  var allowedParams = ['page', 'sort', 'category'];
  var newParams = {};

  for (var key in params) {
    if (allowedParams.indexOf(key) !== -1) {
      newParams[key] = params[key];
    }
  }

  request.querystring = newParams;
  return request;
}
```

### Adding Security Headers

This function adds security headers to every response:

```javascript
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubDomains' };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['x-xss-protection'] = { value: '1; mode=block' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };

  return response;
}
```

### Simple Token Validation

This function checks for a valid API key in the request headers:

```javascript
function handler(event) {
  var request = event.request;
  var headers = request.headers;

  // Check for API key
  var apiKey = headers['x-api-key'] ? headers['x-api-key'].value : '';

  // Simple validation - hardcoded keys (or use a hash)
  var validKeys = ['key-abc-123', 'key-def-456'];

  if (validKeys.indexOf(apiKey) === -1) {
    return {
      statusCode: 403,
      statusDescription: 'Forbidden',
      headers: {
        'content-type': { value: 'application/json' },
      },
      body: '{"error": "Invalid API key"}',
    };
  }

  return request;
}
```

## When to Use Lambda@Edge

Use Lambda@Edge when your edge logic needs:

- Network access (calling APIs, databases, or other AWS services)
- Origin request/response triggers (not just viewer)
- More than 2 MB of memory
- Complex logic that needs modern JavaScript (async/await, ES6+)
- JWT verification with a third-party library
- A/B testing with external configuration
- Dynamic origin selection

### JWT Authentication

This Lambda@Edge function validates JWTs by decoding and verifying the signature:

```javascript
// Lambda@Edge - viewer request
const crypto = require('crypto');

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;

  // Skip public endpoints
  if (request.uri.startsWith('/public/') || request.uri === '/health') {
    return request;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader[0]) {
    return forbidden('Missing authorization');
  }

  const token = authHeader[0].value.replace('Bearer ', '');

  try {
    const payload = decodeAndVerifyJwt(token);

    // Forward user context to origin
    request.headers['x-user-id'] = [{
      key: 'X-User-Id',
      value: payload.sub,
    }];

    return request;
  } catch (err) {
    return forbidden('Invalid token');
  }
};

function forbidden(message) {
  return {
    status: '403',
    statusDescription: 'Forbidden',
    headers: {
      'content-type': [{ key: 'Content-Type', value: 'application/json' }],
    },
    body: JSON.stringify({ error: message }),
  };
}
```

### Dynamic Origin Selection

This Lambda@Edge function routes requests to different origins based on the path:

```javascript
// Lambda@Edge - origin request
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;

  // Route API requests to ALB, static to S3
  if (request.uri.startsWith('/api/')) {
    request.origin = {
      custom: {
        domainName: 'api.internal.example.com',
        port: 443,
        protocol: 'https',
        path: '',
        sslProtocols: ['TLSv1.2'],
        readTimeout: 30,
        keepaliveTimeout: 5,
      },
    };
    request.headers['host'] = [{ key: 'Host', value: 'api.internal.example.com' }];
  }

  return request;
};
```

## Deploying CloudFront Functions with CDK

This CDK stack creates and associates a CloudFront Function:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class CloudFrontFunctionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'WebBucket');

    // Create the CloudFront Function
    const urlRewriter = new cloudfront.Function(this, 'UrlRewriter', {
      code: cloudfront.FunctionCode.fromFile({
        filePath: 'functions/url-rewriter.js',
      }),
      comment: 'Rewrites URLs for SPA routing',
    });

    const securityHeaders = new cloudfront.Function(this, 'SecurityHeaders', {
      code: cloudfront.FunctionCode.fromFile({
        filePath: 'functions/security-headers.js',
      }),
      comment: 'Adds security headers',
    });

    // Create distribution with both functions
    new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        functionAssociations: [
          {
            function: urlRewriter,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
          {
            function: securityHeaders,
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          },
        ],
      },
    });
  }
}
```

## Testing CloudFront Functions

CloudFront Functions have a built-in test capability through the console and CLI.

This command tests a CloudFront Function with a sample event:

```bash
aws cloudfront test-function \
  --name url-rewriter \
  --if-match ETVPDKIKX0DER \
  --event-object '{
    "version": "1.0",
    "context": {
      "eventType": "viewer-request"
    },
    "viewer": {
      "ip": "1.2.3.4"
    },
    "request": {
      "method": "GET",
      "uri": "/about",
      "querystring": {},
      "headers": {
        "host": { "value": "example.com" }
      }
    }
  }'
```

Lambda@Edge is harder to test locally. The best approach is unit testing with mock events. For local Lambda testing, see our guide on [testing Lambda functions locally with SAM CLI](https://oneuptime.com/blog/post/2026-02-12-test-lambda-functions-locally-sam-cli/view).

## Performance Comparison

CloudFront Functions run in under 1 millisecond. Lambda@Edge typically takes 5-50ms for viewer triggers and 50-200ms for origin triggers (excluding cold starts). For high-traffic sites, that difference adds up.

Here's a rough cost comparison at 100 million requests/month:

- **CloudFront Functions**: ~$10/month
- **Lambda@Edge (viewer)**: ~$60/month + compute duration

For simple operations, CloudFront Functions are 6x cheaper and 10x faster. The math only favors Lambda@Edge when you actually need its capabilities.

## Migration Strategy

If you're currently using Lambda@Edge for simple operations, consider migrating to CloudFront Functions:

1. Identify Lambda@Edge functions that don't make network calls
2. Check if they only use viewer request/response triggers
3. Rewrite in ES5.1 JavaScript (no async/await, no require)
4. Test thoroughly with CloudFront's test-function API
5. Deploy alongside Lambda@Edge, then switch over

Keep Lambda@Edge for:
- Functions that need network access
- Functions on origin triggers
- Functions that need more than 10 KB of code
- Functions that use third-party libraries

## Decision Flowchart

```mermaid
graph TD
    A[Need edge processing?] -->|Yes| B{Need network access?}
    A -->|No| Z[No edge function needed]
    B -->|Yes| C[Lambda@Edge]
    B -->|No| D{Need origin trigger?}
    D -->|Yes| C
    D -->|No| E{Code > 10KB?}
    E -->|Yes| C
    E -->|No| F{Need ES6/async?}
    F -->|Yes| C
    F -->|No| G[CloudFront Functions]
```

## Wrapping Up

The choice between CloudFront Functions and Lambda@Edge is usually straightforward. For simple, high-volume operations like URL rewrites, redirects, and header manipulation, CloudFront Functions win on cost and performance. For anything that needs network access, origin triggers, or complex logic, Lambda@Edge is the way to go. Many architectures use both - CloudFront Functions for the simple stuff on every request, and Lambda@Edge for the heavy lifting on cache misses.
