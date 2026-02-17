# How to Configure Media CDN for Low-Latency Global Video Delivery on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Media CDN, Video Delivery, CDN, Low Latency

Description: Configure Google Cloud Media CDN for low-latency global video delivery with caching optimization, signed URLs, and origin shielding.

---

Media CDN is Google Cloud's purpose-built content delivery network for media workloads. Unlike Cloud CDN which is a general-purpose CDN, Media CDN is optimized specifically for streaming video - it handles large file delivery, partial content requests, and cache fill patterns that are common in video but uncommon in web traffic. It runs on the same infrastructure that serves YouTube, giving you access to Google's massive edge network.

In this guide, I will configure Media CDN for delivering both live and on-demand video with minimal latency worldwide.

## Why Media CDN for Video

Standard CDNs work fine for web content, but video has different requirements:

- **Large files**: Video segments are much bigger than web assets
- **Sequential access**: Viewers request segments in order, creating predictable patterns
- **Partial content**: Range requests are common for seeking
- **Cache efficiency**: Popular content should be cached aggressively at the edge
- **Low latency**: Live streams need sub-second CDN latency

Media CDN addresses all of these with a cache hierarchy designed for media workloads and edge nodes optimized for throughput.

## Prerequisites

- GCP project with Media CDN API enabled
- Video content served from Cloud Storage, Live Stream API, or an external origin
- A domain name with DNS management access

```bash
# Enable Media CDN API
gcloud services enable networkservices.googleapis.com

# Install gcloud beta components for Media CDN commands
gcloud components install beta
```

## Step 1: Create an Edge Cache Origin

The origin is where Media CDN fetches content when it is not cached at the edge:

```bash
# Create an origin pointing to a Cloud Storage bucket
gcloud beta network-services edge-cache-origins create video-origin \
  --origin-address="storage.googleapis.com" \
  --description="Cloud Storage origin for video content" \
  --protocol=HTTPS \
  --port=443
```

For more control, create the origin with a configuration file:

```yaml
# origin-config.yaml - Media CDN origin configuration

name: video-origin
originAddress: storage.googleapis.com
protocol: HTTPS
port: 443

# Retry configuration for origin fetch failures
retryConditions:
  - CONNECT_FAILURE
  - HTTP_5XX
  - NOT_FOUND
maxAttempts: 3

# Origin shield reduces load on your origin by caching at a mid-tier
# This significantly reduces origin requests for popular content
originOverrideAction:
  urlRewrite:
    hostRewrite: "your-video-bucket.storage.googleapis.com"

# Timeout settings
timeout:
  connectTimeout: 5s
  maxAttemptsTimeout: 30s
  responseTimeout: 60s
  readTimeout: 30s
```

```bash
# Create the origin from the config file
gcloud beta network-services edge-cache-origins import video-origin \
  --source=origin-config.yaml
```

## Step 2: Create an Edge Cache Service

The service defines routing rules, caching behavior, and security settings:

```yaml
# service-config.yaml - Media CDN service configuration

name: video-cdn-service
description: "Video delivery CDN service"

routing:
  hostRules:
    - hosts:
        - "cdn.yourdomain.com"
      pathMatcher: video-routes

  pathMatchers:
    - name: video-routes
      routeRules:
        # Route for HLS manifests - short cache, frequent updates
        - priority: 1
          matchRules:
            - pathTemplateMatch: "/**/*.m3u8"
          headerAction:
            responseHeadersToAdd:
              - headerName: "Access-Control-Allow-Origin"
                headerValue: "*"
          routeAction:
            cdnPolicy:
              cacheMode: FORCE_CACHE_ALL
              defaultTtl: 2s  # Short TTL for live manifests
              maxTtl: 10s
              cacheKeyPolicy:
                includeProtocol: false
                excludeHost: true
            urlRewrite:
              hostRewrite: "your-video-bucket.storage.googleapis.com"
          origin: video-origin

        # Route for DASH manifests
        - priority: 2
          matchRules:
            - pathTemplateMatch: "/**/*.mpd"
          routeAction:
            cdnPolicy:
              cacheMode: FORCE_CACHE_ALL
              defaultTtl: 2s
              maxTtl: 10s
            urlRewrite:
              hostRewrite: "your-video-bucket.storage.googleapis.com"
          origin: video-origin

        # Route for video segments - long cache since segments are immutable
        - priority: 3
          matchRules:
            - pathTemplateMatch: "/**/*.ts"
            - pathTemplateMatch: "/**/*.m4s"
            - pathTemplateMatch: "/**/*.mp4"
          routeAction:
            cdnPolicy:
              cacheMode: FORCE_CACHE_ALL
              defaultTtl: 86400s  # 24 hours for immutable segments
              maxTtl: 604800s     # 7 days max
              cacheKeyPolicy:
                includeProtocol: false
                excludeHost: true
            urlRewrite:
              hostRewrite: "your-video-bucket.storage.googleapis.com"
          origin: video-origin

        # Default route for everything else
        - priority: 10
          matchRules:
            - prefixMatch: "/"
          routeAction:
            cdnPolicy:
              cacheMode: CACHE_ALL_STATIC
              defaultTtl: 3600s
            urlRewrite:
              hostRewrite: "your-video-bucket.storage.googleapis.com"
          origin: video-origin

# Enable logging for debugging and analytics
logConfig:
  enable: true
  sampleRate: 1.0
```

