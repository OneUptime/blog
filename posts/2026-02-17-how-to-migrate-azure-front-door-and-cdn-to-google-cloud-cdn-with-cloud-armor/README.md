# How to Migrate Azure Front Door and CDN to Google Cloud CDN with Cloud Armor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Cloud Armor, Azure Migration, CDN, Content Delivery

Description: A practical guide to migrating your Azure Front Door and CDN workloads to Google Cloud CDN with Cloud Armor for content delivery and security.

---

If you have been running Azure Front Door or Azure CDN for content delivery and DDoS protection, and you are planning a move to Google Cloud, this guide walks you through the migration path. Google Cloud CDN paired with Cloud Armor gives you a similar set of capabilities - global content caching, edge delivery, and web application firewall protection - but the architecture and configuration differ in meaningful ways.

## Understanding the Service Mapping

Before diving into migration steps, let's map the Azure services to their Google Cloud equivalents.

Azure Front Door combines CDN, load balancing, SSL termination, and WAF into one integrated service. On Google Cloud, these capabilities are split across a few services that work together:

- **Azure CDN / Front Door CDN** maps to **Google Cloud CDN** (content caching at Google's edge)
- **Azure Front Door routing** maps to **Google Cloud External HTTP(S) Load Balancer** (global load balancing with URL maps)
- **Azure WAF on Front Door** maps to **Cloud Armor** (DDoS protection and WAF rules)
- **Azure Front Door Rules Engine** maps to **URL Maps and Cloud Armor custom rules**

This separation might seem like more work initially, but it gives you finer-grained control over each layer.

## Prerequisites

You will need a few things in place before starting:

- A GCP project with billing enabled
- The `gcloud` CLI installed and authenticated
- Your origin servers accessible from GCP (either migrated or reachable via the internet)
- SSL certificates for your domains (you can use Google-managed certificates)

## Step 1: Set Up Your Backend Services

In Azure Front Door, you define backend pools. In GCP, the equivalent is backend services attached to the load balancer. Here is how to create a backend service that points to an instance group or a Cloud Run service.

The following commands create a health check and a backend service for a typical web application origin:

```bash
# Create a health check that the load balancer uses to verify backend health
gcloud compute health-checks create http my-health-check \
    --port=80 \
    --request-path="/" \
    --check-interval=10s \
    --timeout=5s

# Create a backend service with CDN enabled
gcloud compute backend-services create my-backend-service \
    --protocol=HTTP \
    --port-name=http \
    --health-checks=my-health-check \
    --enable-cdn \
    --global

# Add your instance group as a backend
gcloud compute backend-services add-backend my-backend-service \
    --instance-group=my-instance-group \
    --instance-group-zone=us-central1-a \
    --global
```

The `--enable-cdn` flag is what turns on Cloud CDN for this backend. Every response that passes through the load balancer will be evaluated for caching based on cache headers.

## Step 2: Configure Cloud CDN Cache Settings

Azure CDN has caching rules that you configure per endpoint. Cloud CDN uses cache modes that you set on the backend service. The three main modes are:

- **CACHE_ALL_STATIC** - caches standard static content types automatically
- **USE_ORIGIN_HEADERS** - respects Cache-Control headers from your origin
- **FORCE_CACHE_ALL** - caches everything regardless of headers (use carefully)

Here is how to update your backend service with specific cache settings:

```bash
# Set the cache mode to respect origin headers, similar to Azure CDN behavior
gcloud compute backend-services update my-backend-service \
    --cache-mode=USE_ORIGIN_HEADERS \
    --default-ttl=3600 \
    --max-ttl=86400 \
    --client-ttl=3600 \
    --global
```

If you were using Azure CDN's query string caching, Cloud CDN supports similar functionality through cache key policies:

```bash
# Include query strings in cache keys, matching Azure CDN behavior
gcloud compute backend-services update my-backend-service \
    --cache-key-include-query-string \
    --global
```

## Step 3: Set Up the External Load Balancer

Azure Front Door handles routing and SSL termination built-in. On GCP, you need an External HTTP(S) Load Balancer to sit in front of your backend services.

```bash
# Reserve a global static IP address
gcloud compute addresses create my-lb-ip --global

# Create a URL map for routing
gcloud compute url-maps create my-url-map \
    --default-service=my-backend-service

# Create a Google-managed SSL certificate
gcloud compute ssl-certificates create my-ssl-cert \
    --domains=cdn.example.com \
    --global

# Create the HTTPS target proxy
gcloud compute target-https-proxies create my-https-proxy \
    --url-map=my-url-map \
    --ssl-certificates=my-ssl-cert

# Create the forwarding rule that ties everything together
gcloud compute forwarding-rules create my-https-forwarding-rule \
    --global \
    --target-https-proxy=my-https-proxy \
    --address=my-lb-ip \
    --ports=443
```

## Step 4: Add Cloud Armor for WAF and DDoS Protection

Azure Front Door includes WAF capabilities with managed rule sets. Cloud Armor provides the same on GCP, with both preconfigured WAF rules and custom rules.

```bash
# Create a Cloud Armor security policy
gcloud compute security-policies create my-security-policy \
    --description="WAF policy replacing Azure Front Door WAF"

# Add OWASP ModSecurity Core Rule Set rules for common attack protection
gcloud compute security-policies rules create 1000 \
    --security-policy=my-security-policy \
    --expression="evaluatePreconfiguredExpr('sqli-v33-stable')" \
    --action=deny-403 \
    --description="Block SQL injection attacks"

gcloud compute security-policies rules create 1001 \
    --security-policy=my-security-policy \
    --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
    --action=deny-403 \
    --description="Block cross-site scripting attacks"

# Add rate limiting similar to Azure Front Door rate limiting
gcloud compute security-policies rules create 2000 \
    --security-policy=my-security-policy \
    --expression="true" \
    --action=rate-based-ban \
    --rate-limit-threshold-count=1000 \
    --rate-limit-threshold-interval-sec=60 \
    --ban-duration-sec=300 \
    --description="Rate limit to 1000 requests per minute"

# Attach the security policy to your backend service
gcloud compute backend-services update my-backend-service \
    --security-policy=my-security-policy \
    --global
```

## Step 5: Migrate Routing Rules

If you had complex routing in Azure Front Door - like routing different URL paths to different backends - you replicate this with URL maps in GCP.

```bash
# Create additional backend services for different origins
gcloud compute backend-services create api-backend-service \
    --protocol=HTTP \
    --health-checks=my-health-check \
    --enable-cdn \
    --global

# Update the URL map with path-based routing
gcloud compute url-maps add-path-matcher my-url-map \
    --path-matcher-name=my-path-matcher \
    --default-service=my-backend-service \
    --path-rules="/api/*=api-backend-service"
```

## Step 6: DNS Cutover

Once everything is configured and tested, update your DNS to point to the new GCP load balancer IP:

```bash
# Get the IP address of your load balancer
gcloud compute addresses describe my-lb-ip --global --format="get(address)"
```

Update your DNS A record to point to this IP. If you are using Cloud DNS, you can do this directly:

```bash
# Update DNS record in Cloud DNS
gcloud dns record-sets update cdn.example.com \
    --zone=my-dns-zone \
    --type=A \
    --ttl=300 \
    --rrdatas="YOUR_LB_IP"
```

## Key Differences to Watch For

A few things catch people during migration:

1. **Cache invalidation** - Azure CDN lets you purge by URL pattern. Cloud CDN invalidation uses URL prefixes or exact paths via `gcloud compute url-maps invalidate-cdn-cache`.

2. **Custom domains** - Azure Front Door handles custom domains directly. On GCP, custom domains are managed through the SSL certificate and DNS configuration on the load balancer.

3. **Geo-filtering** - Azure CDN has built-in geo-filtering. Cloud Armor provides geo-based rules using the `origin.region_code` attribute in security policy expressions.

4. **Compression** - Azure CDN compresses content automatically. Cloud CDN serves compressed content if your origin provides it with proper Content-Encoding headers, but does not compress on the fly at the edge.

## Monitoring the Migration

After cutover, keep an eye on Cloud CDN cache hit ratios and Cloud Armor logs:

```bash
# Check CDN cache hit ratio in Cloud Monitoring
gcloud logging read 'resource.type="http_load_balancer"' \
    --limit=100 \
    --format="table(httpRequest.status, jsonPayload.cacheHit)"
```

Make sure your cache hit rates match or exceed what you had on Azure CDN. If they are lower, review your cache headers and cache mode settings.

## Wrapping Up

Migrating from Azure Front Door to Google Cloud CDN with Cloud Armor is straightforward once you understand the component mapping. The biggest shift is moving from a single integrated service to a composition of load balancer, CDN, and security policy. The upside is more granular control over each piece. Take your time testing with a subset of traffic before doing a full DNS cutover, and you will have a smooth migration.
