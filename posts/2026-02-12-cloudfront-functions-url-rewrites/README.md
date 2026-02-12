# How to Use CloudFront Functions for URL Rewrites

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, Serverless, URL Rewriting

Description: Learn how to use CloudFront Functions to perform URL rewrites, redirects, and request manipulation at the edge with minimal latency.

---

CloudFront Functions let you run lightweight JavaScript code at CloudFront edge locations to manipulate requests and responses. They're perfect for URL rewrites, redirects, header manipulation, and simple authorization checks. They execute in under a millisecond and cost a fraction of what Lambda@Edge charges. Let's look at practical URL rewrite patterns you'll actually use.

## CloudFront Functions vs Lambda@Edge

Before diving in, let's clarify when to use which:

**CloudFront Functions** run on the viewer-facing side only (viewer request and viewer response events). They're limited to 10KB of code, can't make network calls, and have a 1ms execution time limit. But they run at every edge location and cost $0.10 per million invocations.

**Lambda@Edge** can run on all four event types (viewer request/response and origin request/response). It supports up to 50MB deployment packages, can make network calls, and has up to 30 seconds of execution time. But it's more expensive and adds more latency.

For URL rewrites, CloudFront Functions are almost always the right choice.

## Creating Your First CloudFront Function

Let's start with a common scenario: adding `index.html` to directory URLs.

```javascript
// Append index.html to URLs that end with a slash
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If the URI ends with /, append index.html
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  }
  // If the URI doesn't have a file extension, append /index.html
  else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
```

Create the function:

```bash
# Create the CloudFront function
aws cloudfront create-function \
  --name "add-index-html" \
  --function-config '{
    "Comment": "Append index.html to directory requests",
    "Runtime": "cloudfront-js-2.0"
  }' \
  --function-code fileb://add-index.js
```

Test it before publishing:

```bash
# Test the function with a sample event
aws cloudfront test-function \
  --name "add-index-html" \
  --if-match ETAG_VALUE \
  --event-object fileb://test-event.json
```

The test event file looks like:

```json
{
  "version": "1.0",
  "context": {
    "eventType": "viewer-request"
  },
  "viewer": {
    "ip": "1.2.3.4"
  },
  "request": {
    "method": "GET",
    "uri": "/blog/",
    "headers": {
      "host": {"value": "example.com"}
    }
  }
}
```

Once testing passes, publish the function:

```bash
# Publish the function to make it available for association
aws cloudfront publish-function \
  --name "add-index-html" \
  --if-match ETAG_VALUE
```

## Associating Functions with Behaviors

Associate the function with a cache behavior in your distribution:

```bash
# Get current distribution config
aws cloudfront get-distribution-config --id E1234567890 > config.json

# Update the default cache behavior to include the function association
```

The relevant JSON section in the cache behavior:

```json
{
  "FunctionAssociations": {
    "Quantity": 1,
    "Items": [
      {
        "EventType": "viewer-request",
        "FunctionARN": "arn:aws:cloudfront::123456789012:function/add-index-html"
      }
    ]
  }
}
```

## Common URL Rewrite Patterns

### Pattern 1: Trailing Slash Normalization

Remove trailing slashes to prevent duplicate content:

```javascript
// Remove trailing slashes (except for root path)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Remove trailing slash, but not for root
  if (uri.length > 1 && uri.endsWith('/')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { value: uri.slice(0, -1) }
      }
    };
  }

  return request;
}
```

### Pattern 2: WWW to Apex Redirect

Redirect www subdomain to the bare domain:

```javascript
// Redirect www.example.com to example.com
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;

  if (host.startsWith('www.')) {
    var newHost = host.substring(4);
    var newUrl = 'https://' + newHost + request.uri;

    // Preserve query string if present
    if (Object.keys(request.querystring).length > 0) {
      var qs = Object.entries(request.querystring)
        .map(function(pair) { return pair[0] + '=' + pair[1].value; })
        .join('&');
      newUrl += '?' + qs;
    }

    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { value: newUrl }
      }
    };
  }

  return request;
}
```

### Pattern 3: Clean URL Routing for Single-Page Apps