```bash
# Create the service from the config
gcloud beta network-services edge-cache-services import video-cdn-service \
  --source=service-config.yaml
```

## Step 3: Configure Signed URLs

Protect your content from unauthorized access using signed URLs:

```bash
# Generate a signing key pair
openssl rand -base64 64 > media-cdn-key.secret

# Create a keyset in Media CDN
gcloud beta network-services edge-cache-keysets create video-keyset \
  --public-key='id=key-1,value=YOUR_BASE64_PUBLIC_KEY'
```

Add signing requirements to your service configuration:

```yaml
# Add to route rules that need protection
routeAction:
  cdnPolicy:
    signedRequestMode: REQUIRE_SIGNATURES
    signedRequestKeyset: video-keyset
    signedRequestMaximumExpirationTtl: 86400s
```

Generate signed URLs in your application:

```python
# sign_urls.py - Generates signed URLs for Media CDN

import base64
import datetime
import hashlib
import hmac
from urllib.parse import urlencode

def sign_url(url, key_name, key_value, expiration_time):
    """Signs a URL for Media CDN using Ed25519 signatures.

    Args:
        url: The URL to sign
        key_name: The key name configured in the keyset
        key_value: Base64-encoded key value
        expiration_time: When the signed URL expires (datetime)
    """

    # Calculate expiration as Unix timestamp
    epoch = datetime.datetime(1970, 1, 1)
    expiration = int((expiration_time - epoch).total_seconds())

    # Add expiration to the URL
    separator = "&" if "?" in url else "?"
    url_to_sign = f"{url}{separator}Expires={expiration}&KeyName={key_name}"

    # Sign the URL
    decoded_key = base64.urlsafe_b64decode(key_value)
    digest = hmac.new(decoded_key, url_to_sign.encode("utf-8"), hashlib.sha1).digest()
    signature = base64.urlsafe_b64encode(digest).decode("utf-8")

    return f"{url_to_sign}&Signature={signature}"

# Generate a signed URL valid for 1 hour
signed = sign_url(
    url="https://cdn.yourdomain.com/videos/movie-001/manifest.m3u8",
    key_name="key-1",
    key_value="YOUR_BASE64_KEY",
    expiration_time=datetime.datetime.utcnow() + datetime.timedelta(hours=1),
)
print(f"Signed URL: {signed}")
```

## Step 4: Set Up DNS

Point your CDN domain to the Media CDN service:

```bash
# Get the IP addresses for your Media CDN service
gcloud beta network-services edge-cache-services describe video-cdn-service \
  --format='value(ipv4Addresses)'

# Create DNS records pointing to these IPs
# A record: cdn.yourdomain.com -> <IP addresses>
```

## Step 5: Configure CORS for Web Players

Web-based video players need CORS headers. Add them to your routing configuration:

```yaml
# CORS headers for web video players
headerAction:
  responseHeadersToAdd:
    - headerName: "Access-Control-Allow-Origin"
      headerValue: "*"
    - headerName: "Access-Control-Allow-Methods"
      headerValue: "GET, HEAD, OPTIONS"
    - headerName: "Access-Control-Expose-Headers"
      headerValue: "Content-Length, Content-Range"
    - headerName: "Access-Control-Max-Age"
      headerValue: "86400"
```

## Step 6: Monitor CDN Performance

```bash
# View CDN metrics
gcloud beta network-services edge-cache-services describe video-cdn-service \
  --format=json

# Check cache hit rates in Cloud Monitoring
# Navigate to Cloud Monitoring > Metrics Explorer
# Metric: networkservices.googleapis.com/edge_cache/request_count
# Group by: cache_result
```

Key metrics to monitor:

- **Cache hit rate**: Should be above 90% for VOD, 70%+ for live
- **Origin bytes**: Lower is better - means the cache is working
- **Latency (TTFB)**: Time to first byte at the edge
- **Error rate**: 4xx and 5xx responses from the CDN

## Performance Optimization Tips

1. **Segment size**: Use 4-6 second segments. Shorter segments mean more requests but lower latency; longer segments improve cache efficiency.
2. **Cache key simplification**: Remove unnecessary query parameters from cache keys to improve hit rates.
3. **Origin shielding**: Enable origin shielding to reduce load on your Cloud Storage bucket during cache misses.
4. **Prefetching**: For live streams, the CDN can prefetch the next segment before the player requests it.
5. **Compression**: Enable gzip/brotli for manifests but not for video segments (they are already compressed).

## Wrapping Up

Media CDN gives you YouTube-level delivery infrastructure for your own video content. The key to good performance is getting the caching strategy right - short TTLs for manifests that change frequently, long TTLs for immutable video segments, and signed URLs for access control. Combined with the Live Stream API and Transcoder API, Media CDN completes the Google Cloud video streaming stack from ingest to viewer.
