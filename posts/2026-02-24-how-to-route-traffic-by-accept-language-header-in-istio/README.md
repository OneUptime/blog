# How to Route Traffic by Accept-Language Header in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Localization, Headers, Kubernetes

Description: Route traffic to language-specific service backends using the Accept-Language HTTP header in Istio VirtualService configurations.

---

If you run a service that supports multiple languages, you might have different backends optimized for different locales. Maybe your French content is served from a deployment in a European region, or your Japanese backend has specific character encoding optimizations. Instead of handling language routing in your application code or at a CDN level, you can do it directly in Istio by matching the Accept-Language header.

## How Accept-Language Works

Browsers and API clients send the `Accept-Language` header to indicate which languages the user prefers. A typical header looks like:

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

This says the client prefers French (France), then French generally, then English (US), then English generally. The `q` values indicate preference weights.

For routing purposes, you typically match on the primary language preference, which is the first value in the header. Istio's header matching gives you `exact`, `prefix`, and `regex` options, which cover most use cases.

## Prerequisites

- Kubernetes cluster with Istio installed
- Multiple service deployments labeled by language/region
- Sidecar injection enabled

## Setting Up the DestinationRule

Create subsets for each language-specific deployment:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: content-service-dr
  namespace: default
spec:
  host: content-service
  subsets:
    - name: english
      labels:
        lang: en
    - name: french
      labels:
        lang: fr
    - name: spanish
      labels:
        lang: es
    - name: default
      labels:
        lang: en
```

```bash
kubectl apply -f destination-rule.yaml
```

## Basic Language Routing

Here is a VirtualService that routes based on the Accept-Language header:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: content-service-vs
  namespace: default
spec:
  hosts:
    - content-service
  http:
    - match:
        - headers:
            accept-language:
              prefix: "fr"
      route:
        - destination:
            host: content-service
            subset: french
    - match:
        - headers:
            accept-language:
              prefix: "es"
      route:
        - destination:
            host: content-service
            subset: spanish
    - route:
        - destination:
            host: content-service
            subset: english
```

This checks if the Accept-Language header starts with "fr" (matching "fr", "fr-FR", "fr-CA", etc.) and routes to the French backend. Similarly for Spanish. Everything else falls through to the English backend.

```bash
kubectl apply -f virtual-service.yaml
```

## Handling Multiple Language Preferences

The Accept-Language header often contains multiple languages. The prefix match on the first value works for most cases since browsers put the preferred language first. But if you need more nuanced matching, you can use regex:

```yaml
- match:
    - headers:
        accept-language:
          regex: ".*fr.*"
  route:
    - destination:
        host: content-service
        subset: french
```

This matches any request where French appears anywhere in the Accept-Language header. Be careful with this approach though, as it is less precise. A header like `en-US,en;q=0.9,fr;q=0.1` would match even though the user barely wants French content.

A better approach for handling quality values is to match only when French is the primary language:

```yaml
- match:
    - headers:
        accept-language:
          regex: "^fr.*"
  route:
    - destination:
        host: content-service
        subset: french
```

The `^` anchor ensures French is at the start of the header value.

## Regional Variants

You might want to distinguish between regional variants of a language. Canadian French vs. European French, or Latin American Spanish vs. European Spanish:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: content-service-vs
  namespace: default
spec:
  hosts:
    - content-service
  http:
    - match:
        - headers:
            accept-language:
              prefix: "fr-CA"
      route:
        - destination:
            host: content-service
            subset: french-canada
    - match:
        - headers:
            accept-language:
              prefix: "fr"
      route:
        - destination:
            host: content-service
            subset: french-europe
    - match:
        - headers:
            accept-language:
              prefix: "es-MX"
      route:
        - destination:
            host: content-service
            subset: spanish-latam
    - match:
        - headers:
            accept-language:
              prefix: "es"
      route:
        - destination:
            host: content-service
            subset: spanish-europe
    - route:
        - destination:
            host: content-service
            subset: english
```

Put more specific matches (like `fr-CA`) before more general ones (like `fr`). Istio evaluates rules top to bottom and uses the first match.

## Combining with Geographic Routing

For a more complete localization strategy, combine Accept-Language routing with source labels or other headers. If your Istio mesh spans multiple clusters or regions, you can use locality-aware routing alongside language routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: content-service-vs
  namespace: default
spec:
  hosts:
    - content-service
  http:
    - match:
        - headers:
            accept-language:
              prefix: "fr"
            x-region:
              exact: "eu-west"
      route:
        - destination:
            host: content-service
            subset: french-europe
    - match:
        - headers:
            accept-language:
              prefix: "fr"
      route:
        - destination:
            host: content-service
            subset: french-default
    - route:
        - destination:
            host: content-service
            subset: english
```

## Testing the Configuration

Test with curl by setting the Accept-Language header:

```bash
# Test French routing
kubectl exec deploy/sleep -c sleep -- curl -s -H "Accept-Language: fr-FR,fr;q=0.9" http://content-service.default.svc.cluster.local/

# Test Spanish routing
kubectl exec deploy/sleep -c sleep -- curl -s -H "Accept-Language: es-ES,es;q=0.9" http://content-service.default.svc.cluster.local/

# Test English fallback
kubectl exec deploy/sleep -c sleep -- curl -s -H "Accept-Language: en-US,en;q=0.9" http://content-service.default.svc.cluster.local/

# Test with no Accept-Language header
kubectl exec deploy/sleep -c sleep -- curl -s http://content-service.default.svc.cluster.local/
```

Verify by checking the istio-proxy logs on each deployment:

```bash
kubectl logs deploy/content-service-fr -c istio-proxy --tail=5
kubectl logs deploy/content-service-es -c istio-proxy --tail=5
kubectl logs deploy/content-service-en -c istio-proxy --tail=5
```

## Practical Considerations

**Default language.** Always have a catch-all route that handles requests without an Accept-Language header or with unsupported languages. English is a common default, but pick whatever makes sense for your user base.

**Header normalization.** The Accept-Language header value is not normalized by Istio. Different clients may format it differently. Some send `fr-FR`, others send `fr_FR`, and some just send `fr`. Your matching rules need to account for these variations.

**Not a replacement for i18n.** This approach works best when you have fundamentally different backends for different languages, like different content databases or different rendering pipelines. If you just need to translate UI strings, handle that in your application with a standard i18n library.

**CDN interaction.** If you have a CDN in front of your Istio ingress, make sure the CDN is passing through the Accept-Language header and not stripping it. Some CDN configurations normalize or remove certain headers.

**Caching implications.** If you are caching responses, make sure your cache key includes the Accept-Language header. Otherwise, a French user might get a cached English response or vice versa.

## Validation

Check your configuration for issues:

```bash
istioctl analyze -n default
```

And inspect the routes on a specific proxy:

```bash
istioctl proxy-config routes deploy/content-service-en -n default
```

## Summary

Routing by Accept-Language in Istio gives you infrastructure-level language routing without modifying application code. It works well for services with language-specific backends, regional content delivery, and localization testing. Keep your match rules ordered from most specific to least specific, always include a fallback route, and remember that this complements rather than replaces application-level internationalization.