Route all non-file requests to index.html for client-side routing:

```javascript
// SPA routing - serve index.html for all paths without file extensions
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Check if the request is for a file (has an extension)
  var hasExtension = uri.split('/').pop().includes('.');

  // If not a file request, serve index.html
  if (!hasExtension) {
    request.uri = '/index.html';
  }

  return request;
}
```

### Pattern 4: Language-Based Routing

Route users to language-specific content based on the Accept-Language header:

```javascript
// Route to language-specific directories based on Accept-Language
function handler(event) {
  var request = event.request;
  var acceptLang = request.headers['accept-language']
    ? request.headers['accept-language'].value
    : '';

  var supportedLangs = ['en', 'es', 'fr', 'de', 'ja'];
  var defaultLang = 'en';
  var lang = defaultLang;

  // Parse the primary language from Accept-Language header
  var primaryLang = acceptLang.substring(0, 2).toLowerCase();
  if (supportedLangs.indexOf(primaryLang) !== -1) {
    lang = primaryLang;
  }

  // Only rewrite if not already in a language directory
  var firstSegment = request.uri.split('/')[1];
  if (supportedLangs.indexOf(firstSegment) === -1) {
    request.uri = '/' + lang + request.uri;
  }

  return request;
}
```

### Pattern 5: Legacy URL Redirect Map

Handle bulk URL redirects for migrated content:

```javascript
// Redirect old URLs to new ones
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Define redirect mapping
  var redirects = {
    '/old-blog': '/blog',
    '/about-us': '/about',
    '/products/widget': '/store/widgets',
    '/contact-us': '/contact',
    '/faq': '/help/frequently-asked-questions',
    '/terms': '/legal/terms-of-service'
  };

  // Normalize URI (lowercase, no trailing slash)
  var normalizedUri = uri.toLowerCase().replace(/\/$/, '') || '/';

  if (redirects[normalizedUri]) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { value: redirects[normalizedUri] }
      }
    };
  }

  return request;
}
```

### Pattern 6: A/B Testing with Cookie-Based Routing

Route users to different origin paths based on a cookie:

```javascript
// Route to different variants based on experiment cookie
function handler(event) {
  var request = event.request;
  var cookies = request.cookies;

  // Check for experiment cookie
  var variant = 'control'; // default
  if (cookies['ab-test'] && cookies['ab-test'].value === 'variant-b') {
    variant = 'variant-b';
  }

  // Prepend variant directory to the URI
  if (request.uri.startsWith('/landing')) {
    request.uri = '/' + variant + request.uri;
  }

  return request;
}
```

## Viewer Response Functions

You can also use CloudFront Functions on viewer responses. A common use case is adding security headers:

```javascript
// Add security headers to all responses
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = {
    value: 'max-age=63072000; includeSubdomains; preload'
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['x-xss-protection'] = { value: '1; mode=block' };

  return response;
}
```

## Debugging Functions

CloudFront Functions don't have console.log, but you can use the `console.log` equivalent in the test harness. For production debugging, check CloudWatch metrics:

```bash
# Check function invocation metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name FunctionInvocations \
  --dimensions Name=FunctionName,Value=add-index-html \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Check for function errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name FunctionValidationErrors \
  --dimensions Name=FunctionName,Value=add-index-html \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Limitations to Keep in Mind

- 10KB maximum function size
- 2MB maximum request/response size for manipulation
- No network calls (can't call APIs or databases)
- No file system access
- 1ms execution time limit (10ms for viewer response)
- JavaScript only (ECMAScript 5.1 compatible with some additions in runtime 2.0)
- Can only associate with viewer request and viewer response events

If you need more power, use Lambda@Edge. But for URL rewrites and redirects, CloudFront Functions are faster, cheaper, and simpler.

## Summary

CloudFront Functions are the ideal tool for URL rewrites at the edge. They run in under a millisecond at every edge location for $0.10 per million invocations. Common patterns include adding index.html to directory requests, www-to-apex redirects, SPA routing, language-based routing, legacy URL redirects, and A/B testing. Always test your functions with sample events before publishing, and use CloudWatch metrics to monitor invocations and errors in production.
