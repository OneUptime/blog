# How to Fix S3 CORS Errors in Web Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CORS, Web Development, Troubleshooting

Description: Fix S3 CORS errors in web applications by configuring proper CORS rules, understanding preflight requests, and debugging common misconfigurations.

---

You're building a web app that uploads files directly to S3 from the browser, or you're loading images, fonts, or JSON from an S3 bucket. Then you see this in the browser console:

```
Access to XMLHttpRequest at 'https://my-bucket.s3.amazonaws.com/...'
from origin 'https://myapp.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

CORS errors from S3 are one of the most common issues in web development with AWS. The fix is usually straightforward, but the details matter. Let's break it down.

## What Is CORS and Why Does S3 Need It?

CORS (Cross-Origin Resource Sharing) is a browser security feature. When your web page on `https://myapp.com` makes a request to `https://my-bucket.s3.amazonaws.com`, the browser considers that a cross-origin request because the domains are different. The browser blocks it unless S3 explicitly says "yes, requests from myapp.com are allowed."

S3 doesn't have CORS configured by default. You need to add a CORS configuration to your bucket.

## The Basic Fix

Here's a CORS configuration that works for most use cases:

```bash
# Apply CORS configuration to your S3 bucket
aws s3api put-bucket-cors --bucket my-bucket --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://myapp.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3600
    }
  ]
}'
```

Let's break down each field:

- **AllowedOrigins** - Which domains can make requests. Must match exactly (protocol + domain + port)
- **AllowedMethods** - HTTP methods to allow
- **AllowedHeaders** - Request headers the browser can send. `*` means all headers
- **ExposeHeaders** - Response headers the browser can access via JavaScript
- **MaxAgeSeconds** - How long the browser can cache the preflight response

## Common Mistakes

### Mistake 1: Wrong Origin Format

The origin must match exactly, including the protocol and port:

```json
{
  "AllowedOrigins": [
    "https://myapp.com",
    "https://www.myapp.com",
    "http://localhost:3000"
  ]
}
```

These are all different origins:
- `https://myapp.com` (no www)
- `https://www.myapp.com` (with www)
- `http://myapp.com` (http, not https)
- `https://myapp.com:8080` (with port)

You can use wildcards, but only as the entire origin or as a subdomain prefix:

```json
{
  "AllowedOrigins": [
    "https://*.myapp.com",
    "*"
  ]
}
```

Using `"*"` allows all origins. This is fine for public data but not recommended for buckets with sensitive content.

### Mistake 2: Missing Headers in AllowedHeaders

If your application sends custom headers (like `Content-Type` with a specific value, `Authorization`, or custom `x-` headers), they must be allowed:

```json
{
  "AllowedHeaders": [
    "Content-Type",
    "Authorization",
    "x-amz-date",
    "x-amz-security-token",
    "x-amz-content-sha256"
  ]
}
```

Or just use `"*"` to allow all headers. For most applications, this is the easiest approach.

### Mistake 3: Missing ExposeHeaders

By default, the browser only exposes a limited set of response headers to JavaScript. If you need to read headers like `ETag` (common for multipart uploads) or custom headers, you need to list them:

```json
{
  "ExposeHeaders": [
    "ETag",
    "x-amz-request-id",
    "x-amz-id-2",
    "Content-Length",
    "Content-Type"
  ]
}
```

### Mistake 4: Forgetting HEAD Method

Presigned URLs and some upload libraries use HEAD requests to check file existence. Don't forget to include it:

```json
{
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"]
}
```

## Setting Up CORS for Presigned URL Uploads

If you're generating presigned URLs for direct browser-to-S3 uploads, you need CORS configured for PUT requests:

Backend (Python/Node.js) generating the presigned URL:

```python
import boto3

s3 = boto3.client('s3', region_name='us-east-1')

# Generate a presigned URL for uploading
presigned_url = s3.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': 'my-bucket',
        'Key': 'uploads/user-photo.jpg',
        'ContentType': 'image/jpeg'
    },
    ExpiresIn=3600  # URL valid for 1 hour
)

print(presigned_url)
```

Frontend JavaScript uploading to the presigned URL:

```javascript
async function uploadToS3(presignedUrl, file) {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    console.log('Upload successful');
  } catch (error) {
    console.error('Upload error:', error);
  }
}

// Usage
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  uploadToS3(presignedUrlFromBackend, file);
});
```

The CORS configuration for this setup:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://myapp.com"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

## Debugging CORS Issues

### Check the Actual Headers Being Sent

Open your browser's developer tools, go to the Network tab, and look at the request:

1. Find the request to S3 (it might show as "failed" or "CORS error")
2. Check if there's a preflight OPTIONS request before it
3. Look at the response headers for `Access-Control-Allow-Origin`

### Test CORS with curl

You can simulate a CORS preflight request with curl:

```bash
# Simulate a preflight OPTIONS request
curl -v -X OPTIONS \
  -H "Origin: https://myapp.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://my-bucket.s3.amazonaws.com/test-key

# Check the response headers for:
# Access-Control-Allow-Origin: https://myapp.com
# Access-Control-Allow-Methods: PUT
# Access-Control-Allow-Headers: Content-Type
```

If you don't see the `Access-Control-Allow-Origin` header in the response, your CORS configuration isn't being applied.

### Verify Your Current CORS Configuration

```bash
# Check existing CORS rules
aws s3api get-bucket-cors --bucket my-bucket
```

If you get `NoSuchCORSConfiguration`, there are no CORS rules at all.

## CORS with CloudFront

If you're serving S3 content through CloudFront, the CORS setup is a bit different. CloudFront needs to be configured to forward the `Origin` header to S3 and to cache the CORS response headers.

```bash
# In your CloudFront distribution, make sure to:
# 1. Forward the Origin header to S3
# 2. Include Origin in the cache key (or use a cache policy that does)
```

Without forwarding the Origin header, S3 never sees the CORS request and won't include CORS headers in its response. CloudFront then caches that response without CORS headers, and all subsequent requests fail.

You can use CloudFront's response headers policy to add CORS headers at the CloudFront level instead:

```bash
# Create a response headers policy with CORS config
aws cloudfront create-response-headers-policy --response-headers-policy-config '{
  "Name": "S3-CORS-Policy",
  "CorsConfig": {
    "AccessControlAllowOrigins": {
      "Quantity": 1,
      "Items": ["https://myapp.com"]
    },
    "AccessControlAllowHeaders": {
      "Quantity": 1,
      "Items": ["*"]
    },
    "AccessControlAllowMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"]
    },
    "AccessControlAllowCredentials": false,
    "OriginOverride": true
  }
}'
```

## Full Working CORS Configuration

Here's a comprehensive CORS config that covers most web application needs:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://myapp.com",
        "https://www.myapp.com",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": [
        "ETag",
        "x-amz-request-id",
        "x-amz-id-2",
        "Content-Length"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

Remember to remove `http://localhost:3000` before deploying to production, or keep it in a separate CORS rule that you can manage independently. Monitoring your application for CORS-related errors with a tool like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) helps you catch these issues before your users report them.
