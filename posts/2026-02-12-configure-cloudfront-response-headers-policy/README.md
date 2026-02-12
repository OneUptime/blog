# How to Configure CloudFront Response Headers Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, Security Headers, CORS, CSP, HTTP Headers

Description: Learn how to configure CloudFront response headers policies to add security headers, CORS headers, and custom headers to all responses without modifying your origin.

---

Security headers protect your users from cross-site scripting, clickjacking, and other browser-based attacks. CORS headers enable legitimate cross-origin requests. Traditionally, you configure these on your web server. With CloudFront response headers policies, you configure them once at the CDN level and they apply to every response, regardless of what your origin returns.

## Why Configure Headers at CloudFront?

Configuring response headers at the CloudFront level has several advantages:

- **Consistency**: Every response gets the same headers, even if you have multiple origins
- **No origin changes needed**: Your application code and server config stay untouched
- **Centralized management**: One place to update headers for all your distributions
- **Override capability**: CloudFront can add, replace, or remove headers from origin responses

## Using Managed Policies

AWS provides several pre-built response headers policies. Start here before creating custom ones.

```bash
# List available managed policies
aws cloudfront list-response-headers-policies \
    --type managed \
    --query 'ResponseHeadersPolicyList.Items[].{Id:ResponseHeadersPolicy.Id,Name:ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name}' \
    --output table
```

Common managed policies:
- **SecurityHeadersPolicy**: Adds standard security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **CORS-with-preflight**: Configures CORS for common use cases
- **SimpleCORS**: Basic CORS with Access-Control-Allow-Origin: *

```bash
# Attach a managed security headers policy to a cache behavior
# First, get the managed policy ID for SecurityHeadersPolicy
POLICY_ID=$(aws cloudfront list-response-headers-policies \
    --type managed \
    --query 'ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name==`SecurityHeadersPolicy`].ResponseHeadersPolicy.Id' \
    --output text)

echo "Security Headers Policy ID: $POLICY_ID"
```

## Creating a Custom Response Headers Policy

For most production deployments, you will want a custom policy tailored to your needs.

### Full Security Headers Configuration

```bash
# Create a comprehensive security headers policy
aws cloudfront create-response-headers-policy \
    --response-headers-policy-config '{
        "Name": "custom-security-headers",
        "Comment": "Production security headers for web application",
        "SecurityHeadersConfig": {
            "XSSProtection": {
                "Override": true,
                "Protection": true,
                "ModeBlock": true
            },
            "FrameOptions": {
                "Override": true,
                "FrameOption": "DENY"
            },
            "ReferrerPolicy": {
                "Override": true,
                "ReferrerPolicy": "strict-origin-when-cross-origin"
            },
            "ContentSecurityPolicy": {
                "Override": true,
                "ContentSecurityPolicy": "default-src '\''self'\''; script-src '\''self'\'' cdn.example.com; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: *.cloudfront.net; font-src '\''self'\'' fonts.googleapis.com fonts.gstatic.com; connect-src '\''self'\'' api.example.com; frame-ancestors '\''none'\''"
            },
            "ContentTypeOptions": {
                "Override": true
            },
            "StrictTransportSecurity": {
                "Override": true,
                "IncludeSubdomains": true,
                "Preload": true,
                "AccessControlMaxAgeSec": 31536000
            }
        },
        "CustomHeadersConfig": {
            "Quantity": 2,
            "Items": [
                {
                    "Header": "Permissions-Policy",
                    "Value": "camera=(), microphone=(), geolocation=(self)",
                    "Override": true
                },
                {
                    "Header": "X-Permitted-Cross-Domain-Policies",
                    "Value": "none",
                    "Override": true
                }
            ]
        }
    }'
```

Let me break down what each header does:

| Header | Value | Purpose |
|--------|-------|---------|
| X-XSS-Protection | 1; mode=block | Legacy XSS filter (for older browsers) |
| X-Frame-Options | DENY | Prevents clickjacking by blocking iframes |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer information sent to other sites |
| Content-Security-Policy | (custom) | Defines allowed content sources |
| X-Content-Type-Options | nosniff | Prevents MIME type sniffing |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Forces HTTPS for 1 year |
| Permissions-Policy | camera=(), microphone=() | Restricts browser feature access |

### CORS Configuration

```bash
# Create a CORS policy for an API that needs cross-origin access
aws cloudfront create-response-headers-policy \
    --response-headers-policy-config '{
        "Name": "api-cors-policy",
        "Comment": "CORS headers for API endpoints",
        "CorsConfig": {
            "AccessControlAllowOrigins": {
                "Quantity": 3,
                "Items": [
                    "https://app.example.com",
                    "https://staging.example.com",
                    "http://localhost:3000"
                ]
            },
            "AccessControlAllowHeaders": {
                "Quantity": 4,
                "Items": [
                    "Authorization",
                    "Content-Type",
                    "X-Requested-With",
                    "X-Api-Key"
                ]
            },
            "AccessControlAllowMethods": {
                "Quantity": 4,
                "Items": ["GET", "POST", "PUT", "DELETE"]
            },
            "AccessControlAllowCredentials": true,
            "AccessControlExposeHeaders": {
                "Quantity": 2,
                "Items": ["X-Request-Id", "X-RateLimit-Remaining"]
            },
            "AccessControlMaxAgeSec": 86400,
            "OriginOverride": true
        }
    }'
```

