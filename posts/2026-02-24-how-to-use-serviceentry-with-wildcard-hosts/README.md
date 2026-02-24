# How to Use ServiceEntry with Wildcard Hosts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Wildcard, DNS, Kubernetes, Service Mesh

Description: Configure Istio ServiceEntry with wildcard host patterns to handle dynamic subdomains and large-scale external service access efficiently.

---

Sometimes you cannot enumerate every hostname your application needs to reach. Cloud provider APIs use dozens of subdomains. SaaS platforms have customer-specific endpoints. CDN services use geo-distributed hostnames. In these situations, wildcard hosts in ServiceEntry let you cover a whole family of hostnames with a single resource.

Wildcard ServiceEntries are powerful but come with trade-offs. They are less precise than exact-match entries, which means less granular metrics and traffic policies. Understanding how wildcards work in Istio helps you make good decisions about when to use them and when specific entries are better.

## Wildcard Host Syntax

Istio supports wildcard hosts using the `*` prefix. The wildcard matches exactly one level of subdomain:

```yaml
hosts:
  - "*.example.com"     # matches a.example.com, b.example.com
                         # does NOT match a.b.example.com
```

You can only use the wildcard as the leftmost label:

```yaml
# Valid
hosts:
  - "*.example.com"
  - "*.us-east-1.amazonaws.com"

# Invalid - wildcard must be the first label
hosts:
  - "api.*.example.com"    # NOT supported
  - "*.*.example.com"      # NOT supported
```

## Basic Wildcard ServiceEntry

Here is a wildcard ServiceEntry for a cloud provider with many subdomains:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloud-provider-wildcard
spec:
  hosts:
    - "*.cloudprovider.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

The critical detail: when using wildcard hosts, you must set `resolution: NONE`. Envoy cannot perform DNS resolution for a wildcard because it does not know the actual hostname until a request comes in. With `NONE`, Envoy relies on the application's DNS resolution and just passes the connection through.

## AWS Service Wildcards

AWS has many service endpoints under `amazonaws.com`. A wildcard covers them all:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-wildcard
spec:
  hosts:
    - "*.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

This matches `s3.us-east-1.amazonaws.com`, `sqs.us-east-1.amazonaws.com`, `dynamodb.us-east-1.amazonaws.com`, and every other AWS endpoint.

But wait - remember that `*` only matches one subdomain level. So `*.amazonaws.com` matches `s3.amazonaws.com` but does NOT match `s3.us-east-1.amazonaws.com` because that has two levels of subdomain.

To cover regional endpoints, you need:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-regional-wildcard
spec:
  hosts:
    - "*.amazonaws.com"
    - "*.us-east-1.amazonaws.com"
    - "*.us-west-2.amazonaws.com"
    - "*.eu-west-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

Add entries for each AWS region your application uses. For S3 virtual-hosted buckets (like `my-bucket.s3.us-east-1.amazonaws.com`), you need yet another level:

```yaml
hosts:
  - "*.s3.us-east-1.amazonaws.com"
  - "*.s3.us-west-2.amazonaws.com"
```

## Google Cloud API Wildcard

Google Cloud is simpler because most APIs use `*.googleapis.com`:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-apis-wildcard
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
```

This covers `storage.googleapis.com`, `pubsub.googleapis.com`, `bigquery.googleapis.com`, and everything else under googleapis.com.

## Combining Wildcards with Exact Matches

You can have both wildcard and exact-match ServiceEntries. Exact matches take precedence:

```yaml
# Wildcard catches everything
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: amazonaws-wildcard
spec:
  hosts:
    - "*.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
---
# Exact match for S3 with specific traffic policy
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3-specific
spec:
  hosts:
    - "s3.us-east-1.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Traffic to `s3.us-east-1.amazonaws.com` uses the exact-match ServiceEntry (with DNS resolution), while traffic to any other `*.amazonaws.com` host uses the wildcard entry.

This pattern is useful when you want specific traffic policies for certain services but a catch-all for everything else.

## Traffic Policies with Wildcards

You can apply traffic policies to wildcard ServiceEntries, but the policies apply uniformly to all matching hosts:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: wildcard-policy
spec:
  host: "*.googleapis.com"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        maxPendingRequests: 100
```

If you need different policies for different services, use exact-match ServiceEntries for those services instead of relying on the wildcard.

## Limitations of Wildcard ServiceEntries

There are real limitations you should know about:

**No DNS resolution.** Wildcard entries require `resolution: NONE`, which means Envoy does not manage endpoint resolution. The application handles DNS itself.

**Less granular metrics.** With DNS resolution, Istio can show you per-host metrics. With NONE resolution and wildcards, all traffic to `*.example.com` shows up under the same metric label.

**No load balancing control.** Since Envoy does not manage endpoints for wildcard entries, you cannot configure custom load balancing algorithms.

**No subset routing.** You cannot create subsets (via DestinationRule) for wildcard hosts because there are no endpoints to label.

**VirtualService matching is limited.** You can create a VirtualService for a wildcard host, but route matching works differently:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: wildcard-vs
spec:
  hosts:
    - "*.googleapis.com"
  http:
    - timeout: 30s
      route:
        - destination:
            host: "*.googleapis.com"
            port:
              number: 443
```

## When to Use Wildcards vs Exact Matches

Use wildcards when:
- You have too many hostnames to enumerate
- New hostnames appear dynamically (customer subdomains, regional endpoints)
- You just need to allow traffic through without fine-grained control
- You are in the early stages of Istio adoption and want to unblock traffic quickly

Use exact matches when:
- You need specific traffic policies per service
- You want granular per-service metrics
- You need DNS-based load balancing
- You want to restrict access to specific hostnames only

## Hybrid Approach

The best practice for most teams is a hybrid approach. Use wildcards as a catch-all and add exact matches for services that need specific treatment:

```yaml
# Catch-all for any Google API
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-apis-catchall
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
---
# Specific entry for Pub/Sub with custom timeout
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-pubsub
spec:
  hosts:
    - "pubsub.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

This gives you the convenience of a wildcard with the precision of exact matches where it matters. Traffic to `pubsub.googleapis.com` uses the specific entry with DNS resolution, while everything else falls through to the wildcard.

Wildcard ServiceEntries are a practical tool in your Istio toolkit. They trade precision for convenience, and the right balance depends on your specific needs. Start with wildcards to get things working, then add exact matches for services that need more control.