### Combined Security + CORS Policy

Most real-world applications need both security headers and CORS. You can combine them in a single policy:

```bash
aws cloudfront create-response-headers-policy \
    --response-headers-policy-config '{
        "Name": "production-full-headers",
        "Comment": "Security headers + CORS for production",
        "SecurityHeadersConfig": {
            "XSSProtection": {
                "Override": true,
                "Protection": true,
                "ModeBlock": true
            },
            "FrameOptions": {
                "Override": true,
                "FrameOption": "SAMEORIGIN"
            },
            "ContentTypeOptions": {
                "Override": true
            },
            "StrictTransportSecurity": {
                "Override": true,
                "IncludeSubdomains": true,
                "AccessControlMaxAgeSec": 31536000
            },
            "ReferrerPolicy": {
                "Override": true,
                "ReferrerPolicy": "strict-origin-when-cross-origin"
            }
        },
        "CorsConfig": {
            "AccessControlAllowOrigins": {
                "Quantity": 1,
                "Items": ["https://app.example.com"]
            },
            "AccessControlAllowHeaders": {
                "Quantity": 2,
                "Items": ["Authorization", "Content-Type"]
            },
            "AccessControlAllowMethods": {
                "Quantity": 2,
                "Items": ["GET", "POST"]
            },
            "AccessControlAllowCredentials": false,
            "AccessControlMaxAgeSec": 3600,
            "OriginOverride": true
        },
        "CustomHeadersConfig": {
            "Quantity": 1,
            "Items": [
                {
                    "Header": "X-Robots-Tag",
                    "Value": "noindex, nofollow",
                    "Override": false
                }
            ]
        }
    }'
```

## Attaching Policies to Cache Behaviors

```bash
# Get current distribution config
DIST_CONFIG=$(aws cloudfront get-distribution-config --id E1234567890ABC)
ETAG=$(echo "$DIST_CONFIG" | jq -r '.ETag')

# Update the default cache behavior to use the response headers policy
# In the distribution config JSON, add ResponseHeadersPolicyId to the cache behavior

# Example: update default cache behavior
aws cloudfront update-distribution \
    --id E1234567890ABC \
    --if-match "$ETAG" \
    --distribution-config file://updated-config.json
```

The relevant part of the distribution config:

```json
{
    "DefaultCacheBehavior": {
        "TargetOriginId": "my-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "ResponseHeadersPolicyId": "your-policy-id-here",
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
    }
}
```

You can use different response headers policies for different cache behaviors. For example:

- Default behavior: Security headers only
- `/api/*` behavior: Security headers + CORS
- `/public/*` behavior: Relaxed headers for public assets

## Using Terraform

```hcl
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "security-headers"
  comment = "Standard security headers"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      override     = true
      frame_option = "DENY"
    }

    referrer_policy {
      override        = true
      referrer_policy = "strict-origin-when-cross-origin"
    }

    strict_transport_security {
      override                   = true
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
    }

    xss_protection {
      override   = true
      protection = true
      mode_block = true
    }

    content_security_policy {
      override                = true
      content_security_policy = "default-src 'self'; script-src 'self'"
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=()"
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "app" {
  # ... other config ...

  default_cache_behavior {
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    # ... other settings ...
  }
}
```

## Testing Your Headers

After deploying, verify the headers are present:

```bash
# Check response headers
curl -I https://your-distribution.cloudfront.net/

# Look for these headers in the response:
# x-frame-options: DENY
# x-content-type-options: nosniff
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# referrer-policy: strict-origin-when-cross-origin
# content-security-policy: default-src 'self'; ...
```

You can also use online tools like securityheaders.com to grade your configuration.

## The Override Flag

The `Override` flag in each header configuration controls what happens when your origin already sends the same header:

- `Override: true` - CloudFront replaces the origin's header with its value
- `Override: false` - CloudFront only adds the header if the origin did not include it

For security headers, almost always use `Override: true` to ensure consistent policy enforcement regardless of what the origin returns.

## Removing Headers

You can also use response headers policies to remove headers that your origin sends but should not be exposed:

```bash
# Remove server information headers that expose implementation details
aws cloudfront create-response-headers-policy \
    --response-headers-policy-config '{
        "Name": "remove-server-headers",
        "Comment": "Remove headers that expose server details",
        "RemoveHeadersConfig": {
            "Quantity": 3,
            "Items": [
                {"Header": "Server"},
                {"Header": "X-Powered-By"},
                {"Header": "X-AspNet-Version"}
            ]
        }
    }'
```

For additional CloudFront security features, see our guide on [setting up CloudFront field-level encryption](https://oneuptime.com/blog/post/set-up-cloudfront-field-level-encryption/view).

## Conclusion

CloudFront response headers policies give you a centralized, infrastructure-level way to enforce security headers and CORS configuration across all your web applications. Start with the managed SecurityHeadersPolicy for quick wins, then create custom policies tailored to your applications. The key is to set Override to true for security headers so they are enforced consistently, and to test thoroughly after deployment to make sure nothing breaks.
